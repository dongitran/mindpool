import { Router } from 'express';
import { Conversation } from '../models';
import { llmRouter, analyzeTopicAndSuggestAgents, generateConversationTitle } from '../services/mindx.service';
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

// POST /conversations/:id/message — send user message, get MindX reply
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

    // Hoist replyContent outside inner try/catch so it's accessible for title generation
    let replyContent = '';

    // Add user message
    (conversation.messages as unknown as Array<Record<string, unknown>>).push({
      type: 'user',
      time: now,
      content,
    });

    // Generate MindX reply
    const chatHistory: ChatMessage[] = (
      conversation.messages as unknown as Array<{ type: string; content?: string }>
    )
      .filter((m) => m.content)
      .map((m) => ({
        role: m.type === 'user' ? ('user' as const) : ('assistant' as const),
        content: m.content!,
      }));

    chatHistory.unshift({
      role: 'system',
      content:
        'You are MindX, a helpful AI assistant that helps users explore topics by suggesting expert agents for group discussions. Respond in Vietnamese. Be concise and friendly. If the user provides a clear topic that is ready for discussion, include the exact string "[READY]" at the very beginning of your response. When responding with [READY], provide a short encouraging introduction about the topic, but DO NOT list the suggested agents in the text response, as they will be displayed as interactive selection blocks automatically.',
    });

    try {
      const result = await llmRouter.agentChat('full_response', chatHistory, {
        maxTokens: 1024,
        temperature: 0.7,
      });

      replyContent = typeof result === 'string' ? result : 'Tôi hiểu. Bạn muốn tìm hiểu thêm không?';
      let isReady = false;

      if (replyContent.includes('[READY]')) {
        isReady = true;
        replyContent = replyContent.replace('[READY]', '').trim();
        // Remove empty lines at the beginning just in case
        replyContent = replyContent.replace(/^[\r\n]+/, '');
      }

      const replyTime = new Date().toLocaleTimeString('vi-VN', {
        hour: '2-digit',
        minute: '2-digit',
      });

      if (isReady) {
        const topic = content; // use the user's latest input as topic for simplicity
        const suggestions = await analyzeTopicAndSuggestAgents(topic);
        
        (conversation.messages as unknown as Array<Record<string, unknown>>).push({
          type: 'bot-agents',
          time: replyTime,
          intro: replyContent,
          agents: suggestions,
          btnId: `start-btn-${conversation._id}`,
        });
      } else {
        (conversation.messages as unknown as Array<Record<string, unknown>>).push({
          type: 'bot',
          time: replyTime,
          content: replyContent,
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

    // Generate English title if still using default — await before save so title is in the response
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
    res.json(conversation);
  } catch (error) {
    next(error);
  }
});

export { router as conversationsRouter };
