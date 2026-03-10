import { Router } from 'express';
import { Conversation } from '../models';
import { llmRouter } from '../services/mindx.service';
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
          content: 'Xin chào! Tôi là MindX. Bạn muốn thảo luận về chủ đề gì?',
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

    const { content } = req.body;
    const now = new Date().toLocaleTimeString('vi-VN', {
      hour: '2-digit',
      minute: '2-digit',
    });

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
        'You are MindX, a helpful AI assistant that helps users explore topics by suggesting expert agents for group discussions. Respond in Vietnamese. Be concise and friendly.',
    });

    try {
      const result = await llmRouter.agentChat('full_response', chatHistory, {
        maxTokens: 1024,
        temperature: 0.7,
      });

      const replyContent = typeof result === 'string' ? result : 'Tôi hiểu. Bạn muốn tìm hiểu thêm không?';
      const replyTime = new Date().toLocaleTimeString('vi-VN', {
        hour: '2-digit',
        minute: '2-digit',
      });

      (conversation.messages as unknown as Array<Record<string, unknown>>).push({
        type: 'bot',
        time: replyTime,
        content: replyContent,
      });
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

    await conversation.save();
    res.json(conversation);
  } catch (error) {
    next(error);
  }
});

export { router as conversationsRouter };
