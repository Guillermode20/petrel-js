import {
	Archive,
	FileCode,
	File as FileIcon,
	FileSpreadsheet,
	FileText,
	Film,
	Folder,
	Image,
	Music,
} from "lucide-react";

/**
 * Get the appropriate icon for a file based on its mime type
 */
export function getFileIcon(mimeType: string): React.ComponentType<{ className?: string }> {
	if (mimeType.startsWith("image/")) return Image;
	if (mimeType.startsWith("video/")) return Film;
	if (mimeType.startsWith("audio/")) return Music;
	if (mimeType === "application/pdf") return FileText;
	if (mimeType.startsWith("text/")) return FileCode;
	if (
		mimeType === "application/zip" ||
		mimeType === "application/x-rar-compressed" ||
		mimeType === "application/x-7z-compressed" ||
		mimeType === "application/gzip"
	) {
		return Archive;
	}
	if (
		mimeType === "application/vnd.ms-excel" ||
		mimeType === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" ||
		mimeType === "text/csv"
	) {
		return FileSpreadsheet;
	}
	return FileIcon;
}

/**
 * Get the folder icon
 */
export function getFolderIcon(): React.ComponentType<{ className?: string }> {
	return Folder;
}

/**
 * Format file size to human-readable string
 */
export function formatFileSize(bytes: number): string {
	if (bytes === 0) return "0 B";
	const k = 1024;
	const sizes = ["B", "KB", "MB", "GB", "TB"];
	const i = Math.floor(Math.log(bytes) / Math.log(k));
	return `${parseFloat((bytes / k ** i).toFixed(1))} ${sizes[i]}`;
}

/**
 * Format duration in seconds to HH:MM:SS or MM:SS
 */
export function formatDuration(seconds: number): string {
	const hours = Math.floor(seconds / 3600);
	const minutes = Math.floor((seconds % 3600) / 60);
	const secs = Math.floor(seconds % 60);

	if (hours > 0) {
		return `${hours}:${minutes.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
	}
	return `${minutes}:${secs.toString().padStart(2, "0")}`;
}

/**
 * Get file type category from mime type
 */
export function getFileCategory(mimeType: string): string {
	if (mimeType.startsWith("image/")) return "Image";
	if (mimeType.startsWith("video/")) return "Video";
	if (mimeType.startsWith("audio/")) return "Audio";
	if (mimeType === "application/pdf") return "PDF";
	if (mimeType.startsWith("text/")) return "Text";
	if (mimeType.includes("zip") || mimeType.includes("rar") || mimeType.includes("7z")) {
		return "Archive";
	}
	return "File";
}

/**
 * Check if file is previewable in browser
 */
export function isPreviewable(mimeType: string): boolean {
	return (
		mimeType.startsWith("image/") ||
		mimeType.startsWith("video/") ||
		mimeType.startsWith("audio/") ||
		mimeType === "application/pdf" ||
		mimeType.startsWith("text/")
	);
}

/**
 * Check if file is a media file (video or audio)
 */
export function isMediaFile(mimeType: string): boolean {
	return mimeType.startsWith("video/") || mimeType.startsWith("audio/");
}

/**
 * Get file extension from filename
 */
export function getFileExtension(filename: string): string {
	const parts = filename.split(".");
	return parts.length > 1 ? (parts.pop()?.toLowerCase() ?? "") : "";
}

/**
 * Calculate relative path from current folder to file's folder
 * Returns the relative folder path if file is in a subfolder, empty string if in current folder
 * 
 * @param fileFolderPath - The folder path where the file is located (file.path)
 * @param currentFolderPath - The current folder path being viewed
 */
export function getRelativePath(fileFolderPath: string, currentFolderPath: string | null | undefined): string {
	if (!currentFolderPath || currentFolderPath === "") {
		// At root, return the file's folder path
		return fileFolderPath || "";
	}
	
	const normalizedCurrent = currentFolderPath.trim();
	const normalizedFile = fileFolderPath.trim();
	
	// If file is in current folder, return empty
	if (normalizedFile === normalizedCurrent) {
		return "";
	}
	
	// If file is in a subfolder, return the relative path
	if (normalizedFile.startsWith(normalizedCurrent + "/")) {
		return normalizedFile.slice(normalizedCurrent.length + 1);
	}
	
	// If file path doesn't start with current path (shouldn't happen in normal search),
	// return empty to avoid showing incorrect paths
	return "";
}