import type { APIRequestContext } from "@playwright/test";

/**
 * API client for backend operations in E2E tests
 */
export class ApiClient {
  constructor(private request: APIRequestContext, private baseURL: string) {}

  async login(
    username: string,
    password: string,
  ): Promise<{ token: string; user: unknown }> {
    const response = await this.request.post(`${this.baseURL}/api/auth/login`, {
      data: { username, password },
    });

    if (!response.ok()) {
      throw new Error(
        `Login failed: ${response.status()} ${await response.text()}`,
      );
    }

    const body = await response.json();
    return { token: body.data.token, user: body.data.user };
  }

  async createUser(data: {
    username: string;
    password: string;
    role?: string;
  }): Promise<unknown> {
    const response = await this.request.post(`${this.baseURL}/api/admin/users`, {
      data,
    });

    if (!response.ok()) {
      throw new Error(
        `Create user failed: ${response.status()} ${await response.text()}`,
      );
    }

    const body = await response.json();
    return body.data;
  }

  async setupInitialAdmin(data: {
    username: string;
    password: string;
  }): Promise<void> {
    const response = await this.request.post(`${this.baseURL}/api/setup/admin`, {
      data,
    });

    if (!response.ok() && response.status() !== 409) {
      // 409 means admin already exists
      throw new Error(
        `Setup admin failed: ${response.status()} ${await response.text()}`,
      );
    }
  }

  async cleanupTestData(authToken: string): Promise<void> {
    const headers = { Authorization: `Bearer ${authToken}` };

    // Delete test files
    await this.request.post(`${this.baseURL}/api/files/cleanup`, {
      headers,
      data: { pattern: "e2e-" },
    });

    // Delete test users
    await this.request.post(`${this.baseURL}/api/admin/users/cleanup`, {
      headers,
      data: { pattern: "e2e-" },
    });
  }
}
