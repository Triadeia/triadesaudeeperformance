import { defineConfig, devices } from "@playwright/test";

/**
 * Triade Saude - E2E Test Configuration
 * Full-stack validation: Frontend <-> Supabase backend
 *
 * Requires .env.test with:
 *   - PLAYWRIGHT_BASE_URL (default: http://localhost:3000)
 *   - TEST_USER_A_EMAIL / TEST_USER_A_PASSWORD
 *   - TEST_USER_B_EMAIL / TEST_USER_B_PASSWORD (for RLS isolation tests)
 */

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false, // tasks tests touch shared DB rows - keep serial
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : 1,
  reporter: [["list"], ["html", { open: "never" }]],

  timeout: 30_000,
  expect: { timeout: 5_000 },

  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL || "http://localhost:3000",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },

  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],

  webServer: process.env.PLAYWRIGHT_NO_SERVER
    ? undefined
    : {
        command: "npm run dev",
        url: "http://localhost:3000",
        reuseExistingServer: !process.env.CI,
        timeout: 120_000,
      },
});
