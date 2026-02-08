import type { Locator, Page } from "@playwright/test";
import { expect } from "@playwright/test";

/**
 * Page Object Model for the File Browser page.
 * Encapsulates file grid, upload, context menu, folder, rename, search, and view interactions.
 */
export class FileBrowserPage {
	readonly page: Page;
	readonly breadcrumb: Locator;
	readonly fileInput: Locator;
	readonly newFolderButton: Locator;
	readonly contextMenu: Locator;
	readonly searchInput: Locator;
	readonly userAvatar: Locator;

	constructor(page: Page) {
		this.page = page;
		this.breadcrumb = page.getByRole("navigation", { name: "breadcrumb" });
		this.fileInput = page.locator('input[type="file"]').first();
		this.newFolderButton = page.getByRole("button", { name: /new folder/i });
		this.contextMenu = page.locator('[data-slot="dropdown-menu-content"]');
		this.searchInput = page.getByPlaceholder("Search files...");
		this.userAvatar = page.locator("[data-testid='user-avatar']");
	}

	async expectOnFilesPage(): Promise<void> {
		await expect(this.page).toHaveURL(/\/files/);
		await expect(this.breadcrumb.getByText("Files")).toBeVisible();
	}

	async uploadFile(name: string, mimeType: string, content: string | Buffer): Promise<void> {
		const buffer = typeof content === "string" ? Buffer.from(content) : content;
		await this.fileInput.setInputFiles({ name, mimeType, buffer });
	}

	getItem(name: string): Locator {
		return this.page.locator(`[data-testid="file-item-${name}"]`);
	}

	async waitForItem(name: string, timeout = 15000): Promise<Locator> {
		const item = this.getItem(name);
		await expect(item).toBeVisible({ timeout });
		return item;
	}

	async expectItemNotVisible(name: string, timeout = 10000): Promise<void> {
		const item = this.getItem(name);
		await expect(item).not.toBeVisible({ timeout });
	}

	async openContextMenu(itemName: string): Promise<void> {
		const item = await this.waitForItem(itemName);
		await item.click({ button: "right" });
		await expect(this.contextMenu).toBeVisible({ timeout: 5000 });
	}

	async clickContextMenuItem(menuItemText: string): Promise<void> {
		// Use regex to match the start of the menuitem name, since some items
		// include keyboard shortcuts (e.g. "Delete Del", "Rename F2")
		const pattern = new RegExp(`^${menuItemText}(\\s|$)`);
		const menuItem = this.contextMenu.getByRole("menuitem", { name: pattern });
		await expect(menuItem).toBeVisible({ timeout: 5000 });
		await menuItem.click();
	}

	async deleteItem(itemName: string): Promise<void> {
		await this.openContextMenu(itemName);
		await this.clickContextMenuItem("Delete");

		// The delete confirmation dialog has a destructive "Delete" button
		const dialog = this.page.getByRole("dialog");
		await expect(dialog).toBeVisible({ timeout: 5000 });
		const confirmButton = dialog.getByRole("button", { name: /delete/i });
		await expect(confirmButton).toBeVisible({ timeout: 5000 });
		await confirmButton.click();

		// Wait for dialog to close and mutation to complete
		await expect(dialog).not.toBeVisible({ timeout: 10000 });
		await this.page.waitForLoadState("networkidle");

		// Verify item is gone
		await this.expectItemNotVisible(itemName, 15000);
	}

	async renameItem(itemName: string, newName: string): Promise<void> {
		await this.openContextMenu(itemName);
		await this.clickContextMenuItem("Rename");

		const dialog = this.page.getByRole("dialog");
		await expect(dialog).toBeVisible({ timeout: 5000 });

		const nameInput = dialog.getByPlaceholder("New name");
		await expect(nameInput).toBeVisible();
		await nameInput.clear();
		await nameInput.fill(newName);

		const renameButton = dialog.getByRole("button", { name: /rename/i });
		await renameButton.click();

		// Wait for dialog to close
		await expect(dialog).not.toBeVisible({ timeout: 10000 });
	}

	async createFolder(name: string): Promise<void> {
		await expect(this.newFolderButton).toBeVisible();
		await this.newFolderButton.click();

		const dialog = this.page.getByRole("dialog");
		await expect(dialog).toBeVisible({ timeout: 5000 });

		const folderNameInput = dialog.getByPlaceholder(/folder name/i);
		await expect(folderNameInput).toBeVisible();
		await folderNameInput.fill(name);

		const createButton = dialog.getByRole("button", { name: /create/i });
		await createButton.click();

		// Wait for dialog to close
		await expect(dialog).not.toBeVisible({ timeout: 10000 });
	}

	async navigateToFolder(folderName: string): Promise<void> {
		const folderItem = await this.waitForItem(folderName);
		await folderItem.dblclick();
		await expect(this.breadcrumb.getByText(folderName)).toBeVisible({ timeout: 10000 });
	}

	async shareItem(itemName: string): Promise<void> {
		await this.openContextMenu(itemName);
		await this.clickContextMenuItem("Share");
	}

	async search(query: string): Promise<void> {
		await this.searchInput.fill(query);
		// Wait for debounced search to take effect
		await this.page.waitForTimeout(500);
	}

	async clearSearch(): Promise<void> {
		await this.searchInput.clear();
		await this.page.waitForTimeout(500);
	}

	async switchToListView(): Promise<void> {
		const listButton = this.page.getByRole("button", { name: /list view/i });
		await listButton.click();
	}

	async switchToGridView(): Promise<void> {
		const gridButton = this.page.getByRole("button", { name: /grid view/i });
		await gridButton.click();
	}

	async logout(): Promise<void> {
		await expect(this.userAvatar).toBeVisible({ timeout: 10000 });
		await this.userAvatar.click();
		const logoutItem = this.page.locator("[data-testid='logout-button']");
		await expect(logoutItem).toBeVisible({ timeout: 5000 });
		await logoutItem.click();
	}

	async getItemCount(): Promise<number> {
		const items = this.page.locator("[data-testid^='file-item-']");
		return items.count();
	}
}
