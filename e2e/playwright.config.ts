import { defineConfig } from '@playwright/test';

// When BASE_URL is set, tests run against an already-running stack (docker compose).
// Otherwise, playwright spins up the dev server automatically.
const BASE_URL = process.env.BASE_URL ?? 'http://localhost:5173';
const useExternalServer = !!process.env.BASE_URL;

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL: BASE_URL,
    trace: 'on-first-retry',
  },
  ...(useExternalServer
    ? {}
    : {
        webServer: {
          command: 'pnpm dev',
          url: 'http://localhost:5173',
          reuseExistingServer: !process.env.CI,
          cwd: '../',
        },
      }),
});
