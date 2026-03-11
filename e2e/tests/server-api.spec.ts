import { test, expect } from '@playwright/test';

test.describe.serial('Server API Endpoints', () => {
  let conversationId: string;
  let poolId: string;

  test('POST /api/conversations should create a new conversation', async ({ request }) => {
    const response = await request.post('/api/conversations', {
      data: { title: 'Test Conversation' }
    });
    expect(response.ok()).toBeTruthy();
    
    const data = await response.json();
    expect(data).toHaveProperty('_id');
    expect(data).toHaveProperty('messages');
    expect(data.messages).toBeInstanceOf(Array);
    expect(data.title).toBe('Test Conversation');
    
    // Save for next test
    conversationId = data._id;
  });

  test('POST /api/conversations/:id/message should send user message and return bot response with agent suggestions', async ({ request }) => {
    test.setTimeout(120000); // LLM processing can take a while
    test.skip(!conversationId, 'Needs conversationId from previous test');
    
    const response = await request.post(`/api/conversations/${conversationId}/message`, {
      data: { content: 'Tôi đang tìm hiểu Next.js và React' }
    });
    
    expect(response.ok()).toBeTruthy();
    const data = await response.json();
    expect(data).toHaveProperty('messages');
    
    // Find the bot-agents message which indicates LLM analyzed and returned agent suggestions
    const aiMessages = data.messages.filter((m: any) => m.type === 'bot' || m.type === 'bot-agents');
    expect(aiMessages.length).toBeGreaterThan(0);
    
    const agentsMessage = data.messages.find((m: any) => m.type === 'bot-agents');
    // If LLM returned agents, save poolId (meetingId)
    if (agentsMessage && agentsMessage.meetingId) {
      poolId = agentsMessage.meetingId;
    }
  });



  test('GET /api/pool/:id should fetch a valid pool detail (Meeting Room)', async ({ request }) => {
    test.skip(!poolId, 'Needs poolId from previous tests');
    
    const response = await request.get(`/api/pool/${poolId}`);
    expect(response.ok()).toBeTruthy();
    
    const data = await response.json();
    expect(data).toHaveProperty('_id', poolId);
    expect(data).toHaveProperty('topic');
    expect(data).toHaveProperty('status');
  });
});
