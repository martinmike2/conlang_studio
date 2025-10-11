import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: './e2e',
  timeout: 30_000,
  globalSetup: require.resolve('./e2e/global-setup'),
  use: {
    baseURL: 'http://localhost:3001',
    headless: true,
    ignoreHTTPSErrors: true,
  },
  webServer: {
    command: 'OVERLAYS_DEV_FALLBACK=true pnpm --filter web dev',
    port: 3001,
    reuseExistingServer: true,
    timeout: 60_000,
  }
})
