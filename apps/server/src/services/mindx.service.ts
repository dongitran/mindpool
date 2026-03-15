import type { RouterConfig, ChatMessage } from '@mindpool/shared';
import { LLMRouter } from '../llm/router';
import { KimiProvider, MinimaxProvider } from '../llm/providers';
import { parseSSEStream } from '../llm/stream-parser';
import { QueueManager } from '../queue/QueueManager';
import { StopSignalDetector } from '../queue/StopSignalDetector';
import { config } from '../config';
import { Pool, Agent, Message } from '../models';
import { poolService } from '../di';
import { logger } from '../lib/logger';
import { redis, POOL_LOCK_TTL_SEC, MEETING_QUEUE_KEY } from '../lib/redis';
import { broadcastService } from './broadcast.service';
import { logMeetingInfo, logMeetingWarn, logMeetingError } from '../lib/meetingLogger';
import {
  generateRelevanceCheckMessages,
  generateWrapUpMessages,
  generateAgentResponseMessages,
} from '../utils/prompt.utils';

// Initialize LLM router from env config
const routerConfig: RouterConfig = {
  full_response: config.llmRouting.fullResponse,
  relevance_check: config.llmRouting.relevanceCheck,
  recap_synthesis: config.llmRouting.recapSynthesis,
};
const llmRouter = new LLMRouter(routerConfig);

if (config.kimiApiKey) {
  llmRouter.registerProvider(new KimiProvider(config.kimiApiKey));
}
if (config.minimaxApiKey) {
  llmRouter.registerProvider(new MinimaxProvider(config.minimaxApiKey));
}

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  const timeout = new Promise<never>((_, reject) =>
    setTimeout(() => reject(new Error(`[MindX] Timeout after ${ms}ms: ${label}`)), ms)
  );
  return Promise.race([promise, timeout]);
}

function getQueueManager(poolId: string): QueueManager {
  return new QueueManager(poolId);
}

function getStopDetector(poolId: string): StopSignalDetector {
  return new StopSignalDetector(poolId);
}

export async function analyzeTopicAndSuggestAgents(topic: string) {
  const allAgents = await Agent.find();
  // MindX is the orchestrator — always included by default, never shown for selection
  const selectableAgents = allAgents.filter((a) => a.name !== 'MindX');

  const suggestions = selectableAgents.map((agent) => {
    const topicLower = topic.toLowerCase();
    const specialtyLower = agent.specialty.toLowerCase();
    const relevance =
      topicLower.includes(specialtyLower) ||
        specialtyLower.split(' ').some((word) => topicLower.includes(word))
        ? 0.8
        : 0.3;

    return {
      agentId: agent._id.toString(),
      icon: agent.icon,
      name: agent.name,
      desc: agent.specialty,
      relevance,
      checked: relevance > 0.5,
    };
  });

  return suggestions.sort((a, b) => b.relevance - a.relevance);
}

export async function selectOpeningAgent(
  topic: string,
  agents: { agentId: string; name: string; specialty: string }[]
) {
  let bestAgent = agents[0];
  let bestScore = 0;

  for (const agent of agents) {
    const words = agent.specialty.toLowerCase().split(/\s+/);
    const topicLower = topic.toLowerCase();
    const score = words.filter((w) => topicLower.includes(w)).length;
    if (score > bestScore) {
      bestScore = score;
      bestAgent = agent;
    }
  }

  return bestAgent ?? agents[0];
}

export async function generateAnnouncement(poolId: string): Promise<string> {
  const pool = await Pool.findById(poolId);
  if (!pool) throw new Error('Pool not found');

  const agentNames = pool.agents.map((a) => a.name).join(', ');
  const announcement = `🎙 MindX đã tập hợp nhóm chuyên gia: ${agentNames}.\n\nChủ đề: "${pool.topic}"\n\nHãy bắt đầu thảo luận!`;

  await poolService.addMessage(poolId, {
    agentId: 'mindx',
    content: announcement,
  });

  await broadcastService.broadcastAnnouncement(poolId, announcement);

  return announcement;
}

export async function runRelevanceCheck(
  agentId: string,
  agentSpecialty: string,
  latestMessage: string,
  poolContext: string
): Promise<boolean> {
  try {
    const messages = generateRelevanceCheckMessages(agentSpecialty, latestMessage, poolContext);

    const result = await withTimeout(
      llmRouter.agentChat('relevance_check', messages, { maxTokens: 10, temperature: 0.1 }),
      15_000,
      `relevance_check for agent ${agentId}`
    );

    const answer = typeof result === 'string' ? result : '';
    return answer.toLowerCase().trim().startsWith('yes');
  } catch (error) {
    logger.error('Relevance check failed', { agentId, error });
    return false;
  }
}

export async function generateWrapUp(poolId: string): Promise<string> {
  const pool = await Pool.findById(poolId);
  if (!pool) throw new Error('Pool not found');

  // Use last 20 messages to avoid overloading the LLM with huge transcripts
  const messages = await Message.find({ poolId }).sort({ timestamp: -1 }).limit(20);
  messages.reverse(); // oldest first for readability
  const transcriptRaw = messages.map((m) => `[${m.agentId}]: ${m.content}`).join('\n');
  // Hard cap at 20,000 chars to stay within model context limits
  const transcript = transcriptRaw.length > 20_000 ? transcriptRaw.slice(-20_000) : transcriptRaw;

  const wrapupStartMs = Date.now();
  logMeetingInfo(poolId, 'wrapup_start', 'Wrap-up LLM call initiated', {
    messageCount: messages.length,
    transcriptLength: transcript.length,
  });

  try {
    const chatMessages = generateWrapUpMessages(transcript);

    // Use streaming to avoid empty content from reasoning models (kimi-for-coding
    // returns empty message.content in non-streaming mode; content lives in stream deltas)
    const streamResult = await withTimeout(
      llmRouter.agentChat('full_response', chatMessages, { maxTokens: 4096, temperature: 0.5, stream: true }),
      60_000,
      'generateWrapUp'
    );

    let wrapUp = '';
    if (typeof streamResult === 'string') {
      wrapUp = streamResult.trim();
    } else {
      for await (const delta of parseSSEStream(streamResult)) {
        if (delta.type === 'content') {
          wrapUp += delta.text;
        }
      }
      wrapUp = wrapUp.trim();
    }
    if (!wrapUp) wrapUp = 'Cuộc thảo luận đã kết thúc.';

    await poolService.addMessage(poolId, {
      agentId: 'mindx',
      content: `📝 **Tổng kết:**\n\n${wrapUp}`,
    });

    await poolService.updatePoolStatus(poolId, 'completed');
    await broadcastService.broadcastPoolComplete(poolId, wrapUp);

    logMeetingInfo(poolId, 'wrapup_complete', 'Wrap-up saved to MongoDB', {
      contentLength: wrapUp.length,
      durationMs: Date.now() - wrapupStartMs,
    });
    logMeetingInfo(poolId, 'meeting_completed', 'Pool status set to completed');

    return wrapUp;
  } catch (error) {
    logger.error('Wrap-up generation failed', { poolId, error });
    logMeetingError(poolId, 'wrapup_error', 'Wrap-up LLM call failed, using fallback', {
      error: error instanceof Error ? error.message : String(error),
      durationMs: Date.now() - wrapupStartMs,
    });
    const fallback = 'Cuộc thảo luận đã kết thúc. Cảm ơn các chuyên gia đã tham gia!';
    await poolService.addMessage(poolId, { agentId: 'mindx', content: fallback });
    await poolService.updatePoolStatus(poolId, 'completed');
    await broadcastService.broadcastPoolComplete(poolId, fallback);
    logMeetingInfo(poolId, 'meeting_completed', 'Pool status set to completed (via fallback)');
    return fallback;
  }
}

export async function generateConversationTitle(
  userMessage: string,
  botReply?: string
): Promise<string | null> {
  try {
    const context = botReply
      ? `User: ${userMessage}\nAssistant: ${botReply.slice(0, 300)}`
      : `User: ${userMessage}`;

    const messages: ChatMessage[] = [
      {
        role: 'system',
        content:
          'Generate a concise English title (3-6 words) for this conversation based on the context. ' +
          'If the conversation does not have enough meaningful context to generate a specific title, respond with exactly "NONE". ' +
          'Return only the title or "NONE", no quotes, no explanation.',
      },
      { role: 'user', content: context },
    ];

    const result = await withTimeout(
      llmRouter.agentChat('full_response', messages, { maxTokens: 1000, temperature: 0.3 }),
      30_000,
      'generateConversationTitle'
    );

    const raw = (typeof result === 'string' ? result : '').trim();
    if (!raw || raw.toUpperCase() === 'NONE') return null;

    return raw.replace(/^["']|["']$/g, '').trim() || null;
  } catch (error) {
    logger.error('Title generation failed, will retry next exchange', { error: error instanceof Error ? error.message : String(error) });
    return null;
  }
}

export const MAX_MEETING_TURNS = 10;
export const MAX_EMPTY_ROUNDS = 3;

export async function handleMeetingLoop(poolId: string): Promise<void> {
  // Distributed lock — prevents concurrent loops for the same pool
  const lockKey = `lock:pool:${poolId}`;
  const acquired = await redis.set(lockKey, '1', 'EX', POOL_LOCK_TTL_SEC, 'NX');
  if (!acquired) {
    logger.info('[MindX] Loop already running, skipping', { poolId });
    logMeetingInfo(poolId, 'lock_skipped', 'Lock already held, skipping loop iteration');
    return;
  }

  const turnKey = `pool:${poolId}:turns`;
  const emptyRoundsKey = `pool:${poolId}:emptyRounds`;

  try {
    const pool = await Pool.findById(poolId);
    if (!pool || pool.status !== 'active') {
      logMeetingInfo(poolId, 'meeting_loop_exit', 'Pool not active or not found, exiting loop', {
        reason: !pool ? 'pool_not_found' : 'pool_not_active',
        status: pool?.status ?? null,
      });
      const qm = getQueueManager(poolId);
      const sd = getStopDetector(poolId);
      await qm.clear();
      await sd.reset();
      await redis.del(turnKey);
      await redis.del(emptyRoundsKey);
      return;
    }

    const queueManager = getQueueManager(poolId);
    const stopDetector = getStopDetector(poolId);

    // Latest messages for context (newest first, then reversed for display order)
    const latestMessages = await Message.find({ poolId }).sort({ timestamp: -1 }).limit(5);
    if (latestMessages.length === 0) return;

    // Pop next speaker (FIFO)
    const nextAgentId = await queueManager.popFromQueue();
    let agentSpoke = false;

    // Let next agent speak
    if (nextAgentId) {
      // Fetch agent doc
      const agentDocs = await Agent.find({ _id: nextAgentId });
      const agentDoc = agentDocs[0];

      if (agentDoc) {
        // Mark as speaking
        await poolService.updateAgentState(poolId, nextAgentId, 'speaking');
        await broadcastService.broadcastAgentState(poolId, nextAgentId, 'speaking');
        await broadcastService.broadcastAgentTyping(
          poolId,
          nextAgentId,
          agentDoc.name,
          agentDoc.icon,
          agentDoc.specialty
        );
        logMeetingInfo(poolId, 'agent_turn_start', `Agent ${agentDoc.name} starting turn`, {
          agentId: nextAgentId,
          agentName: agentDoc.name,
          agentSpecialty: agentDoc.specialty,
        });

        const chatMessages = generateAgentResponseMessages(agentDoc, [...latestMessages].reverse());

        let agentStartMs = 0;
        let agentContentLength = 0;

        try {
          const startTime = Date.now();
          agentStartMs = startTime;
          logMeetingInfo(poolId, 'agent_llm_start', `LLM stream initiated for ${agentDoc.name}`, {
            agentId: nextAgentId,
            agentName: agentDoc.name,
          });
          const STREAM_TIMEOUT_MS = 120_000;
          const BATCH_INTERVAL_MS = 100;
          const BATCH_SIZE_CHARS = 50;

          const streamResult = await withTimeout(
            llmRouter.agentChat('full_response', chatMessages, { maxTokens: 8000, temperature: 0.7, stream: true }),
            30_000,
            `stream init for agent ${agentDoc.name}`
          );

          let content: string;
          let accumulatedThinking = '';

          if (typeof streamResult === 'string') {
            // Fallback: provider returned full string (non-streaming)
            content = streamResult;
          } else {
            // Stream path: parse SSE chunks and broadcast in batches
            let accumulated = '';
            let batchBuffer = '';
            let lastFlush = Date.now();
            let thinkingBatchBuffer = '';
            let lastThinkingFlush = Date.now();
            const THINKING_BATCH_SIZE = 100;
            const THINKING_BATCH_INTERVAL = 1000;

            const flushBatch = async () => {
              if (batchBuffer.length > 0) {
                await broadcastService.broadcastAgentChunk(
                  poolId, nextAgentId, agentDoc.name, agentDoc.icon, batchBuffer
                );
                batchBuffer = '';
                lastFlush = Date.now();
              }
            };

            const flushThinkingBatch = async () => {
              if (thinkingBatchBuffer.length > 0) {
                const elapsedSec = Math.round((Date.now() - startTime) / 1000);
                await broadcastService.broadcastAgentThinking(
                  poolId, nextAgentId, agentDoc.name, thinkingBatchBuffer, elapsedSec
                );
                thinkingBatchBuffer = '';
                lastThinkingFlush = Date.now();
              }
            };

            try {
              for await (const delta of parseSSEStream(streamResult)) {
                if (Date.now() - startTime > STREAM_TIMEOUT_MS) {
                  logger.warn('Stream timeout, using partial content', { agent: agentDoc.name, poolId });
                  logMeetingWarn(poolId, 'agent_stream_timeout', `Stream timeout for ${agentDoc.name}`, {
                    agentId: nextAgentId,
                    agentName: agentDoc.name,
                    elapsedMs: Date.now() - startTime,
                    accumulatedLength: accumulated.length,
                  });
                  break;
                }

                if (delta.type === 'thinking') {
                  accumulatedThinking += delta.text;
                  thinkingBatchBuffer += delta.text;
                  if (thinkingBatchBuffer.length >= THINKING_BATCH_SIZE
                      || Date.now() - lastThinkingFlush >= THINKING_BATCH_INTERVAL) {
                    await flushThinkingBatch();
                  }
                } else if (delta.type === 'content') {
                  // Flush remaining thinking on first content chunk
                  if (thinkingBatchBuffer) {
                    await flushThinkingBatch();
                  }
                  accumulated += delta.text;
                  batchBuffer += delta.text;
                }

                if (batchBuffer.length >= BATCH_SIZE_CHARS || Date.now() - lastFlush >= BATCH_INTERVAL_MS) {
                  await flushBatch();
                }
              }
              await flushThinkingBatch();
              await flushBatch();
            } catch (streamError) {
              logger.error('Stream interrupted', { agent: agentDoc.name, poolId, error: streamError });
              logMeetingError(poolId, 'agent_turn_error', `Stream interrupted for ${agentDoc.name}`, {
                agentId: nextAgentId,
                agentName: agentDoc.name,
                error: streamError instanceof Error ? streamError.message : String(streamError),
                hadPartialContent: accumulated.length > 0,
              });
              await flushBatch();
              if (!accumulated) throw streamError;
            }

            content = accumulated;
          }

          const thinkSec = Math.round((Date.now() - startTime) / 1000);
          const thinking = accumulatedThinking || undefined;

          await poolService.addMessage(poolId, { agentId: nextAgentId, content, thinkSec });

          await broadcastService.broadcastAgentMessage(
            poolId,
            nextAgentId,
            agentDoc.name,
            agentDoc.icon,
            content,
            thinkSec,
            thinking
          );

          agentContentLength = content.length;
          agentSpoke = true;
        } catch (error) {
          logger.error('Agent failed to respond', { agent: agentDoc.name, poolId, error });
          logMeetingError(poolId, 'agent_turn_error', `Agent ${agentDoc.name} failed to respond`, {
            agentId: nextAgentId,
            agentName: agentDoc.name,
            error: error instanceof Error ? error.message : String(error),
          });
          await broadcastService.broadcastError(
            poolId,
            `${agentDoc.name} không phản hồi được. Tiếp tục...`
          );
        }

        // Mark as done / back to listening
        await poolService.updateAgentState(poolId, nextAgentId, 'listening');
        await broadcastService.broadcastAgentState(poolId, nextAgentId, 'listening');
        await broadcastService.broadcastAgentDone(poolId, nextAgentId);

        // Increment turn counter (only if agent actually spoke)
        if (agentSpoke) {
          const turnCount = await redis.incr(turnKey);
          await redis.expire(turnKey, POOL_LOCK_TTL_SEC);
          logger.info('[MindX] Turn completed', { poolId, turn: turnCount, agent: agentDoc.name });
          logMeetingInfo(poolId, 'agent_turn_complete', `Agent ${agentDoc.name} completed turn`, {
            agentId: nextAgentId,
            agentName: agentDoc.name,
            turnCount,
            durationMs: Date.now() - agentStartMs,
            contentLength: agentContentLength,
          });

          // Check max turns
          await stopDetector.checkMaxTurns(turnCount, MAX_MEETING_TURNS);
        }
      }
    }

    // ── Post-turn: relevance checks on LATEST message (including the new response) ──
    const freshMessages = await Message.find({ poolId }).sort({ timestamp: -1 }).limit(5);
    const freshLatest = freshMessages[0];
    if (freshLatest) {
      const freshContext = [...freshMessages].reverse().map((m) => `[${m.agentId}]: ${m.content}`).join('\n');

      // Collect listening agents (excluding whoever just spoke)
      const listeningAgentIds = pool.agents
        .filter((a) => a.state === 'listening' && a.agentId !== freshLatest.agentId)
        .map((a) => a.agentId);

      // Fetch all agent docs for relevance checks
      const agentDocs = await Agent.find({ _id: { $in: listeningAgentIds } });
      const agentMap = new Map(agentDocs.map((a) => [a._id.toString(), a]));

      const relevanceResults = await Promise.allSettled(
        listeningAgentIds.map(async (agentId) => {
          const doc = agentMap.get(agentId);
          if (!doc) return { agentId, shouldSpeak: false };
          const relevanceStart = Date.now();
          // Truncate both inputs to avoid overwhelming the relevance-check model
          // (MiniMax abab6.5s-chat returns empty when context is too large)
          const latestSnippet = freshLatest.content.slice(0, 800);
          const contextSnippet = freshContext.slice(0, 1500);
          const shouldSpeak = await runRelevanceCheck(
            agentId,
            doc.specialty,
            latestSnippet,
            contextSnippet
          );
          logMeetingInfo(poolId, 'relevance_check', `Relevance check for agent ${doc.name}`, {
            agentId,
            agentName: doc.name,
            result: shouldSpeak ? 'yes' : 'no',
            durationMs: Date.now() - relevanceStart,
          });
          return { agentId, shouldSpeak };
        })
      );

      for (const result of relevanceResults) {
        if (result.status !== 'fulfilled') continue;
        const { agentId, shouldSpeak } = result.value;
        if (shouldSpeak) {
          const added = await queueManager.addToQueue(agentId);
          if (added) {
            await poolService.updateAgentState(poolId, agentId, 'queued');
            await broadcastService.broadcastAgentState(poolId, agentId, 'queued');
            logMeetingInfo(poolId, 'agent_queued', `Agent queued after relevance check`, {
              agentId,
            });
          }
        }
      }

      // Broadcast updated queue
      const queueState = await queueManager.getQueue();
      await broadcastService.broadcastQueueUpdate(poolId, queueState);
    }

    // ── Decide: wrap-up or continue ──
    const currentQueueSize = await queueManager.getSize();
    await stopDetector.checkQueueEmpty(currentQueueSize);

    if (await stopDetector.shouldStop()) {
      logger.info('[MindX] Stop signal detected, generating wrap-up', { poolId });
      const signals = await stopDetector.getSignals();
      logMeetingInfo(poolId, 'stop_signal_detected', 'Stop signal detected, generating wrap-up', {
        reason: signals.maxTurnsReached ? 'maxTurns' : 'queueEmpty+userTrigger',
        signals,
      });
      await generateWrapUp(poolId);
      await queueManager.clear();
      await stopDetector.reset();
      await redis.del(turnKey);
      await redis.del(emptyRoundsKey);
    } else if (currentQueueSize > 0) {
      // Agents waiting → continue immediately
      await redis.del(emptyRoundsKey);
      await redis.rpush(MEETING_QUEUE_KEY, JSON.stringify({ poolId }));
      logger.info('[MindX] Re-enqueued meeting loop (agents waiting)', { poolId, queueSize: currentQueueSize });
    } else if (agentSpoke) {
      // An agent just spoke but nobody raised hand → force-add next agent round-robin
      const emptyRounds = await redis.incr(emptyRoundsKey);
      await redis.expire(emptyRoundsKey, POOL_LOCK_TTL_SEC);

      if (emptyRounds <= MAX_EMPTY_ROUNDS) {
        // Force-add next agent in round-robin (skip the one who just spoke)
        const candidates = pool.agents.filter((a) => a.agentId !== nextAgentId);
        if (candidates.length > 0) {
          // Pick the next agent deterministically based on empty round count
          const pick = candidates[(emptyRounds - 1) % candidates.length];
          const added = await queueManager.addToQueue(pick.agentId);
          if (added) {
            await poolService.updateAgentState(poolId, pick.agentId, 'queued');
            await broadcastService.broadcastAgentState(poolId, pick.agentId, 'queued');
            logger.info('[MindX] Force-added agent (round-robin)', { poolId, agent: pick.name, emptyRounds });
            logMeetingInfo(poolId, 'force_round_robin', `Force round-robin: ${pick.name} queued`, {
              agentId: pick.agentId,
              agentName: pick.name,
              emptyRounds,
            });
          }
          await redis.rpush(MEETING_QUEUE_KEY, JSON.stringify({ poolId }));
        } else {
          // Only 1 agent in pool → wrap up
          logger.info('[MindX] Single-agent pool, wrapping up', { poolId });
          await generateWrapUp(poolId);
          await queueManager.clear();
          await stopDetector.reset();
          await redis.del(turnKey);
          await redis.del(emptyRoundsKey);
        }
      } else {
        // Too many empty rounds → wrap up
        logger.info('[MindX] Max empty rounds reached, wrapping up', { poolId, emptyRounds });
        logMeetingWarn(poolId, 'max_empty_rounds', 'Max empty rounds reached, initiating wrap-up', {
          emptyRounds,
          maxEmptyRounds: MAX_EMPTY_ROUNDS,
        });
        await generateWrapUp(poolId);
        await queueManager.clear();
        await stopDetector.reset();
        await redis.del(turnKey);
        await redis.del(emptyRoundsKey);
      }
    }
    // else: no agent spoke and queue empty on first call → initial setup still in progress, don't re-enqueue
  } finally {
    // Always release lock
    await redis.del(lockKey);
  }
}

export { llmRouter, getQueueManager, getStopDetector };
