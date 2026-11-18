import { defineConfig, devices } from '@playwright/test';

// Smoke tests of the built bundles (build/), the files customers load. Run `npm run build` first.
// Every request is answered or aborted inside the browser, so nothing reaches the network.
export default defineConfig({
  testDir: 'smoke',
  forbidOnly: Boolean(process.env.CI),
  retries: 0,
  reporter: process.env.CI ? [['github'], ['list']] : 'list',
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
});
