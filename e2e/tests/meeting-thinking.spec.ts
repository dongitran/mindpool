import { test, expect } from '@playwright/test';

// ── Shared mock data ──────────────────────────────────────────────────────────

const POOL_ID = 'test-pool-thinking';
const AGENT_ID = 'a1';
const AGENT_NAME = 'Business Strategist';
const AGENT_ICON = '💼';
const AGENT_ROLE = 'business strategy';

const mockPoolList = [
  { _id: POOL_ID, title: 'Thinking Test Pool', status: 'active', agents: [] },
];

const mockPoolDetail = {
  _id: POOL_ID,
  topic: 'Test Topic',
  status: 'active',
  agents: [
    { agentId: AGENT_ID, name: AGENT_NAME, role: AGENT_ROLE, state: 'listening' },
  ],
  messages: [],
  queue: [],
};

/**
 * Helper: set up route mocks for pool endpoints.
 */
async function mockPoolRoutes(page: import('@playwright/test').Page) {
  await page.route('**/api/pools', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ items: mockPoolList, nextCursor: null }),
    });
  });
  await page.route('**/api/conversations', async (route) => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ items: [], nextCursor: null }) });
  });
  await page.route(`**/api/pool/${POOL_ID}`, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(mockPoolDetail),
    });
  });
}

// ── Tests ─────────────────────────────────────────────────────────────────────

test.describe('Meeting Thinking Indicator', () => {
  test('should show thinking indicator when agent_thinking events arrive', async ({ page }) => {
    await mockPoolRoutes(page);

    // Inject MockEventSource that sends: agent_typing → agent_thinking
    await page.addInitScript(() => {
      const OriginalEventSource = window.EventSource;

      class MockEventSource {
        onmessage: ((ev: { data: string }) => void) | null = null;
        onerror: ((ev: unknown) => void) | null = null;
        private _timers: ReturnType<typeof setTimeout>[] = [];
        private _isMock = false;

        constructor(url: string) {
          if (url.includes(`/api/stream/test-pool-thinking`)) {
            this._isMock = true;

            // Event 1: agent starts typing
            this._timers.push(setTimeout(() => {
              this.onmessage?.({
                data: JSON.stringify({
                  type: 'agent_typing',
                  agentId: 'a1',
                  agentName: 'Business Strategist',
                  icon: '💼',
                  role: 'business strategy',
                }),
              });
            }, 200));

            // Event 2: thinking chunk arrives
            this._timers.push(setTimeout(() => {
              this.onmessage?.({
                data: JSON.stringify({
                  type: 'agent_thinking',
                  agentId: 'a1',
                  agentName: 'Business Strategist',
                  content: 'Analyzing market trends and competitive landscape...',
                  thinkSec: 2,
                }),
              });
            }, 500));
          } else {
            return new OriginalEventSource(url) as unknown as MockEventSource;
          }
        }

        close() {
          if (this._isMock) {
            this._timers.forEach((t) => clearTimeout(t));
            this._timers = [];
          }
        }
      }

      (window as unknown as Record<string, unknown>).EventSource = MockEventSource;
    });

    await page.goto('/');
    await page.getByText('Thinking Test Pool').click();

    // Assert: thinking indicator "Đang suy nghĩ..." should be visible
    await expect(
      page.getByText('Đang suy nghĩ...').first()
    ).toBeVisible({ timeout: 5000 });
  });

  test('should accumulate thinking content from multiple chunks', async ({ page }) => {
    await mockPoolRoutes(page);

    await page.addInitScript(() => {
      const OriginalEventSource = window.EventSource;

      class MockEventSource {
        onmessage: ((ev: { data: string }) => void) | null = null;
        onerror: ((ev: unknown) => void) | null = null;
        private _timers: ReturnType<typeof setTimeout>[] = [];
        private _isMock = false;

        constructor(url: string) {
          if (url.includes(`/api/stream/test-pool-thinking`)) {
            this._isMock = true;

            this._timers.push(setTimeout(() => {
              this.onmessage?.({
                data: JSON.stringify({
                  type: 'agent_typing',
                  agentId: 'a1', agentName: 'Business Strategist',
                  icon: '💼', role: 'business strategy',
                }),
              });
            }, 200));

            // Chunk 1
            this._timers.push(setTimeout(() => {
              this.onmessage?.({
                data: JSON.stringify({
                  type: 'agent_thinking',
                  agentId: 'a1', agentName: 'Business Strategist',
                  content: 'First chunk of thinking.',
                  thinkSec: 1,
                }),
              });
            }, 400));

            // Chunk 2
            this._timers.push(setTimeout(() => {
              this.onmessage?.({
                data: JSON.stringify({
                  type: 'agent_thinking',
                  agentId: 'a1', agentName: 'Business Strategist',
                  content: ' Second chunk of thinking.',
                  thinkSec: 3,
                }),
              });
            }, 600));
          } else {
            return new OriginalEventSource(url) as unknown as MockEventSource;
          }
        }

        close() {
          if (this._isMock) {
            this._timers.forEach((t) => clearTimeout(t));
            this._timers = [];
          }
        }
      }

      (window as unknown as Record<string, unknown>).EventSource = MockEventSource;
    });

    await page.goto('/');
    await page.getByText('Thinking Test Pool').click();

    // Wait for thinking indicator (isLive=true auto-opens the content)
    await expect(page.getByText('Đang suy nghĩ...').first()).toBeVisible({ timeout: 5000 });

    // Assert: accumulated thinking content visible (auto-expanded when isLive)
    await expect(
      page.getByText('First chunk of thinking. Second chunk of thinking.')
    ).toBeVisible({ timeout: 3000 });
  });

  test('should transition from thinking to content streaming', async ({ page }) => {
    await mockPoolRoutes(page);

    await page.addInitScript(() => {
      const OriginalEventSource = window.EventSource;

      class MockEventSource {
        onmessage: ((ev: { data: string }) => void) | null = null;
        onerror: ((ev: unknown) => void) | null = null;
        private _timers: ReturnType<typeof setTimeout>[] = [];
        private _isMock = false;

        constructor(url: string) {
          if (url.includes(`/api/stream/test-pool-thinking`)) {
            this._isMock = true;

            // Typing
            this._timers.push(setTimeout(() => {
              this.onmessage?.({
                data: JSON.stringify({
                  type: 'agent_typing',
                  agentId: 'a1', agentName: 'Business Strategist',
                  icon: '💼', role: 'business strategy',
                }),
              });
            }, 200));

            // Thinking chunk
            this._timers.push(setTimeout(() => {
              this.onmessage?.({
                data: JSON.stringify({
                  type: 'agent_thinking',
                  agentId: 'a1', agentName: 'Business Strategist',
                  content: 'Analyzing pricing models...',
                  thinkSec: 3,
                }),
              });
            }, 400));

            // Content chunk — thinking indicator should remain
            this._timers.push(setTimeout(() => {
              this.onmessage?.({
                data: JSON.stringify({
                  type: 'agent_chunk',
                  agentId: 'a1', agentName: 'Business Strategist',
                  icon: '💼',
                  chunk: 'Here is my pricing analysis: ',
                }),
              });
            }, 800));
          } else {
            return new OriginalEventSource(url) as unknown as MockEventSource;
          }
        }

        close() {
          if (this._isMock) {
            this._timers.forEach((t) => clearTimeout(t));
            this._timers = [];
          }
        }
      }

      (window as unknown as Record<string, unknown>).EventSource = MockEventSource;
    });

    await page.goto('/');
    await page.getByText('Thinking Test Pool').click();

    // Thinking indicator should appear during thinking phase
    await expect(page.getByText('Đang suy nghĩ...').first()).toBeVisible({ timeout: 5000 });

    // After content chunk arrives, thinking block should still be visible
    // AND streamed content should appear
    await expect(page.getByText('Here is my pricing analysis:').first()).toBeVisible({ timeout: 5000 });
    // ThinkingBlock should still be in the DOM (isLive on the typing message)
    await expect(page.getByText('Đang suy nghĩ...').first()).toBeVisible();
  });

  test('should preserve typing indicator after pool fetch resolves (race condition)', async ({ page }) => {
    // Bug: SSE replay adds typing indicator BEFORE pool fetch resolves.
    // When pool fetch resolves, setCurrentPool() wipes all messages → typing indicator vanishes.
    //
    // Timeline simulated:
    //   T+200ms  SSE: agent_typing → typing indicator appears in chat
    //   T+800ms  Pool API responds → setCurrentPool() → BUG: messages wiped
    //   T+900ms  Assert: typing indicator should STILL be visible

    await page.route('**/api/pools', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ items: mockPoolList, nextCursor: null }),
      });
    });
    await page.route('**/api/conversations', async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ items: [], nextCursor: null }) });
    });
    // DELAYED pool API response — simulates pool fetch resolving AFTER SSE events
    await page.route(`**/api/pool/${POOL_ID}`, async (route) => {
      await new Promise((r) => setTimeout(r, 800));
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockPoolDetail),
      });
    });

    await page.addInitScript(() => {
      const OriginalEventSource = window.EventSource;

      class MockEventSource {
        onmessage: ((ev: { data: string }) => void) | null = null;
        onerror: ((ev: unknown) => void) | null = null;
        private _timers: ReturnType<typeof setTimeout>[] = [];
        private _isMock = false;

        constructor(url: string) {
          if (url.includes(`/api/stream/test-pool-thinking`)) {
            this._isMock = true;

            // SSE replay: agent_typing arrives BEFORE pool fetch resolves
            this._timers.push(setTimeout(() => {
              this.onmessage?.({
                data: JSON.stringify({
                  type: 'agent_typing',
                  agentId: 'a1',
                  agentName: 'Business Strategist',
                  icon: '💼',
                  role: 'business strategy',
                }),
              });
            }, 200));
          } else {
            return new OriginalEventSource(url) as unknown as MockEventSource;
          }
        }

        close() {
          if (this._isMock) {
            this._timers.forEach((t) => clearTimeout(t));
            this._timers = [];
          }
        }
      }

      (window as unknown as Record<string, unknown>).EventSource = MockEventSource;
    });

    await page.goto('/');
    await page.getByText('Thinking Test Pool').click();

    // Step 1: typing indicator appears from SSE event
    await expect(page.getByText('đang phát biểu...').first()).toBeVisible({ timeout: 5000 });

    // Step 2: wait for pool fetch to complete (delayed 800ms)
    await page.waitForResponse((r) => r.url().includes(`/api/pool/${POOL_ID}`) && r.status() === 200);

    // Step 3: after pool loads, typing indicator must STILL be visible
    // BUG: setCurrentPool() wipes messages → typing indicator disappears
    await expect(page.getByText('đang phát biểu...').first()).toBeVisible({ timeout: 2000 });
  });

  test('should show ThinkingBlock with actual content on final message', async ({ page }) => {
    await mockPoolRoutes(page);

    await page.addInitScript(() => {
      const OriginalEventSource = window.EventSource;

      class MockEventSource {
        onmessage: ((ev: { data: string }) => void) | null = null;
        onerror: ((ev: unknown) => void) | null = null;
        private _timers: ReturnType<typeof setTimeout>[] = [];
        private _isMock = false;

        constructor(url: string) {
          if (url.includes(`/api/stream/test-pool-thinking`)) {
            this._isMock = true;

            // Typing
            this._timers.push(setTimeout(() => {
              this.onmessage?.({
                data: JSON.stringify({
                  type: 'agent_typing',
                  agentId: 'a1', agentName: 'Business Strategist',
                  icon: '💼', role: 'business strategy',
                }),
              });
            }, 100));

            // Thinking
            this._timers.push(setTimeout(() => {
              this.onmessage?.({
                data: JSON.stringify({
                  type: 'agent_thinking',
                  agentId: 'a1', agentName: 'Business Strategist',
                  content: 'Deep market reasoning about pricing...',
                  thinkSec: 5,
                }),
              });
            }, 300));

            // Content chunk
            this._timers.push(setTimeout(() => {
              this.onmessage?.({
                data: JSON.stringify({
                  type: 'agent_chunk',
                  agentId: 'a1', agentName: 'Business Strategist',
                  icon: '💼',
                  chunk: 'The optimal pricing strategy is...',
                }),
              });
            }, 500));

            // Final message — replaces typing with completed agent message
            this._timers.push(setTimeout(() => {
              this.onmessage?.({
                data: JSON.stringify({
                  type: 'agent_message',
                  agentId: 'a1', agentName: 'Business Strategist',
                  icon: '💼',
                  content: 'The optimal pricing strategy is to implement a tiered model.',
                  thinking: 'Deep market reasoning about pricing...',
                  thinkSec: 5,
                }),
              });
            }, 700));

            // Agent done
            this._timers.push(setTimeout(() => {
              this.onmessage?.({
                data: JSON.stringify({ type: 'agent_done', agentId: 'a1' }),
              });
            }, 800));
          } else {
            return new OriginalEventSource(url) as unknown as MockEventSource;
          }
        }

        close() {
          if (this._isMock) {
            this._timers.forEach((t) => clearTimeout(t));
            this._timers = [];
          }
        }
      }

      (window as unknown as Record<string, unknown>).EventSource = MockEventSource;
    });

    await page.goto('/');
    await page.getByText('Thinking Test Pool').click();

    // Wait for final message to render
    await expect(
      page.getByText('The optimal pricing strategy is to implement a tiered model.')
    ).toBeVisible({ timeout: 5000 });

    // ThinkingBlock should show "Thought for 5 seconds"
    await expect(page.getByText('Thought for 5 seconds')).toBeVisible({ timeout: 3000 });

    // Click to expand — should show actual thinking content
    await page.getByText('Thought for 5 seconds').click();
    await expect(
      page.getByText('Deep market reasoning about pricing...')
    ).toBeVisible({ timeout: 3000 });
  });
});
