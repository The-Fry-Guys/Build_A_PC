import { defineConfig, devices } from '@playwright/test';

/** Runs isolated admin acceptance tests without contacting OAuth providers. */
export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  timeout: 120_000,
  expect: { timeout: 10_000 },
  use: { baseURL: 'http://localhost:8081', trace: 'retain-on-failure' },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: 'npx expo start --web --port 8081',
    url: 'http://localhost:8081',
    reuseExistingServer: false,
    timeout: 120_000,
    env: { EXPO_NO_DOTENV: '1', EXPO_PUBLIC_API_URL: 'http://127.0.0.1:8080/api/v1', CI: '1' },
  },
});
