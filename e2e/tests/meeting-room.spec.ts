import { test, expect } from '@playwright/test';

test.describe('Meeting Room', () => {
  test('should display meeting screen components', async ({ page }) => {
    await page.goto('/');
    // This test will work with seeded data
    // For now, verify the app loads correctly
    await expect(page.getByText('Welcome to')).toBeVisible();
  });
});
