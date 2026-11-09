// End-to-end tests against the production server serving the sample build (npm run build:sample).
// Two servers: one at / on port 8095 and one under BASE_PATH=/h2 on port 8096. No network needed.
import { defineConfig, devices } from '@playwright/test';
import path from 'node:path';

// Browsers live in a git-ignored folder inside the project (npx playwright install chromium-headless-shell).
process.env.PLAYWRIGHT_BROWSERS_PATH ??= path.join(import.meta.dirname, '.bin', 'ms-playwright');

const server = (port: number, base: string) => ({
  command: 'node server/main.mjs',
  url: `http://localhost:${port}${base}/healthz`,
  reuseExistingServer: false,
  env: { ADDR: `127.0.0.1:${port}`, DIST_DIR: 'dist-sample', DB_PATH: ':memory:', BASE_PATH: base, ALLOWED_HOSTS: 'localhost' },
  stdout: 'ignore' as const,
});

export default defineConfig({
  testDir: 'tests/e2e',
  // One learner, one server copy: tests run one after another and reset the state first.
  workers: 1,
  fullyParallel: false,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    baseURL: 'http://localhost:8095',
    trace: 'retain-on-failure',
    ...devices['Desktop Chrome'],
  },
  webServer: [server(8095, ''), server(8096, '/h2')],
});
