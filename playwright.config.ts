import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: 'tests/e2e',
  timeout: 60_000,
  retries: process.env.CI ? 1 : 0,
  use: {
    baseURL: 'http://127.0.0.1:4173',
    viewport: { width: 1440, height: 900 },
    trace: 'retain-on-failure',
  },
  webServer: {
        // CI often sets VITE_BASE for GitHub Pages (e.g. "/<repo>/").
    // For E2E we always want a root-served app so assets resolve.
    command: 'VITE_BASE=/ VITE_E2E=1 npm run build && VITE_BASE=/ VITE_E2E=1 npm run preview -- --host 127.0.0.1 --port 4173',
    url: 'http://127.0.0.1:4173',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
