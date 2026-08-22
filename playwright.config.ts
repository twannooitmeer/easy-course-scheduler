import { defineConfig, devices } from '@playwright/test'

import 'dotenv/config'

export default defineConfig({
  testDir: './tests/e2e',
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:3001',
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'], channel: 'chromium' },
    },
  ],
  webServer: {
    command: 'pnpm dev',
    reuseExistingServer: true,
    url: 'http://localhost:3001',
    // Playwright merges `env` with the outer process's own env rather than
    // replacing it, so without this override the spawned `pnpm dev` inherits
    // NODE_OPTIONS="--import=tsx/esm" from the `test:e2e` npm script's own
    // cross-env wrapper -- that import hook is only meant for this test
    // runner's own TypeScript config file, but leaking into pnpm's own
    // process breaks its internal module resolution entirely (a spurious
    // ".pnpmfile.mjs not found" error). Only surfaces when Playwright has to
    // actually spawn the dev server itself rather than reuse one already
    // running on the port, which is why this went unnoticed until now.
    env: { PORT: '3001', NODE_OPTIONS: '--no-deprecation' },
  },
})
