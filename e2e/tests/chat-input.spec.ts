import { test, expect } from '@playwright/test';

test.describe('Chat Input Integration', () => {
  test('should allow user to type and send a setup message successfully', async ({ page }) => {
    // 1. Visit the app
    page.on('console', msg => console.log('BROWSER LOG:', msg.text()));
    await page.goto('http://localhost:3000/');

    // 2. Click "Tạo Mindpool đầu tiên" to navigate to setup screen
    await page.click('text=✦ Tạo Mindpool đầu tiên');

    // Wait for the setup screen to be visible
    await expect(page.locator('text=Mô tả chủ đề — AI sẽ gợi ý agents phù hợp')).toBeVisible();

    // 3. Find the chat textarea and type a message
    const chatInput = page.locator('textarea[placeholder="Mô tả chủ đề bạn muốn thảo luận..."]');
    const testMessage = 'Hello from E2E test, please help me setup a pool.';
    
    // We use fill to type text into the input
    await chatInput.fill(testMessage);

    // 4. Click the send button (up arrow `↑`)
    const sendButton = page.locator('button', { hasText: '↑' });
    await sendButton.click();

    // 5. Verify the message input is cleared
    await expect(chatInput).toHaveValue('');

    // 6. Verify the user message appears in the chat feed
    await expect(page.locator(`text=${testMessage}`)).toBeVisible();

    // 7. Verify the AI response appears in the chat feed
    // Wait for the typing indicator to disappear and response to show
    // We expect the bot to reply with something, we can check for a generic text or just count bot messages
    await expect(page.locator('.animate-msg-in').nth(2)).toBeVisible({ timeout: 15000 }); // At least 2 messages (greeting + response)
  });
});
