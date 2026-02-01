import type { File, Folder } from "@petrel/shared";

/**
 * Get a unique selection key for a file or folder
 */
export function getSelectionKey(item: File | Folder): string {
	const type = "mimeType" in item ? "file" : "folder";
	return `${type}-${item.id}`;
}

/**
 * Parse a selection key back into type and id
 */
export function parseSelectionKey(key: string): { type: "file" | "folder"; id: number } | null {
	const match = key.match(/^(file|folder)-(\d+)$/);
	if (!match) return null;
	return {
		type: match[1] as "file" | "folder",
		id: Number(match[2]),
	};
}

/**
 * Check if an item is a File
 */
export function isFile(item: File | Folder): item is File {
	return "mimeType" in item;
}

/**
 * Check if an item is a Folder
 */
export function isFolder(item: File | Folder): item is Folder {
	return !("mimeType" in item);
}
