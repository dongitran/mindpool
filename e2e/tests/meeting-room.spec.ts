import { test, expect } from '@playwright/test';

test.describe('Meeting Room - Event Driven States', () => {
  test('should mock SSE stream and assert realistic DOM updates', async ({ page }) => {
    // 1. Mock global list endpoints for the Sidebar
    await page.route('**/api/pools', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          { _id: 'test-pool-123', title: 'Mock Testing Pool', status: 'active', agents: [] }
        ]),
      });
    });

    await page.route('**/api/conversations', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([]),
      });
    });

    // 2. Mock the specific pool initial data fetch
    await page.route('**/api/pool/test-pool-123', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          _id: 'test-pool-123',
          topic: 'Mock Testing Pool Topic',
          status: 'active',
          agents: [
            { agentId: 'a1', name: 'Mock Agent 1', role: 'Tester', state: 'listening' },
          ],
          messages: [],
          queue: []
        }),
      });
    });

    const ssePayload = {
      type: 'agent_typing',
      agentId: 'a1',
      agentName: 'Mock Agent 1',
      icon: '🧠',
      role: 'Tester'
    };

    // 3. Inject a fake EventSource behavior into window BEFORE page scripts execute
    await page.addInitScript((payload) => {
      const OriginalEventSource = window.EventSource;

      class MockEventSource {
        onmessage: ((ev: any) => void) | null = null;
        onerror: ((ev: any) => void) | null = null;
        private _timerId: ReturnType<typeof setInterval> | null = null;
        private _isMock: boolean = false;
        private _originalInstance: any = null;

        constructor(url: string) {
          // Verify URL: Mock only the specific pool stream, fallback to Native EventSource otherwise
          if (url.includes('/api/stream/test-pool-123')) {
            this._isMock = true;
            this._timerId = setInterval(() => {
              if (this.onmessage) {
                this.onmessage({ data: JSON.stringify(payload) });
              }
            }, 500);
          } else {
            // Return actual Native EventSource if URLs don't match the mock condition
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            return new OriginalEventSource(url) as any;
          }
        }

        close() {
          if (this._isMock && this._timerId) {
            // Solve Memory Leak Issue: Ensure intervals are flushed when React unmounts
            clearInterval(this._timerId);
            this._timerId = null;
          }
        }
      }

      (window as any).EventSource = MockEventSource;
    }, ssePayload);

    // 4. Navigate to the root to load the app (WelcomeScreen + Sidebar)
    await page.goto('/');

    // 5. Click the meeting item in the Sidebar to navigate to MeetingScreen
    await page.getByText('Mock Testing Pool').click();

    // 6. Active Assertion: Evaluate if the UI updates to show the typing indicator
    // Using .first() because strict mode throws if there are >1 elements due to interval triggers
    await expect(page.getByText('đang phát biểu...').first()).toBeVisible({ timeout: 5000 });
    await expect(page.locator('.animate-msg-in').filter({ hasText: 'Mock Agent 1' }).first()).toBeVisible();
  });
});
