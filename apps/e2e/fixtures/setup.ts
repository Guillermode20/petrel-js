import { test as base } from "@playwright/test";
import { FileBrowserPage, LoginPage, ShareDialog } from "../pages";
import { ApiClient } from "./api-client";
import { TEST_USERS } from "./test-data";

/**
 * Extended Playwright fixtures for Petrel E2E tests.
 *
 * Provides:
 * - `apiClient` — backend API client (unauthenticated)
 * - `adminApiClient` — backend API client pre-authenticated as admin (for cleanup)
 * - `loginPage` — Page Object for the login form
 * - `fileBrowser` — Page Object for the file browser
 * - `shareDialog` — Page Object for share creation dialog
 * - `authenticatedPage` — fixture that ensures admin exists and logs in via UI
 */
export const test = base.extend<{
  apiClient: ApiClient;
  adminApiClient: ApiClient;
  loginPage: LoginPage;
  fileBrowser: FileBrowserPage;
  shareDialog: ShareDialog;
  authenticatedPage: void;
}>({
  apiClient: async ({ request }, use) => {
    const backendURL = process.env.BACKEND_URL || "http://localhost:4000";
    const apiClient = new ApiClient(request, backendURL);
    await use(apiClient);
  },

  adminApiClient: async ({ request }, use) => {
    const backendURL = process.env.BACKEND_URL || "http://localhost:4000";
    const apiClient = new ApiClient(request, backendURL);

    // Ensure admin exists and authenticate
    try {
      await apiClient.setupInitialAdmin({
        username: TEST_USERS.admin.username,
        password: TEST_USERS.admin.password,
      });
    } catch {
      // Admin may already exist
    }
    await apiClient.login(TEST_USERS.admin.username, TEST_USERS.admin.password);

    await use(apiClient);
  },

  loginPage: async ({ page }, use) => {
    await use(new LoginPage(page));
  },

  fileBrowser: async ({ page }, use) => {
    await use(new FileBrowserPage(page));
  },

  shareDialog: async ({ page }, use) => {
    await use(new ShareDialog(page));
  },

  authenticatedPage: [
    async ({ page, adminApiClient: _adminApiClient }, use) => {
      // adminApiClient fixture ensures admin exists as a side effect
      const loginPage = new LoginPage(page);
      await loginPage.goto();
      await loginPage.loginAndWaitForFiles(
        TEST_USERS.admin.username,
        TEST_USERS.admin.password,
      );

      await use();
    },
    { auto: false },
  ],
});

export { expect } from "@playwright/test";
