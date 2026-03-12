import { Router } from 'express';
import { Conversation, Agent } from '../models';
import { llmRouter, analyzeTopicAndSuggestAgents, generateConversationTitle } from '../services/mindx.service';
import { parseSSEStream } from '../llm/stream-parser';
import type { ChatMessage } from '@mindpool/shared';
import { logger } from '../lib/logger';
import { validate } from '../middleware/validate';
import {
  createConversationSchema,
  sendConversationMessageSchema,
} from '@mindpool/shared';

const router = Router();

// POST /conversations — create new conversation
router.post('/', validate(createConversationSchema), async (req, res, next) => {
  try {
    const { title } = req.body;
    const now = new Date().toLocaleTimeString('vi-VN', {
      hour: '2-digit',
      minute: '2-digit',
    });

    const conversation = await Conversation.create({
      title: title || 'Cuộc trò chuyện mới',
      sub: '',
      messages: [
        {
          type: 'bot',
          time: now,
          content: 'Xin chào! Tôi là **MindX** — trợ lý điều phối của Mindpool.\n\nHãy mô tả chủ đề bạn muốn thảo luận — tôi sẽ gợi ý những expert agent phù hợp nhất và tạo **Mindpool** cho bạn. 🎯',
        },
      ],
    });

    res.status(201).json(conversation);
  } catch (error) {
    next(error);
  }
});

// GET /conversations — list all conversations
router.get('/', async (_req, res, next) => {
  try {
    const conversations = await Conversation.find()
      .sort({ updatedAt: -1 })
      .select('title sub createdAt updatedAt');
    res.json(conversations);
  } catch (error) {
    next(error);
  }
});

// GET /conversations/:id — get conversation by id
router.get('/:id', async (req, res, next) => {
  try {
    const conversation = await Conversation.findById(req.params.id);
    if (!conversation) {
      res.status(404).json({ error: { message: 'Conversation not found' } });
      return;
    }
    res.json(conversation);
  } catch (error) {
    next(error);
  }
});

// POST /conversations/:id/message — send user message, stream MindX reply via SSE
router.post('/:id/message', validate(sendConversationMessageSchema), async (req, res, next) => {
  try {
    const conversation = await Conversation.findById(req.params.id);
    if (!conversation) {
      res.status(404).json({ error: { message: 'Conversation not found' } });
      return;
    }

    // Try to generate title if still using default — retries every exchange until context is sufficient
    const needsTitle = conversation.title === 'Cuộc trò chuyện mới';

    const { content } = req.body;
    const now = new Date().toLocaleTimeString('vi-VN', {
      hour: '2-digit',
      minute: '2-digit',
    });

    // Hoist replyContent and thinkingContent outside inner try/catch so it's accessible for persistence
    let replyContent = '';
    let thinkingContent = '';
    let lastFlushedCleanLength = 0;

    // Add user message
    (conversation.messages as unknown as Array<Record<string, unknown>>).push({
      type: 'user',
      time: now,
      content,
    });

    // Generate MindX reply
    const chatHistory: ChatMessage[] = (
      conversation.messages as unknown as Array<{ type: string; content?: string; agents?: any[] }>
    )
      .filter((m) => m.content || (m.type === 'bot-agents' && m.agents?.length)) // Filter out empty bot messages unless they have agents
      .map((m) => ({
        role: m.type === 'user' ? ('user' as const) : ('assistant' as const),
        content: m.content!,
      }));

    // Prepare agent context for MindX
    const selectableAgents = await Agent.find({ name: { $ne: 'MindX' } });
    const agentListStr = selectableAgents
      .map((a) => `- ${a.name} (Specialty: ${a.specialty}, ID: ${a._id})`)
      .join('\n');

    chatHistory.unshift({
      role: 'system',
      content:
        'You are MindX, a helpful AI assistant that helps users explore topics by suggesting expert agents for group discussions. Respond in Vietnamese. Be concise and friendly.\n\n' +
        'CRITICAL: Use your reasoning/thinking block ONLY for internal logic and evaluation. DO NOT draft the final response inside the thinking/reasoning block. ' +
        'You MUST output your actual final response (starting with the tags below) in the regular content stream after the reasoning phase.\n\n' +
        'If the user provides a clear topic that is ready for discussion, follow these steps EXACTLY:\n' +
        '1. Include the exact string "[READY]" at the very beginning of your response.\n' +
        '2. Choose 3-5 relevant agents from the list below and include their IDs in the format: "[AGENTS: id1, id2, id3]".\n' +
        '3. Provide a short, encouraging introduction about why you chose these experts.\n\n' +
        'AVAILABLE AGENTS:\n' +
        agentListStr +
        '\n\nDO NOT list the suggested agents by name in the text response, as they will be displayed as interactive selection blocks automatically.',
    });

    // Set up SSE streaming headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');

    try {
      const streamResult = await llmRouter.agentChat('full_response', chatHistory, {
        maxTokens: 4096, // Increased for reasoning models
        temperature: 0.7,
        stream: true,
      });

      if (typeof streamResult === 'string') {
        // Non-streaming fallback
        replyContent = streamResult || 'Tôi hiểu. Bạn muốn tìm hiểu thêm không?';
        res.write(`data: ${JSON.stringify({ type: 'chunk', content: replyContent })}\n\n`);
      } else {
        // Stream chunks to client
        const BATCH_INTERVAL_MS = 80;
        const BATCH_SIZE_CHARS = 30;
        let contentBatch = '';
        let thinkingBatch = '';
        let lastFlush = Date.now();
        thinkingContent = '';
        lastFlushedCleanLength = 0;

        const flushBatch = () => {
          if (thinkingBatch.length > 0) {
            res.write(`data: ${JSON.stringify({ type: 'thinking_chunk', content: thinkingBatch })}\n\n`);
            thinkingBatch = '';
          }
          if (contentBatch.length > 0) {
            res.write(`data: ${JSON.stringify({ type: 'chunk', content: contentBatch })}\n\n`);
            contentBatch = '';
          }
          lastFlush = Date.now();
        };

        let hasSuggestedAgents = false;

        try {
          for await (const chunk of parseSSEStream(streamResult)) {
            if (chunk.type === 'thinking') {
              thinkingContent += chunk.text;
              thinkingBatch += chunk.text;
            } else {
              replyContent += chunk.text;

              if (!hasSuggestedAgents) {
                // Detective [READY] mid-stream to suggest agents immediately
                if (replyContent.includes('[AGENTS:')) {
                  const match = replyContent.match(/\[AGENTS:\s*([^\]]+)\]/);
                  if (match) {
                    hasSuggestedAgents = true;
                    const agentIds = match[1].split(',').map((id) => id.trim());

                    Agent.find({ _id: { $in: agentIds } })
                      .then((foundAgents) => {
                        const suggestions = foundAgents.map((a) => ({
                          agentId: a._id.toString(),
                          icon: a.icon,
                          name: a.name,
                          desc: a.specialty,
                          checked: true,
                        }));
                        res.write(`data: ${JSON.stringify({ type: 'agents_suggested', agents: suggestions })}\n\n`);
                      })
                      .catch((err) => logger.error('Async agent suggestion failed', { error: err }));
                  }
                }
              }

              // Robust streaming: Clean all tags and stream the new content delta
              const getCleanText = (raw: string) => {
                let clean = raw.replace(/\[READY\]/g, '').replace(/\[AGENTS:[^\]]*\]/g, '');
                // Also hide partial tags at the end
                const bracketIdx = clean.lastIndexOf('[');
                if (bracketIdx !== -1 && !clean.slice(bracketIdx).includes(']')) {
                  clean = clean.slice(0, bracketIdx);
                }
                return clean.trimStart();
              };

              const currentClean = getCleanText(replyContent);
              if (currentClean.length > lastFlushedCleanLength) {
                const delta = currentClean.slice(lastFlushedCleanLength);
                contentBatch += delta;
                lastFlushedCleanLength = currentClean.length;
              }
            }

            const totalBatch = contentBatch.length + thinkingBatch.length;
            if (totalBatch >= BATCH_SIZE_CHARS || Date.now() - lastFlush >= BATCH_INTERVAL_MS) {
              flushBatch();
            }
          }
          flushBatch();
          // Send thinking_done so frontend knows thinking is complete (with elapsed time placeholder)
          if (thinkingContent) {
            res.write(`data: ${JSON.stringify({ type: 'thinking_done' })}\n\n`);
          }
        } catch (streamError) {
          logger.error('Conversation stream interrupted', { error: streamError });
          flushBatch();
          if (!replyContent) {
            replyContent = 'Xin lỗi, tôi gặp lỗi khi xử lý. Bạn thử lại nhé!';
          }
        }
      }

      let isReady = false;

      let results: any[] = [];
      const agentMatch = replyContent.match(/\[AGENTS:\s*([^\]]+)\]/);
      
      if (replyContent.includes('[READY]')) {
        isReady = true;
        // Clean up tags for UI display
        replyContent = replyContent.replace(/\[READY\]/g, '').trim();
        replyContent = replyContent.replace(/\[AGENTS:[^\]]+\]/g, '').trim();
        replyContent = replyContent.replace(/^[\r\n]+/, '');
      }

      const replyTime = new Date().toLocaleTimeString('vi-VN', {
        hour: '2-digit',
        minute: '2-digit',
      });

      if (isReady) {
        if (agentMatch) {
          const ids = agentMatch[1].split(',').map(id => id.trim());
          const found = await Agent.find({ _id: { $in: ids } });
          results = found.map(a => ({
            agentId: a._id.toString(),
            icon: a.icon,
            name: a.name,
            desc: a.specialty,
            checked: true,
          }));
        }

        // If no experts found via tags, fallback to automatic selection
        if (results.length === 0) {
          results = await analyzeTopicAndSuggestAgents(content);
        }

        // Clean final content for storage
        let cleanContent = replyContent.replace(/\[READY\]/g, '').replace(/\[AGENTS:[^\]]*\]/g, '').trim();
        
        if (isReady && !cleanContent) {
          cleanContent = 'Dưới đây là một số chuyên gia tôi đề xuất cho cuộc thảo luận của bạn:';
        }

        (conversation.messages as unknown as Array<Record<string, unknown>>).push({
          type: 'bot-agents',
          time: replyTime,
          intro: cleanContent,
          agents: results,
          thinking: thinkingContent,
          btnId: `start-btn-${conversation._id}`,
        });
      } else {
        (conversation.messages as unknown as Array<Record<string, unknown>>).push({
          type: 'bot',
          time: replyTime,
          content: replyContent.trim(),
          thinking: thinkingContent,
        });
      }
    } catch (llmError) {
      logger.error('LLM error in conversation', { error: llmError });
      const replyTime = new Date().toLocaleTimeString('vi-VN', {
        hour: '2-digit',
        minute: '2-digit',
      });
      (conversation.messages as unknown as Array<Record<string, unknown>>).push({
        type: 'bot',
        time: replyTime,
        content: 'Xin lỗi, tôi gặp lỗi khi xử lý. Bạn thử lại nhé!',
      });
    }

    // Generate English title if still using default
    if (needsTitle) {
      const generatedTitle = await generateConversationTitle(
        content,
        replyContent || undefined
      ).catch(() => null);
      if (generatedTitle) {
        conversation.title = generatedTitle;
      }
    }

    await conversation.save();

    // Send final conversation state for sync
    res.write(`data: ${JSON.stringify({ type: 'done', conversation })}\n\n`);
    res.end();
  } catch (error) {
    next(error);
  }
});

export { router as conversationsRouter };
