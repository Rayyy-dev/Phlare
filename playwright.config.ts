import { defineConfig, devices } from "@playwright/test";

/**
 * E2E config. Assumes the full stack is already running (web on baseURL, worker,
 * postgres, redis, mailpit) — e.g. `docker compose up` or `npm run dev` +
 * `npm run worker`. The happy-path spec drives the admin UI and then exercises
 * the public tracking routes.
 */
export default defineConfig({
  testDir: "./tests/e2e",
  timeout: 60_000,
  // Generous expect timeout so server-action redirects survive dev-mode
  // first-compile latency.
  expect: { timeout: 15_000 },
  fullyParallel: false,
  workers: 1,
  retries: 0,
  use: {
    baseURL: process.env.APP_BASE_URL ?? "http://localhost:3000",
    trace: "retain-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
});
