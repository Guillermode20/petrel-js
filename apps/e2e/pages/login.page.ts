import type { Locator, Page } from "@playwright/test";
import { expect } from "@playwright/test";

/**
 * Page Object Model for the Login page.
 * Encapsulates all login form interactions.
 */
export class LoginPage {
	readonly page: Page;
	readonly usernameInput: Locator;
	readonly passwordInput: Locator;
	readonly signInButton: Locator;

	constructor(page: Page) {
		this.page = page;
		this.usernameInput = page.getByLabel("Username");
		this.passwordInput = page.getByLabel("Password");
		this.signInButton = page.getByRole("button", { name: "Sign In" });
	}

	async goto(): Promise<void> {
		await this.page.goto("/");
	}

	async login(username: string, password: string): Promise<void> {
		await this.usernameInput.fill(username);
		await this.passwordInput.fill(password);
		await this.signInButton.click();
	}

	async loginAndWaitForFiles(username: string, password: string): Promise<void> {
		await this.login(username, password);
		await this.page.waitForURL(/\/files/, { timeout: 10000 });
		await this.page.waitForLoadState("networkidle");
	}

	async expectVisible(): Promise<void> {
		await expect(this.usernameInput).toBeVisible();
		await expect(this.passwordInput).toBeVisible();
		await expect(this.signInButton).toBeVisible();
	}

	async expectError(): Promise<void> {
		await expect(this.page.getByText(/invalid|error/i)).toBeVisible();
	}
}
