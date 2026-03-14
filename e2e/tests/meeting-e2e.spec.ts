/**
 * Full Meeting E2E Test
 *
 * Tests the complete backend flow against a real running Docker stack:
 *   1. Health check
 *   2. Create conversation
 *   3. Send topic → MindX suggests agents (real LLM call)
 *   4. Create pool → meeting starts
 *   5. Poll until meeting completes with agent turns + wrapup (can take ~10-15 min)
 *   6. Verify final pool state
 *
 * Run:
 *   cd e2e && pnpm test:meeting
 *
 * Requires: Docker Compose stack running (mongodb, redis, server at :3001)
 * Guarded by MEETING_E2E=true — skipped by default in normal test runs.
 */

import { test, expect } from '@playwright/test';

// ── SSE helpers ─────────────────────────────────────────────────────────────

/** Parse all SSE lines and return data from the last 'done' event. */
function parseSSEDoneEvent(body: string): Record<string, unknown> | null {
  let last: Record<string, unknown> | null = null;
  for (const line of body.split('\n')) {
    if (!line.startsWith('data: ')) continue;
    try {
      const parsed = JSON.parse(line.slice(6)) as Record<string, unknown>;
      if (parsed.type === 'done' && parsed.conversation) {
        last = parsed.conversation as Record<string, unknown>;
      }
    } catch {
      // skip malformed lines
    }
  }
  return last;
}

// ── Test suite ───────────────────────────────────────────────────────────────

test.describe('Full Meeting E2E Flow', () => {
  test.describe.configure({ mode: 'serial' });

  let conversationId: string;
  let poolId: string;
  let agentIds: string[];

  test.beforeEach(() => {
    test.skip(!process.env.MEETING_E2E, 'Set MEETING_E2E=true to run full meeting e2e tests');
  });

  // ── 1. Health ─────────────────────────────────────────────────────────────
  test('1. Server health check', async ({ request }) => {
    const res = await request.get('/health');
    expect(res.ok(), 'Server should be healthy').toBeTruthy();

    const data = (await res.json()) as Record<string, string>;
    expect(data.status).toBe('ok');
    expect(data.db).toBe('connected');
    expect(data.redis).toBe('connected');
  });

  // ── 2. Create conversation ────────────────────────────────────────────────
  test('2. Create conversation', async ({ request }) => {
    const res = await request.post('/api/conversations');
    expect(res.status()).toBe(201);

    const data = (await res.json()) as Record<string, unknown>;
    expect(typeof data._id).toBe('string');
    expect(data.title).toBe('Cuộc trò chuyện mới');

    const messages = data.messages as unknown[];
    expect(messages).toHaveLength(1); // initial MindX greeting

    conversationId = data._id as string;
  });

  // ── 3. Send topic → agent suggestions ────────────────────────────────────
  test('3. Send topic message → MindX returns agent suggestions', async ({ request }) => {
    test.setTimeout(180_000); // LLM streaming can be slow

    const res = await request.post(`/api/conversations/${conversationId}/message`, {
      data: {
        content:
          'Tôi muốn thảo luận chiến lược định giá (pricing strategy) cho một SaaS B2B tại thị trường Việt Nam',
      },
      timeout: 120_000, // individual request timeout — LLM streaming takes time
    });
    expect(res.ok(), 'POST /api/conversations/:id/message should succeed').toBeTruthy();

    const body = await res.text();

    // SSE stream must end with a 'done' event containing the full conversation
    const conversation = parseSSEDoneEvent(body);
    expect(conversation, 'SSE stream must contain a done event').not.toBeNull();

    const messages = conversation!.messages as Array<Record<string, unknown>>;

    // User message persisted
    const userMsg = messages.find((m) => m.type === 'user');
    expect(userMsg, 'User message should be saved').toBeDefined();

    // MindX should have replied with agent suggestions for a clear topic
    const agentsMsg = messages.find((m) => m.type === 'bot-agents');
    if (!agentsMsg) {
      // Fallback: LLM might have replied without [READY] tag — log and skip
      const botMsg = messages.find((m) => m.type === 'bot');
      console.warn(
        '[Meeting E2E] MindX did not return bot-agents. Bot reply:',
        botMsg ? (botMsg.content as string).slice(0, 200) : '<none>',
      );
      test.skip(true, 'LLM did not produce agent suggestions — retry or check LLM health');
      return;
    }

    const agents = agentsMsg.agents as Array<Record<string, unknown>>;
    expect(agents.length, 'At least 2 agents should be suggested').toBeGreaterThanOrEqual(2);

    agentIds = agents.map((a) => a.agentId as string);
    console.log(`[Meeting E2E] Agents suggested: ${agentIds.length} agents`);
  });

  // ── 4. Create pool ────────────────────────────────────────────────────────
  test('4. Create pool → meeting starts', async ({ request }) => {
    test.setTimeout(60_000);

    const TOPIC = 'Chiến lược định giá SaaS B2B Việt Nam';

    const res = await request.post('/api/pool/create', {
      data: {
        topic: TOPIC,
        agentIds,
        conversationId,
      },
      timeout: 30_000, // announcement + opening agent selection
    });
    expect(res.status(), 'POST /api/pool/create should return 201').toBe(201);

    const pool = (await res.json()) as Record<string, unknown>;
    expect(typeof pool._id).toBe('string');
    expect(pool.status).toBe('active');
    expect(pool.topic).toBe(TOPIC);

    const poolAgents = pool.agents as unknown[];
    expect(poolAgents).toHaveLength(agentIds.length);

    poolId = pool._id as string;
    console.log(`[Meeting E2E] Pool created: ${poolId}`);
  });

  // ── 5. Meeting completes ──────────────────────────────────────────────────
  test('5. Meeting runs to completion — agent turns + wrapup', async ({ request }) => {
    test.setTimeout(900_000); // 15 min upper bound

    const POLL_INTERVAL_MS = 15_000; // poll every 15s
    const MAX_WAIT_MS = 900_000;
    const startMs = Date.now();
    let poolData: Record<string, unknown> | null = null;
    let lastMsgCount = 0;

    while (Date.now() - startMs < MAX_WAIT_MS) {
      await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));

      const res = await request.get(`/api/pool/${poolId}`);
      expect(res.ok()).toBeTruthy();
      poolData = (await res.json()) as Record<string, unknown>;

      const status = poolData.status as string;
      const msgs = poolData.messages as unknown[];
      const msgCount = msgs.length;

      if (msgCount !== lastMsgCount) {
        const elapsed = Math.round((Date.now() - startMs) / 1000);
        console.log(`[Meeting] status=${status} messages=${msgCount} elapsed=${elapsed}s`);
        lastMsgCount = msgCount;
      }

      if (status === 'completed') break;
    }

    expect(poolData, 'Pool data should be available').not.toBeNull();
    expect(poolData!.status, 'Meeting should complete within 15 minutes').toBe('completed');

    const messages = poolData!.messages as Array<Record<string, unknown>>;

    // Agent messages (not mindx, not user)
    const agentMsgs = messages.filter((m) => m.agentId !== 'mindx' && m.agentId !== 'user');
    expect(agentMsgs.length, 'At least 2 agent turns should have happened').toBeGreaterThanOrEqual(2);

    // Log unique speakers
    const speakers = [...new Set(agentMsgs.map((m) => m.agentId as string))];
    console.log(`[Meeting] Completed. ${agentMsgs.length} agent turns from ${speakers.length} unique agents`);

    // Wrapup message must exist with real content
    const wrapupMsg = messages.find(
      (m) => m.agentId === 'mindx' && typeof m.content === 'string' && m.content.includes('Tổng kết'),
    );
    expect(wrapupMsg, 'Wrapup (Tổng kết) message should be generated by MindX').toBeDefined();
    expect(
      (wrapupMsg!.content as string).length,
      'Wrapup content should be substantial (>100 chars)',
    ).toBeGreaterThan(100);
    console.log(`[Meeting] Wrapup length: ${(wrapupMsg!.content as string).length} chars`);
  });

  // ── 6. Final state verification ───────────────────────────────────────────
  test('6. Verify final pool state and message integrity', async ({ request }) => {
    const res = await request.get(`/api/pool/${poolId}`);
    expect(res.ok()).toBeTruthy();
    const pool = (await res.json()) as Record<string, unknown>;

    expect(pool.status).toBe('completed');

    const messages = pool.messages as Array<Record<string, unknown>>;

    // Must have: opening announcement + agent turns + wrapup
    expect(messages.length, 'Pool should have at least 4 messages').toBeGreaterThan(3);

    // First message: MindX opening announcement
    const firstMsg = messages[0];
    expect(firstMsg.agentId).toBe('mindx');
    expect(firstMsg.content as string).toContain('MindX');

    // Last message: MindX wrapup (Tổng kết)
    const lastMsg = messages[messages.length - 1];
    expect(lastMsg.agentId).toBe('mindx');
    expect(lastMsg.content as string).toContain('Tổng kết');

    // All message agentIds must be either 'mindx', 'user', or a pool agent
    const validAgentIds = new Set<string>([
      'mindx',
      'user',
      ...(pool.agents as Array<Record<string, string>>).map((a) => a.agentId),
    ]);
    for (const msg of messages) {
      expect(
        validAgentIds.has(msg.agentId as string),
        `Message from "${msg.agentId}" must belong to this pool`,
      ).toBeTruthy();
    }

    // All non-user messages should have non-empty content
    for (const msg of messages) {
      if (msg.agentId !== 'user') {
        expect(
          (msg.content as string).length,
          `Message from ${msg.agentId} should not be empty`,
        ).toBeGreaterThan(0);
      }
    }

    // Pool agents should all be back to listening state after meeting
    const busyAgents = (pool.agents as Array<Record<string, string>>).filter(
      (a) => a.state === 'speaking' || a.state === 'queued',
    );
    expect(busyAgents.length, 'No agents should be speaking/queued after completion').toBe(0);

    console.log(`[Meeting E2E] All assertions passed. ${messages.length} total messages.`);
  });
});
