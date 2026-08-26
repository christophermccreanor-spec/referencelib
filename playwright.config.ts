import { defineConfig, devices } from "@playwright/test";

// End-to-end smoke coverage for the flows a unit test can't see: real
// browser rendering, client-side state, and the actual click-through path
// a student takes. Runs against a production build (next start), not the
// dev server, so this catches the same class of thing a manual click-
// through on the live site would catch. Kept intentionally small (a
// handful of smoke checks, not full coverage) so it stays fast and does
// not become its own source of CI flakiness.
export default defineConfig({
  testDir: "./tests/e2e",
  timeout: 30_000,
  expect: { timeout: 10_000 },
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? "list" : "html",
  use: {
    baseURL: "http://127.0.0.1:3100",
    trace: "retain-on-failure",
  },
  webServer: {
    command: "npm run start -- -p 3100",
    url: "http://127.0.0.1:3100",
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
});
