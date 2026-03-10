import type { RouterConfig } from '@mindpool/shared';
import { LLMRouter } from '../llm/router';
import { KimiProvider, MinimaxProvider } from '../llm/providers';
import { QueueManager } from '../queue/QueueManager';
import { StopSignalDetector } from '../queue/StopSignalDetector';
import { config } from '../config';
import { Pool, Agent, Message } from '../models';
import { poolService } from '../di';
import { logger } from '../lib/logger';
import { redis, POOL_LOCK_TTL_SEC, MEETING_QUEUE_KEY } from '../lib/redis';
import { broadcastService } from './broadcast.service';
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

  const suggestions = allAgents.map((agent) => {
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

  const messages = await Message.find({ poolId }).sort({ timestamp: 1 });
  const transcript = messages.map((m) => `[${m.agentId}]: ${m.content}`).join('\n');

  try {
    const chatMessages = generateWrapUpMessages(transcript);

    const result = await withTimeout(
      llmRouter.agentChat('full_response', chatMessages, { maxTokens: 1024, temperature: 0.5 }),
      60_000,
      'generateWrapUp'
    );

    const wrapUp = typeof result === 'string' ? result : 'Cuộc thảo luận đã kết thúc.';

    await poolService.addMessage(poolId, {
      agentId: 'mindx',
      content: `📝 **Tổng kết:**\n\n${wrapUp}`,
    });

    await poolService.updatePoolStatus(poolId, 'completed');
    await broadcastService.broadcastPoolComplete(poolId, wrapUp);

    return wrapUp;
  } catch (error) {
    logger.error('Wrap-up generation failed', { poolId, error });
    const fallback = 'Cuộc thảo luận đã kết thúc. Cảm ơn các chuyên gia đã tham gia!';
    await poolService.addMessage(poolId, { agentId: 'mindx', content: fallback });
    await poolService.updatePoolStatus(poolId, 'completed');
    await broadcastService.broadcastPoolComplete(poolId, fallback);
    return fallback;
  }
}

export async function handleMeetingLoop(poolId: string): Promise<void> {
  // Distributed lock — prevents concurrent loops for the same pool
  const lockKey = `lock:pool:${poolId}`;
  const acquired = await redis.set(lockKey, '1', 'EX', POOL_LOCK_TTL_SEC, 'NX');
  if (!acquired) {
    logger.info('[MindX] Loop already running, skipping', { poolId });
    return;
  }

  try {
    const pool = await Pool.findById(poolId);
    if (!pool || pool.status !== 'active') {
      const qm = getQueueManager(poolId);
      const sd = getStopDetector(poolId);
      await qm.clear();
      await sd.reset();
      return;
    }

    const queueManager = getQueueManager(poolId);
    const stopDetector = getStopDetector(poolId);

    // Latest messages for context (newest first, then reversed for display order)
    const latestMessages = await Message.find({ poolId }).sort({ timestamp: -1 }).limit(5);
    if (latestMessages.length === 0) return;

    const latestMessage = latestMessages[0]!;
    const poolContext = [...latestMessages].reverse().map((m) => `[${m.agentId}]: ${m.content}`).join('\n');

    // Collect listening agents (excluding whoever just spoke)
    const listeningAgentIds = pool.agents
      .filter((a) => a.state === 'listening' && a.agentId !== latestMessage.agentId)
      .map((a) => a.agentId);

    // Pop next speaker before relevance checks (FIFO)
    const nextAgentId = await queueManager.popFromQueue();

    // Fetch all needed agent docs in one DB call
    const allNeededIds = [...new Set([...listeningAgentIds, ...(nextAgentId ? [nextAgentId] : [])])];
    const agentDocs = await Agent.find({ _id: { $in: allNeededIds } });
    const agentMap = new Map(agentDocs.map((a) => [a._id.toString(), a]));

    // Relevance checks in parallel: which listening agents should join the queue?
    const relevanceResults = await Promise.allSettled(
      listeningAgentIds.map(async (agentId) => {
        const agentDoc = agentMap.get(agentId);
        if (!agentDoc) return { agentId, shouldSpeak: false };
        const shouldSpeak = await runRelevanceCheck(
          agentId,
          agentDoc.specialty,
          latestMessage.content,
          poolContext
        );
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
        }
      }
    }

    // Broadcast updated queue
    const queueState = await queueManager.getQueue();
    await broadcastService.broadcastQueueUpdate(poolId, queueState);

    // Let next agent speak
    if (nextAgentId) {
      const agentDoc = agentMap.get(nextAgentId);
      if (agentDoc) {
        // Mark as speaking
        await poolService.updateAgentState(poolId, nextAgentId, 'speaking');
        await broadcastService.broadcastAgentTyping(
          poolId,
          nextAgentId,
          agentDoc.name,
          agentDoc.icon,
          agentDoc.specialty
        );

        const chatMessages = generateAgentResponseMessages(agentDoc, [...latestMessages].reverse());

        try {
          const startTime = Date.now();
          const result = await withTimeout(
            llmRouter.agentChat('full_response', chatMessages, { maxTokens: 2048, temperature: 0.7 }),
            120_000,
            `full_response for agent ${agentDoc.name}`
          );

          const content = typeof result === 'string' ? result : '';
          const thinkSec = (Date.now() - startTime) / 1000;

          await poolService.addMessage(poolId, { agentId: nextAgentId, content, thinkSec });

          // Emit the message event
          await broadcastService.broadcastAgentMessage(
            poolId,
            nextAgentId,
            agentDoc.name,
            agentDoc.icon,
            content,
            thinkSec
          );
        } catch (error) {
          logger.error('Agent failed to respond', { agent: agentDoc.name, poolId, error });
          await broadcastService.broadcastError(
            poolId,
            `${agentDoc.name} không phản hồi được. Tiếp tục...`
          );
        }

        // Mark as done / back to listening
        await poolService.updateAgentState(poolId, nextAgentId, 'listening');
        await broadcastService.broadcastAgentDone(poolId, nextAgentId);
      }
    }

    // Check stop signals
    const currentQueueSize = await queueManager.getSize();
    await stopDetector.checkQueueEmpty(currentQueueSize);
    if (await stopDetector.shouldStop()) {
      await generateWrapUp(poolId);
      // Cleanup Redis state for this pool
      await queueManager.clear();
      await stopDetector.reset();
    } else if (currentQueueSize > 0) {
      // Re-enqueue so the next agent in the queue gets to speak
      await redis.rpush(MEETING_QUEUE_KEY, JSON.stringify({ poolId }));
      logger.info('[MindX] Re-enqueued meeting loop for next turn', { poolId, queueSize: currentQueueSize });
    }
  } finally {
    // Always release lock
    await redis.del(lockKey);
  }
}

export { llmRouter, getQueueManager, getStopDetector };
