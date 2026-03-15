import { test, expect } from '@playwright/test';
import { WelcomePage, SetupPage } from '../pages/SetupPoolPage';

test.describe('Setup Pool', () => {
  test.beforeEach(async ({ page }) => {
    // Mock global API responses to isolate frontend behavior
    await page.route('**/api/conversations', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ items: [], nextCursor: null }),
      });
    });

    await page.route('**/api/pools', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ items: [], nextCursor: null }),
      });
    });
  });

  test('should show welcome screen on load', async ({ page }) => {
    const welcomePage = new WelcomePage(page);
    await welcomePage.goto('/');
    await expect(welcomePage.welcomeHeading).toBeVisible();
  });

  test('should navigate to setup when clicking CTA', async ({ page }) => {
    const welcomePage = new WelcomePage(page);
    const setupPage = new SetupPage(page);
    await welcomePage.goto('/');
    await welcomePage.clickCreatePool();
    await expect(setupPage.topicInput).toBeVisible();
  });

  test('should show MindX greeting in setup chat', async ({ page }) => {
    const welcomePage = new WelcomePage(page);
    const setupPage = new SetupPage(page);
    await welcomePage.goto('/');
    await welcomePage.clickCreatePool();
    await expect(setupPage.greetingAgent).toBeVisible();
  });
});
