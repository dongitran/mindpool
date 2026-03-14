import { describe, it, expect, vi, beforeEach } from 'vitest';

// ─── Mocks (vi.hoisted to avoid hoisting issues) ────────

const { mockRedis, mockChat, mockAgents } = vi.hoisted(() => {
  const mockRedis = {
    set: vi.fn(),
    del: vi.fn(),
    rpush: vi.fn(),
    get: vi.fn(),
    hset: vi.fn(),
    hgetall: vi.fn().mockResolvedValue({}),
    lrange: vi.fn().mockResolvedValue([]),
    llen: vi.fn().mockResolvedValue(0),
    lpop: vi.fn().mockResolvedValue(null),
    eval: vi.fn(),
    expire: vi.fn(),
    incr: vi.fn().mockResolvedValue(1),
  };

  const mockChat = vi.fn();

  const mockAgents = [
    { _id: { toString: () => 'agent-biz' }, icon: '💼', name: 'Business', specialty: 'business strategy market analysis', systemPrompt: '', personality: { directness: 0.8, creativity: 0.5, skepticism: 0.3 }, signatureQuestion: '', isCustom: false },
    { _id: { toString: () => 'agent-eng' }, icon: '⚙️', name: 'Engineering', specialty: 'software engineering architecture', systemPrompt: '', personality: { directness: 0.7, creativity: 0.6, skepticism: 0.5 }, signatureQuestion: '', isCustom: false },
    { _id: { toString: () => 'agent-sec' }, icon: '🔒', name: 'Security', specialty: 'cybersecurity risk assessment', systemPrompt: '', personality: { directness: 0.9, creativity: 0.3, skepticism: 0.8 }, signatureQuestion: '', isCustom: false },
  ];

  return { mockRedis, mockChat, mockAgents };
});

vi.mock('../../lib/logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

vi.mock('../../lib/redis', () => ({
  redis: mockRedis,
  POOL_LOCK_TTL_SEC: 900,
  MEETING_QUEUE_KEY: 'queue:meeting-loop',
}));

vi.mock('../../lib/pubsub', () => ({
  sendSSEToPool: vi.fn(),
}));

vi.mock('../../config', () => ({
  config: {
    kimiApiKey: 'test-key',
    minimaxApiKey: '',
    llmRouting: {
      fullResponse: { provider: 'kimi', model: 'kimi-k2' },
      relevanceCheck: { provider: 'kimi', model: 'kimi-k2' },
      recapSynthesis: { provider: 'kimi', model: 'kimi-k2' },
    },
  },
}));

vi.mock('../../llm/providers', () => ({
  KimiProvider: vi.fn().mockImplementation(() => ({
    id: 'kimi',
    chat: mockChat,
  })),
  MinimaxProvider: vi.fn().mockImplementation(() => ({
    id: 'minimax',
    chat: vi.fn(),
  })),
}));

vi.mock('../../models', () => ({
  Pool: {
    findById: vi.fn(),
    findByIdAndUpdate: vi.fn(),
    create: vi.fn(),
  },
  Agent: {
    find: vi.fn().mockResolvedValue(mockAgents),
  },
  Message: {
    find: vi.fn().mockReturnValue({
      sort: vi.fn().mockReturnValue({
        limit: vi.fn().mockResolvedValue([]),
      }),
    }),
    create: vi.fn(),
  },
}));

vi.mock('../../di', () => ({
  poolService: {
    addMessage: vi.fn().mockResolvedValue({ _id: 'msg-1' }),
    updateAgentState: vi.fn(),
    updatePoolStatus: vi.fn(),
  },
}));

vi.mock('../../services/broadcast.service', () => ({
  broadcastService: {
    broadcastAnnouncement: vi.fn(),
    broadcastPoolComplete: vi.fn(),
    broadcastQueueUpdate: vi.fn(),
    broadcastAgentState: vi.fn(),
    broadcastAgentTyping: vi.fn(),
    broadcastAgentMessage: vi.fn(),
    broadcastAgentThinking: vi.fn(),
    broadcastAgentDone: vi.fn(),
    broadcastAgentStopTyping: vi.fn(),
    broadcastError: vi.fn(),
  },
}));

vi.mock('../../utils/prompt.utils', () => ({
  generateRelevanceCheckMessages: vi.fn().mockReturnValue([{ role: 'user', content: 'check' }]),
  generateWrapUpMessages: vi.fn().mockReturnValue([{ role: 'user', content: 'wrap' }]),
  generateAgentResponseMessages: vi.fn().mockReturnValue([{ role: 'user', content: 'respond' }]),
}));

// ─── Tests ───────────────────────────────────────────────

import {
  analyzeTopicAndSuggestAgents,
  selectOpeningAgent,
  generateAnnouncement,
  runRelevanceCheck,
  generateConversationTitle,
  handleMeetingLoop,
} from '../../services/mindx.service';
import { Pool, Agent, Message } from '../../models';
import { poolService } from '../../di';
import { broadcastService } from '../../services/broadcast.service';

describe('analyzeTopicAndSuggestAgents', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return all agents sorted by relevance', async () => {
    const suggestions = await analyzeTopicAndSuggestAgents('business strategy for startup');

    expect(suggestions.length).toBe(3);
    // Business agent should be most relevant for "business strategy"
    expect(suggestions[0].name).toBe('Business');
    expect(suggestions[0].relevance).toBe(0.8);
    expect(suggestions[0].checked).toBe(true);
  });

  it('should mark low-relevance agents as unchecked', async () => {
    const suggestions = await analyzeTopicAndSuggestAgents('cooking recipes');

    // None of the agents specialize in cooking
    const uncheckedCount = suggestions.filter((s) => !s.checked).length;
    expect(uncheckedCount).toBe(3);
  });

  it('should match partial words in specialty', async () => {
    const suggestions = await analyzeTopicAndSuggestAgents('market analysis report');

    // Business agent has "market analysis" in specialty
    const bizAgent = suggestions.find((s) => s.name === 'Business');
    expect(bizAgent?.relevance).toBe(0.8);
    expect(bizAgent?.checked).toBe(true);
  });

  it('should return agent details correctly', async () => {
    const suggestions = await analyzeTopicAndSuggestAgents('anything');

    for (const s of suggestions) {
      expect(s).toHaveProperty('agentId');
      expect(s).toHaveProperty('icon');
      expect(s).toHaveProperty('name');
      expect(s).toHaveProperty('desc');
      expect(s).toHaveProperty('relevance');
      expect(s).toHaveProperty('checked');
    }
  });
});

describe('selectOpeningAgent', () => {
  it('should select the most relevant agent for the topic', async () => {
    const agents = [
      { agentId: 'a1', name: 'Business', specialty: 'business strategy market' },
      { agentId: 'a2', name: 'Engineering', specialty: 'software engineering' },
    ];

    const result = await selectOpeningAgent('business market strategy', agents);
    expect(result.name).toBe('Business');
  });

  it('should return first agent when none match', async () => {
    const agents = [
      { agentId: 'a1', name: 'Business', specialty: 'finance' },
      { agentId: 'a2', name: 'Engineering', specialty: 'code' },
    ];

    const result = await selectOpeningAgent('cooking recipes', agents);
    expect(result.name).toBe('Business'); // Falls back to first
  });

  it('should handle single agent array', async () => {
    const agents = [
      { agentId: 'a1', name: 'Solo', specialty: 'everything' },
    ];

    const result = await selectOpeningAgent('anything', agents);
    expect(result.name).toBe('Solo');
  });

  it('should handle empty agents array gracefully', async () => {
    const result = await selectOpeningAgent('topic', []);
    expect(result).toBeUndefined();
  });

  it('should be case-insensitive', async () => {
    const agents = [
      { agentId: 'a1', name: 'Eng', specialty: 'SOFTWARE ENGINEERING' },
    ];

    const result = await selectOpeningAgent('SOFTWARE', agents);
    expect(result.name).toBe('Eng');
  });
});

describe('generateAnnouncement', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should generate announcement with agent names', async () => {
    (Pool.findById as ReturnType<typeof vi.fn>).mockResolvedValue({
      _id: 'pool-1',
      topic: 'AI startup',
      agents: [
        { name: 'Business', agentId: 'a1' },
        { name: 'Engineering', agentId: 'a2' },
      ],
    });

    const announcement = await generateAnnouncement('pool-1');

    expect(announcement).toContain('Business');
    expect(announcement).toContain('Engineering');
    expect(announcement).toContain('AI startup');
    expect(poolService.addMessage).toHaveBeenCalledWith('pool-1', expect.objectContaining({
      agentId: 'mindx',
    }));
    expect(broadcastService.broadcastAnnouncement).toHaveBeenCalledWith('pool-1', announcement);
  });

  it('should throw when pool not found', async () => {
    (Pool.findById as ReturnType<typeof vi.fn>).mockResolvedValue(null);

    await expect(generateAnnouncement('nonexistent')).rejects.toThrow('Pool not found');
  });
});

describe('runRelevanceCheck', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return true when LLM answers yes', async () => {
    mockChat.mockResolvedValue('Yes, this agent should contribute.');

    const result = await runRelevanceCheck('agent-1', 'business', 'market analysis', 'context');

    expect(result).toBe(true);
  });

  it('should return false when LLM answers no', async () => {
    mockChat.mockResolvedValue('No, not relevant.');

    const result = await runRelevanceCheck('agent-1', 'security', 'cooking tips', 'context');

    expect(result).toBe(false);
  });

  it('should return false on LLM error', async () => {
    mockChat.mockRejectedValue(new Error('LLM timeout'));

    const result = await runRelevanceCheck('agent-1', 'business', 'message', 'context');

    expect(result).toBe(false);
  });

  it('should handle case-insensitive yes responses', async () => {
    mockChat.mockResolvedValue('YES');
    expect(await runRelevanceCheck('a1', 'spec', 'msg', 'ctx')).toBe(true);

    mockChat.mockResolvedValue('  yes  ');
    expect(await runRelevanceCheck('a1', 'spec', 'msg', 'ctx')).toBe(true);
  });

  it('should return false for empty LLM response', async () => {
    mockChat.mockResolvedValue('');

    const result = await runRelevanceCheck('agent-1', 'business', 'message', 'context');
    expect(result).toBe(false);
  });
});

describe('generateConversationTitle', () => {
  beforeEach(() => vi.clearAllMocks());

  it('should return English title from full exchange', async () => {
    mockChat.mockResolvedValue('B2B Marketing Strategy');
    const result = await generateConversationTitle(
      'Analyze B2B marketing for startups',
      'Great topic! B2B marketing involves...'
    );
    expect(result).toBe('B2B Marketing Strategy');
  });

  it('should return null when AI returns NONE', async () => {
    mockChat.mockResolvedValue('NONE');
    const result = await generateConversationTitle('Hello', 'What topic?');
    expect(result).toBeNull();
  });

  it('should return null for case-insensitive NONE variants', async () => {
    mockChat.mockResolvedValue('none');
    expect(await generateConversationTitle('Hi', 'response')).toBeNull();

    mockChat.mockResolvedValue('  NONE  ');
    expect(await generateConversationTitle('Hi', 'response')).toBeNull();
  });

  it('should return null when LLM returns empty string', async () => {
    mockChat.mockResolvedValue('');
    const result = await generateConversationTitle('Hello', 'response');
    expect(result).toBeNull();
  });

  it('should strip surrounding quotes from title', async () => {
    mockChat.mockResolvedValue('"AI Strategy Discussion"');
    const result = await generateConversationTitle('AI strategy', 'response');
    expect(result).toBe('AI Strategy Discussion');
  });

  it('should return null when LLM throws (timeout or error)', async () => {
    mockChat.mockRejectedValue(new Error('timeout'));
    const result = await generateConversationTitle('topic', 'response');
    expect(result).toBeNull();
  });

  it('should work with user message only (no botReply)', async () => {
    mockChat.mockResolvedValue('AI Startup Strategy');
    const result = await generateConversationTitle('AI startup strategy analysis');
    expect(result).toBe('AI Startup Strategy');
    const callArg = mockChat.mock.calls[0][0];
    const userMsg = callArg.find((m: { role: string }) => m.role === 'user');
    expect(userMsg.content).not.toContain('Assistant:');
  });

  it('should truncate long botReply to 300 chars in context', async () => {
    mockChat.mockResolvedValue('Long Topic Title');
    const longReply = 'x'.repeat(500);
    await generateConversationTitle('topic', longReply);
    const callArg = mockChat.mock.calls[0][0];
    const userMsg = callArg.find((m: { role: string }) => m.role === 'user');
    expect(userMsg.content).toContain('x'.repeat(300));
    expect(userMsg.content).not.toContain('x'.repeat(301));
  });
});

describe('handleMeetingLoop', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRedis.set.mockResolvedValue('OK'); // Lock acquired
    mockRedis.del.mockResolvedValue(1);
    mockRedis.rpush.mockResolvedValue(1);
    mockRedis.llen.mockResolvedValue(0);
    mockRedis.lrange.mockResolvedValue([]);
    mockRedis.lpop.mockResolvedValue(null);
    mockRedis.hgetall.mockResolvedValue({});
  });

  it('should skip when lock cannot be acquired', async () => {
    mockRedis.set.mockResolvedValue(null); // Lock not acquired

    await handleMeetingLoop('pool-1');

    expect(Pool.findById).not.toHaveBeenCalled();
  });

  it('should clean up and return when pool not found', async () => {
    (Pool.findById as ReturnType<typeof vi.fn>).mockResolvedValue(null);

    await handleMeetingLoop('pool-1');

    // Should have cleared queue and stop detector
    expect(mockRedis.del).toHaveBeenCalled();
  });

  it('should clean up and return when pool is not active', async () => {
    (Pool.findById as ReturnType<typeof vi.fn>).mockResolvedValue({
      _id: 'pool-1',
      status: 'completed',
      agents: [],
    });

    await handleMeetingLoop('pool-1');

    // Lock should still be released
    expect(mockRedis.del).toHaveBeenCalledWith('lock:pool:pool-1');
  });

  it('should return early when no messages exist', async () => {
    (Pool.findById as ReturnType<typeof vi.fn>).mockResolvedValue({
      _id: 'pool-1',
      status: 'active',
      agents: [
        { agentId: 'agent-biz', name: 'Business', state: 'listening', icon: '💼', role: 'biz' },
      ],
    });

    // Message.find returns empty
    (Message.find as ReturnType<typeof vi.fn>).mockReturnValue({
      sort: vi.fn().mockReturnValue({
        limit: vi.fn().mockResolvedValue([]),
      }),
    });

    await handleMeetingLoop('pool-1');

    // Should not proceed to relevance checks
    expect(Agent.find).not.toHaveBeenCalled();
  });

  it('should perform full loop: relevance check → speak → broadcast', async () => {
    const poolData = {
      _id: 'pool-1',
      status: 'active',
      agents: [
        { agentId: 'agent-biz', name: 'Business', state: 'listening', icon: '💼', role: 'biz' },
        { agentId: 'agent-eng', name: 'Engineering', state: 'listening', icon: '⚙️', role: 'eng' },
      ],
    };

    (Pool.findById as ReturnType<typeof vi.fn>).mockResolvedValue(poolData);

    // Latest messages
    const latestMsg = { agentId: 'user', content: 'Discuss AI strategy', timestamp: new Date() };
    (Message.find as ReturnType<typeof vi.fn>).mockReturnValue({
      sort: vi.fn().mockReturnValue({
        limit: vi.fn().mockResolvedValue([latestMsg]),
      }),
    });

    // Queue has agent-biz ready to speak
    mockRedis.lpop.mockResolvedValue('agent-biz');

    // Agent docs
    (Agent.find as ReturnType<typeof vi.fn>).mockResolvedValue([
      mockAgents[0], // Business
      mockAgents[1], // Engineering
    ]);

    // Relevance check: Engineering wants to speak
    mockChat
      .mockResolvedValueOnce('yes') // relevance check for Engineering
      .mockResolvedValueOnce('This is a business perspective on AI strategy.'); // Business agent response

    // Stop detector: not ready to stop
    mockRedis.hgetall.mockResolvedValue({});

    await handleMeetingLoop('pool-1');

    // Verify agent spoke
    expect(poolService.addMessage).toHaveBeenCalledWith(
      'pool-1',
      expect.objectContaining({
        agentId: 'agent-biz',
        content: expect.any(String),
      })
    );

    // Verify broadcasts
    expect(broadcastService.broadcastAgentTyping).toHaveBeenCalledWith(
      'pool-1', 'agent-biz', 'Business', '💼', expect.any(String)
    );
    expect(broadcastService.broadcastAgentMessage).toHaveBeenCalled();
    expect(broadcastService.broadcastAgentDone).toHaveBeenCalledWith('pool-1', 'agent-biz');

    // Lock released
    expect(mockRedis.del).toHaveBeenCalledWith('lock:pool:pool-1');
  });

  it('should handle agent LLM failure gracefully', async () => {
    (Pool.findById as ReturnType<typeof vi.fn>).mockResolvedValue({
      _id: 'pool-1',
      status: 'active',
      agents: [
        { agentId: 'agent-biz', name: 'Business', state: 'listening', icon: '💼', role: 'biz' },
      ],
    });

    const latestMsg = { agentId: 'user', content: 'Test', timestamp: new Date() };
    (Message.find as ReturnType<typeof vi.fn>).mockReturnValue({
      sort: vi.fn().mockReturnValue({
        limit: vi.fn().mockResolvedValue([latestMsg]),
      }),
    });

    mockRedis.lpop.mockResolvedValue('agent-biz');

    (Agent.find as ReturnType<typeof vi.fn>).mockResolvedValue([mockAgents[0]]);

    // LLM fails
    mockChat.mockRejectedValue(new Error('LLM API timeout'));

    await handleMeetingLoop('pool-1');

    // Should broadcast error
    expect(broadcastService.broadcastError).toHaveBeenCalledWith(
      'pool-1',
      expect.stringContaining('Business')
    );

    // Agent should be set back to listening
    expect(poolService.updateAgentState).toHaveBeenCalledWith('pool-1', 'agent-biz', 'listening');
    expect(broadcastService.broadcastAgentDone).toHaveBeenCalledWith('pool-1', 'agent-biz');

    // Lock should still be released
    expect(mockRedis.del).toHaveBeenCalledWith('lock:pool:pool-1');
  });

  it('should always release lock even on unexpected errors', async () => {
    (Pool.findById as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('DB connection lost'));

    await expect(handleMeetingLoop('pool-1')).rejects.toThrow('DB connection lost');

    // Lock must be released
    expect(mockRedis.del).toHaveBeenCalledWith('lock:pool:pool-1');
  });

  it('should re-enqueue when queue is not empty after loop', async () => {
    (Pool.findById as ReturnType<typeof vi.fn>).mockResolvedValue({
      _id: 'pool-1',
      status: 'active',
      agents: [
        { agentId: 'agent-biz', name: 'Business', state: 'listening', icon: '💼', role: 'biz' },
      ],
    });

    const latestMsg = { agentId: 'user', content: 'Test', timestamp: new Date() };
    (Message.find as ReturnType<typeof vi.fn>).mockReturnValue({
      sort: vi.fn().mockReturnValue({
        limit: vi.fn().mockResolvedValue([latestMsg]),
      }),
    });

    mockRedis.lpop.mockResolvedValue('agent-biz');
    (Agent.find as ReturnType<typeof vi.fn>).mockResolvedValue([mockAgents[0]]);
    mockChat.mockResolvedValue('Response');

    // After the loop, queue still has items
    mockRedis.llen.mockResolvedValue(2);
    mockRedis.hgetall.mockResolvedValue({}); // stop signals not triggered

    await handleMeetingLoop('pool-1');

    // Should re-enqueue
    expect(mockRedis.rpush).toHaveBeenCalledWith(
      'queue:meeting-loop',
      expect.stringContaining('pool-1')
    );
  });
});
