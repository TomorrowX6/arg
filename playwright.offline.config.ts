import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './tests/offline',
  fullyParallel: false,
  timeout: 90000,
  expect: { timeout: 15000 },
  retries: process.env.CI ? 1 : 0,
  reporter: [['list'], ['html', { open: 'never', outputFolder: 'playwright-report/offline' }]],
  use: {
    baseURL: 'http://127.0.0.1:4174/arg/',
    ...devices['Desktop Chrome'],
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  webServer: {
    command: 'npm run preview -- --host 127.0.0.1 --port 4174 --strictPort --base /arg/',
    url: 'http://127.0.0.1:4174/arg/',
    reuseExistingServer: !process.env.CI,
    timeout: 30000,
  },
})
