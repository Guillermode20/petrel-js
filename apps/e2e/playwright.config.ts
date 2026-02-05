import { defineConfig, devices } from "@playwright/test";

/**
 * Playwright configuration for Petrel E2E tests
 *
 * @see https://playwright.dev/docs/test-configuration
 */
export default defineConfig({
  testDir: "./tests",

  /* Run tests in files in parallel */
  fullyParallel: true,

  /* Fail the build on CI if you accidentally left test.only in the source code */
  forbidOnly: !!process.env.CI,

  /* Retry on CI only */
  retries: process.env.CI ? 2 : 0,

  /* Opt out of parallel tests on CI for stability */
  workers: process.env.CI ? 1 : undefined,

  /* Reporter to use */
  reporter: [
    ["html", { open: "never" }],
    ["list"],
  ],

  /* Shared settings for all the projects below */
  use: {
    /* Base URL to use in actions like `await page.goto('/')` */
    baseURL: process.env.FRONTEND_URL || "http://localhost:3000",

    /* Backend API URL for direct API calls in tests */
    apiBaseURL: process.env.BACKEND_URL || "http://localhost:3001",

    /* Collect trace when retrying the failed test */
    trace: "on-first-retry",

    /* Capture screenshot on failure */
    screenshot: "only-on-failure",

    /* Record video on failure */
    video: "on-first-retry",
  },

  /* Configure projects for major browsers */
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "firefox",
      use: { ...devices["Desktop Firefox"] },
    },
    {
      name: "webkit",
      use: { ...devices["Desktop Safari"] },
    },
    /* Test against mobile viewports */
    {
      name: "Mobile Chrome",
      use: { ...devices["Pixel 5"] },
    },
    {
      name: "Mobile Safari",
      use: { ...devices["iPhone 12"] },
    },
  ],

  /* Run local dev server before starting the tests */
  webServer: [
    {
      command: "bun run --filter backend dev",
      url: "http://localhost:3001/api",
      reuseExistingServer: true,
      timeout: 120000,
    },
    {
      command: "bun run --filter frontend dev",
      url: "http://localhost:3000",
      reuseExistingServer: true,
      timeout: 120000,
    },
  ],
});
