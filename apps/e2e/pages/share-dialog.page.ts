import type { Locator, Page } from "@playwright/test";
import { expect } from "@playwright/test";

/**
 * Page Object Model for the Share Dialog.
 * Encapsulates share link creation, configuration, and retrieval.
 */
export class ShareDialog {
	readonly page: Page;
	readonly dialog: Locator;
	readonly createLinkButton: Locator;
	readonly shareInput: Locator;
	readonly doneButton: Locator;

	constructor(page: Page) {
		this.page = page;
		this.dialog = page.getByRole("dialog");
		this.createLinkButton = this.dialog.getByRole("button", { name: /create link/i });
		this.shareInput = this.dialog.locator("input[readonly]").first();
		this.doneButton = this.dialog.getByRole("button", { name: /done/i });
	}

	async expectVisible(): Promise<void> {
		await expect(this.dialog).toBeVisible({ timeout: 10000 });
		await expect(this.createLinkButton).toBeVisible({ timeout: 10000 });
	}

	async createShareLink(): Promise<string> {
		await expect(this.createLinkButton).toBeVisible({ timeout: 10000 });
		await this.createLinkButton.click();
		await expect(this.shareInput).toBeVisible({ timeout: 10000 });
		return this.shareInput.inputValue();
	}

	async selectExpiry(label: string): Promise<void> {
		// Click the expiry select trigger and choose an option
		const expiryTrigger = this.dialog.getByRole("combobox");
		await expiryTrigger.click();
		await this.page.getByRole("option", { name: label }).click();
	}

	async togglePasswordProtection(): Promise<void> {
		const passwordSwitch = this.dialog.locator("button[role='switch']").first();
		await passwordSwitch.click();
	}

	async setPassword(password: string): Promise<void> {
		const passwordInput = this.dialog.getByPlaceholder("Enter password");
		await expect(passwordInput).toBeVisible({ timeout: 5000 });
		await passwordInput.fill(password);
	}

	async expectShareCreated(): Promise<void> {
		await expect(this.shareInput).toBeVisible({ timeout: 10000 });
		await expect(this.doneButton).toBeVisible();
	}

	async close(): Promise<void> {
		await this.doneButton.click();
		await expect(this.dialog).not.toBeVisible({ timeout: 5000 });
	}
}
