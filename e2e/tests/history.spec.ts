import { test, expect } from '@playwright/test';

test.describe('History', () => {
  test('should show history screen when clicking All Pools', async ({ page }) => {
    await page.goto('/');
    await page.click('text=All Pools');
    await expect(page.getByText('Your Mindpools')).toBeVisible();
  });
});
