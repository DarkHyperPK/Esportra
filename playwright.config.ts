import { defineConfig, devices } from '@playwright/test';
import { loadE2eEnv } from './e2e/helpers/env';

loadE2eEnv();

const baseURL = process.env.BASE_URL || 'http://localhost:3000';
const liveBaseURL = process.env.E2E_STAGING_BASE_URL?.replace(/\/$/, '') || baseURL;

const desktopViewport = { width: 1440, height: 900 };
const tabletViewport = { width: 768, height: 1024 };

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: 'list',
  timeout: 180_000,
  expect: { timeout: 10_000 },
  use: {
    baseURL,
    headless: process.env.CI ? true : false,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    actionTimeout: 15_000,
    navigationTimeout: 30_000,
    launchOptions: {
      slowMo: process.env.PW_SLOW_MO ? Number(process.env.PW_SLOW_MO) : 0,
    },
  },
  projects: [
    {
      name: 'chromium',
      testIgnore: [/ui-refresh/],
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'chromium-desktop',
      grep: /@ui-refresh-desktop/,
      use: {
        ...devices['Desktop Chrome'],
        viewport: desktopViewport,
      },
    },
    {
      name: 'firefox-desktop',
      grep: /@ui-refresh-desktop/,
      use: {
        ...devices['Desktop Firefox'],
        viewport: desktopViewport,
      },
    },
    {
      name: 'webkit-desktop',
      grep: /@ui-refresh-desktop/,
      use: {
        ...devices['Desktop Safari'],
        viewport: desktopViewport,
      },
    },
    {
      name: 'tablet',
      grep: /@ui-refresh-responsive/,
      use: {
        ...devices['Desktop Chrome'],
        viewport: tabletViewport,
        hasTouch: true,
      },
    },
    {
      name: 'mobile',
      grep: /@ui-refresh-responsive/,
      use: {
        ...devices['Pixel 5'],
        viewport: { width: 390, height: 844 },
      },
    },
    {
      name: 'live-smoke',
      grep: /@ui-refresh-live/,
      use: {
        ...devices['Pixel 5'],
        baseURL: liveBaseURL,
        viewport: { width: 390, height: 844 },
      },
    },
  ],
});
