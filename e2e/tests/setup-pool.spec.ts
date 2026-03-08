import { test, expect } from '@playwright/test';

test.describe('Setup Pool', () => {
  test('should show welcome screen on load', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByText('Welcome to')).toBeVisible();
    // Use heading role to uniquely target the title
    await expect(page.getByRole('heading', { name: /Welcome to Mindpool/i })).toBeVisible();
  });

  test('should navigate to setup when clicking CTA', async ({ page }) => {
    await page.goto('/');
    await page.click('text=Tạo Mindpool đầu tiên');
    await expect(page.getByPlaceholder(/Mô tả chủ đề/)).toBeVisible();
  });

  test('should show MindX greeting in setup chat', async ({ page }) => {
    await page.goto('/');
    await page.click('text=Tạo Mindpool đầu tiên');
    // Target the agent name label specifically (div with exact text)
    await expect(page.locator('div').filter({ hasText: /^MindX$/ }).first()).toBeVisible();
  });
});
