import { defineConfig, devices } from "@playwright/test";
import path from "node:path";
import { fileURLToPath } from "node:url";

/**
 * Playwright configuration for Petrel E2E tests
 *
 * @see https://playwright.dev/docs/test-configuration
 */
const currentFilePath = fileURLToPath(import.meta.url);
const currentDirectoryPath = path.dirname(currentFilePath);
const repoRootPath = path.resolve(currentDirectoryPath, "..", "..", "..");

export default defineConfig({
  testDir: "./tests",
  
  /* Global setup to clean database before tests */
  globalSetup: "./global-setup.ts",

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

  /* Global timeout for each test */
  timeout: 60000,

  expect: {
    /* Timeout for expect assertions */
    timeout: 10000,
  },

  /* Shared settings for all the projects below */
  use: {
    /* Base URL to use in actions like `await page.goto('/')` */
    baseURL: process.env.FRONTEND_URL || "http://localhost:3000",

    /* Collect trace when retrying the failed test */
    trace: "on-first-retry",

    /* Capture screenshot on failure */
    screenshot: "only-on-failure",

    /* Record video on failure */
    video: "on-first-retry",

    /* Action timeout */
    actionTimeout: 15000,
  },

  /* Configure projects for major browsers */
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
    // Other browsers can be enabled for CI
    ...(process.env.CI
      ? [
          {
            name: "firefox",
            use: { ...devices["Desktop Firefox"] },
          },
          {
            name: "webkit",
            use: { ...devices["Desktop Safari"] },
          },
        ]
      : []),
  ],

  /* Run local dev server before starting the tests
   * Set SKIP_WEBSERVER=true to skip automatic server startup and run servers manually
   */
  webServer: process.env.SKIP_WEBSERVER
    ? undefined
    : [
        {
          command: "bun --env-file=.env.e2e run dev",
          cwd: path.join(repoRootPath, "apps", "backend"),
          url: "http://localhost:4000/api/hello",
          reuseExistingServer: true,
          timeout: 120000,
        },
        {
          command: "bun run dev",
          cwd: path.join(repoRootPath, "apps", "frontend"),
          url: "http://localhost:3000",
          reuseExistingServer: true,
          timeout: 120000,
        },
      ],
});
