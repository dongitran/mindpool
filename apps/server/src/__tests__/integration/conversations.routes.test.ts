import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock env vars before any app code paths run
process.env.MONGO_URI = 'mongodb://localhost/test';
process.env.REDIS_URL = 'redis://localhost:6379';
process.env.ENCRYPTION_KEY = 'test_encryption_key_32_bytes_long_123';

const { mockConversation, mockGenerateTitle, mockSuggestAgents, mockLlmChat } = vi.hoisted(() => {
  const mockSave = vi.fn();
  const mockConversation = {
    title: 'Cuộc trò chuyện mới',
    messages: [{ type: 'bot', time: '10:00', content: 'Hello greeting' }],
    save: mockSave,
    _id: 'conv-1',
  };
  return {
    mockConversation,
    mockGenerateTitle: vi.fn(),
    mockSuggestAgents: vi.fn().mockResolvedValue([]),
    mockLlmChat: vi.fn(),
  };
});

vi.mock('../../services/mindx.service', () => ({
  llmRouter: { agentChat: mockLlmChat },
  analyzeTopicAndSuggestAgents: mockSuggestAgents,
  generateConversationTitle: mockGenerateTitle,
}));

vi.mock('../../lib/logger', () => ({
  logger: { error: vi.fn(), info: vi.fn(), warn: vi.fn(), debug: vi.fn() },
}));

vi.mock('../../models', () => ({
  Conversation: {
    findById: vi.fn().mockResolvedValue(mockConversation),
    create: vi.fn().mockResolvedValue(mockConversation),
    find: vi.fn().mockReturnValue({
      sort: vi.fn().mockReturnValue({
        select: vi.fn().mockResolvedValue([]),
      }),
    }),
  },
}));

import request from 'supertest';
import express from 'express';
import { conversationsRouter } from '../../routes/conversations';

const app = express();
app.use(express.json());
app.use('/', conversationsRouter);

app.use((err: unknown, _req: unknown, res: express.Response, _next: unknown) => {
  res.status(500).json({ error: (err as Error).message });
});

describe('POST /conversations/:id/message — title generation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockConversation.title = 'Cuộc trò chuyện mới';
    mockConversation.messages = [{ type: 'bot', time: '10:00', content: 'Hello greeting' }];
    mockConversation.save.mockResolvedValue(mockConversation);
  });

  it('should generate English title when context is sufficient', async () => {
    mockLlmChat.mockResolvedValue('MindX bot response here');
    mockGenerateTitle.mockResolvedValue('AI Startup Strategy');

    await request(app)
      .post('/conv-1/message')
      .send({ content: 'Analyze AI strategy for startups' })
      .expect(200);

    expect(mockGenerateTitle).toHaveBeenCalledWith(
      'Analyze AI strategy for startups',
      expect.any(String)
    );
    expect(mockConversation.title).toBe('AI Startup Strategy');
    expect(mockConversation.save).toHaveBeenCalled();
  });

  it('should NOT update title when AI returns null (NONE)', async () => {
    mockLlmChat.mockResolvedValue('What topic do you want to discuss?');
    mockGenerateTitle.mockResolvedValue(null);

    await request(app)
      .post('/conv-1/message')
      .send({ content: 'Hello' })
      .expect(200);

    expect(mockConversation.title).toBe('Cuộc trò chuyện mới');
  });

  it('should NOT call generateTitle when title is already set', async () => {
    mockConversation.title = 'Existing Custom Title';
    mockLlmChat.mockResolvedValue('response');

    await request(app)
      .post('/conv-1/message')
      .send({ content: 'Follow-up message' })
      .expect(200);

    expect(mockGenerateTitle).not.toHaveBeenCalled();
  });

  it('should keep default title when generateTitle throws', async () => {
    mockLlmChat.mockResolvedValue('response');
    mockGenerateTitle.mockRejectedValue(new Error('LLM error'));

    await request(app)
      .post('/conv-1/message')
      .send({ content: 'topic message' })
      .expect(200);

    expect(mockConversation.title).toBe('Cuộc trò chuyện mới');
  });

  it('should pass undefined botReply to generateTitle when main LLM errors', async () => {
    mockLlmChat.mockRejectedValue(new Error('LLM failed'));
    mockGenerateTitle.mockResolvedValue(null);

    await request(app)
      .post('/conv-1/message')
      .send({ content: 'topic' })
      .expect(200);

    expect(mockGenerateTitle).toHaveBeenCalledWith('topic', undefined);
  });
});
