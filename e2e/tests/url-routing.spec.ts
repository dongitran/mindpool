import { test, expect } from '@playwright/test';

const MOCK_POOL = {
  _id: 'abc123def456',
  title: 'URL Test Pool',
  status: 'active',
  agents: [{ agentId: 'a1', name: 'Agent 1', icon: '🤖', role: 'Tester', state: 'listening' }],
  duration: 0,
  updatedAt: new Date().toISOString(),
};

const MOCK_CONVERSATION = {
  _id: 'conv789abc012',
  title: 'URL Test Conversation',
  sub: 'Test',
};

function setupMocks(page: import('@playwright/test').Page) {
  return Promise.all([
    page.route('**/api/pools', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ items: [MOCK_POOL], nextCursor: null }),
      });
    }),
    page.route('**/api/conversations', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ items: [MOCK_CONVERSATION], nextCursor: null }),
      });
    }),
    page.route(`**/api/pool/${MOCK_POOL._id}`, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          ...MOCK_POOL,
          topic: 'URL Test Topic',
          messages: [],
          queue: [],
        }),
      });
    }),
  ]);
}

function mockSSE(page: import('@playwright/test').Page, poolId: string) {
  return page.addInitScript((id) => {
    const OriginalEventSource = window.EventSource;
    class MockEventSource {
      onmessage: ((ev: any) => void) | null = null;
      onerror: ((ev: any) => void) | null = null;
      private _mock: boolean;
      constructor(url: string) {
        if (url.includes(`/api/stream/${id}`)) {
          this._mock = true;
          setTimeout(() => {
            if (this.onmessage) {
              this.onmessage({ data: JSON.stringify({ type: 'connected', poolId: id }) });
            }
          }, 50);
        } else {
          this._mock = false;
          return new OriginalEventSource(url) as any;
        }
      }
      close() {}
    }
    (window as any).EventSource = MockEventSource;
  }, poolId);
}

test.describe('URL Routing', () => {
  test('click New Pool → URL becomes /chat/new', async ({ page }) => {
    await setupMocks(page);
    await page.goto('/');
    await page.getByText('New Pool').click();
    await expect(page).toHaveURL(/\/chat\/new$/);
  });

  test('click pool in sidebar → URL becomes /meeting/${id}', async ({ page }) => {
    await setupMocks(page);
    await mockSSE(page, MOCK_POOL._id);
    await page.goto('/');
    await page.getByText('URL Test Pool').click();
    await expect(page).toHaveURL(new RegExp(`/meeting/${MOCK_POOL._id}$`));
  });

  test('direct navigation to /meeting/${id} → loads meeting', async ({ page }) => {
    await setupMocks(page);
    await mockSSE(page, MOCK_POOL._id);
    await page.goto(`/meeting/${MOCK_POOL._id}`);
    // Meeting screen should load — check for pool title in main content area
    await expect(page.getByRole('main').getByText('URL Test Pool')).toBeVisible({ timeout: 5000 });
  });

  test('F5 reload at /meeting/${id} → stays on meeting', async ({ page }) => {
    await setupMocks(page);
    await mockSSE(page, MOCK_POOL._id);
    await page.goto(`/meeting/${MOCK_POOL._id}`);
    await expect(page.getByRole('main').getByText('URL Test Pool')).toBeVisible({ timeout: 5000 });
    // Reload
    await page.reload();
    await expect(page).toHaveURL(new RegExp(`/meeting/${MOCK_POOL._id}$`));
    await expect(page.getByRole('main').getByText('URL Test Pool')).toBeVisible({ timeout: 5000 });
  });

  test('browser back from /meeting/${id} → returns to /', async ({ page }) => {
    await setupMocks(page);
    await mockSSE(page, MOCK_POOL._id);
    // Start at welcome
    await page.goto('/');
    await expect(page).toHaveURL(/\/$/);
    // Navigate to meeting via sidebar click
    await page.getByText('URL Test Pool').click();
    await expect(page).toHaveURL(new RegExp(`/meeting/${MOCK_POOL._id}$`));
    // Go back
    await page.goBack();
    await expect(page).toHaveURL(/\/$/);
  });
});
