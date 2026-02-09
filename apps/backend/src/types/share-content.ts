import type { File, Folder } from "@petrel/shared";

/**
 * Union type for share content - either a File or Folder
 */
export type ShareContent = File | Folder;

/**
 * Type guard to check if content is a File
 * Files have mimeType and size properties
 */
export function isFileContent(content: ShareContent): content is File {
	return (
		content !== null && typeof content === "object" && "mimeType" in content && "size" in content
	);
}

/**
 * Type guard to check if content is a Folder
 * Folders have path property but not mimeType
 */
export function isFolderContent(content: ShareContent): content is Folder {
	return (
		content !== null && typeof content === "object" && "path" in content && !("mimeType" in content)
	);
}

/**
 * Get the path for share content
 * For folders: returns the folder path
 * For files: returns the parent folder path (files store parent path in path field)
 */
export function getShareContentPath(content: ShareContent): string {
	if (isFolderContent(content)) {
		return content.path;
	}
	// For files, path field contains the parent folder path
	return content.path;
}

/**
 * Assert that content is a Folder, throw if not
 */
export function assertFolderContent(content: ShareContent): asserts content is Folder {
	if (!isFolderContent(content)) {
		throw new Error("Expected folder content but received file content");
	}
}

/**
 * Assert that content is a File, throw if not
 */
export function assertFileContent(content: ShareContent): asserts content is File {
	if (!isFileContent(content)) {
		throw new Error("Expected file content but received folder content");
	}
}
