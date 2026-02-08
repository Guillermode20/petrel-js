import type { APIRequestContext } from "@playwright/test";

/**
 * API client for backend operations in E2E tests.
 * Provides direct API access for setup, teardown, and verification.
 */
export class ApiClient {
  private token: string | null = null;

  constructor(private request: APIRequestContext, private baseURL: string) {}

  private authHeaders(): Record<string, string> {
    if (!this.token) return {};
    return { Authorization: `Bearer ${this.token}` };
  }

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
    this.token = body.data.token;
    return { token: body.data.token, user: body.data.user };
  }

  async setupInitialAdmin(data: {
    username: string;
    password: string;
  }): Promise<void> {
    const response = await this.request.post(`${this.baseURL}/api/setup/admin`, {
      data,
    });

    if (!response.ok() && response.status() !== 409) {
      throw new Error(
        `Setup admin failed: ${response.status()} ${await response.text()}`,
      );
    }
  }

  async createUser(data: {
    username: string;
    password: string;
    role?: string;
  }): Promise<unknown> {
    const response = await this.request.post(`${this.baseURL}/api/admin/users`, {
      data,
      headers: this.authHeaders(),
    });

    if (!response.ok()) {
      throw new Error(
        `Create user failed: ${response.status()} ${await response.text()}`,
      );
    }

    const body = await response.json();
    return body.data;
  }

  async listFiles(folderId?: number): Promise<{ items: unknown[]; total: number }> {
    const params = new URLSearchParams();
    if (folderId !== undefined) params.set("folderId", String(folderId));

    const response = await this.request.get(
      `${this.baseURL}/api/files?${params.toString()}`,
      { headers: this.authHeaders() },
    );

    if (!response.ok()) {
      throw new Error(`List files failed: ${response.status()}`);
    }

    const body = await response.json();
    return body.data;
  }

  async deleteFile(fileId: number): Promise<void> {
    const response = await this.request.delete(
      `${this.baseURL}/api/files/${fileId}`,
      { headers: this.authHeaders() },
    );

    if (!response.ok()) {
      throw new Error(`Delete file failed: ${response.status()}`);
    }
  }

  async deleteFolder(folderId: number): Promise<void> {
    const response = await this.request.delete(
      `${this.baseURL}/api/folders/${folderId}`,
      { headers: this.authHeaders() },
    );

    if (!response.ok()) {
      throw new Error(`Delete folder failed: ${response.status()}`);
    }
  }

  async listShares(): Promise<unknown[]> {
    const response = await this.request.get(
      `${this.baseURL}/api/shares`,
      { headers: this.authHeaders() },
    );

    if (!response.ok()) {
      throw new Error(`List shares failed: ${response.status()}`);
    }

    const body = await response.json();
    return body.data;
  }

  async deleteShare(shareId: number): Promise<void> {
    const response = await this.request.delete(
      `${this.baseURL}/api/shares/${shareId}`,
      { headers: this.authHeaders() },
    );

    if (!response.ok()) {
      throw new Error(`Delete share failed: ${response.status()}`);
    }
  }
}
