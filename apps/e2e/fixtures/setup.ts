import { test as base } from "@playwright/test";
import { ApiClient } from "./api-client";
import { TEST_USERS } from "./test-data";

/**
 * Extended test fixture with API client and setup/cleanup
 */
export const test = base.extend<{
  apiClient: ApiClient;
  authenticatedPage: void;
}>({
  apiClient: async ({ request }, use) => {
    const backendURL = process.env.BACKEND_URL || "http://localhost:4000";
    const apiClient = new ApiClient(request, backendURL);
    await use(apiClient);
  },

  // Setup: Create admin user before tests that need authentication
  authenticatedPage: [
    async ({ page, apiClient }, use) => {
      // Setup: Create initial admin if needed
      try {
        await apiClient.setupInitialAdmin({
          username: TEST_USERS.admin.username,
          password: TEST_USERS.admin.password,
        });
        console.log(`✓ Created admin user: ${TEST_USERS.admin.username}`);
      } catch (error) {
        // Admin may already exist, that's fine
        console.log(`ℹ Admin setup: ${error instanceof Error ? error.message : 'Admin may already exist'}`);
      }

      // Run the test
      await use();
    },
    { auto: true },
  ],
});

export { expect } from "@playwright/test";
