import type { File } from "@petrel/shared";
import type { PreviewType } from "./types";

// Video formats that can be streamed
const VIDEO_EXTENSIONS = new Set([
	"mp4",
	"webm",
	"mkv",
	"avi",
	"mov",
	"wmv",
	"flv",
	"m4v",
	"mpg",
	"mpeg",
	"3gp",
]);

// Audio formats
const AUDIO_EXTENSIONS = new Set([
	"mp3",
	"wav",
	"flac",
	"aac",
	"m4a",
	"ogg",
	"wma",
	"opus",
	"aiff",
	"alac",
]);

// Image formats
const IMAGE_EXTENSIONS = new Set([
	"jpg",
	"jpeg",
	"png",
	"gif",
	"webp",
	"svg",
	"bmp",
	"ico",
	"tiff",
	"avif",
	"heic",
]);

// Code/text extensions
const CODE_EXTENSIONS = new Set([
	"js",
	"jsx",
	"ts",
	"tsx",
	"html",
	"css",
	"scss",
	"less",
	"json",
	"py",
	"rb",
	"go",
	"rs",
	"java",
	"kt",
	"cs",
	"php",
	"sh",
	"bash",
	"zsh",
	"ps1",
	"yaml",
	"yml",
	"toml",
	"xml",
	"ini",
	"sql",
	"graphql",
	"c",
	"cpp",
	"h",
	"hpp",
	"swift",
	"dockerfile",
	"makefile",
	"vue",
	"svelte",
	"astro",
]);

// Markdown extensions
const MARKDOWN_EXTENSIONS = new Set(["md", "mdx", "markdown"]);

// Plain text
const TEXT_EXTENSIONS = new Set(["txt", "log", "csv", "env", "gitignore", "editorconfig"]);

/**
 * Determine the preview type based on file extension and mime type
 */
export function getPreviewType(file: File): PreviewType {
	const extension = file.name.split(".").pop()?.toLowerCase() ?? "";
	const mimeType = file.mimeType?.toLowerCase() ?? "";

	// Check by extension first
	if (VIDEO_EXTENSIONS.has(extension)) return "video";
	if (AUDIO_EXTENSIONS.has(extension)) return "audio";
	if (IMAGE_EXTENSIONS.has(extension)) return "image";
	if (extension === "pdf") return "pdf";
	if (CODE_EXTENSIONS.has(extension)) return "code";
	if (MARKDOWN_EXTENSIONS.has(extension)) return "markdown";
	if (TEXT_EXTENSIONS.has(extension)) return "text";

	// Fallback to mime type
	if (mimeType.startsWith("video/")) return "video";
	if (mimeType.startsWith("audio/")) return "audio";
	if (mimeType.startsWith("image/")) return "image";
	if (mimeType === "application/pdf") return "pdf";
	if (mimeType.startsWith("text/")) return "text";

	return "unsupported";
}

/**
 * Check if a file can be previewed
 */
export function canPreview(file: File): boolean {
	return getPreviewType(file) !== "unsupported";
}

/**
 * Get human-readable preview type label
 */
export function getPreviewTypeLabel(type: PreviewType): string {
	const labels: Record<PreviewType, string> = {
		video: "Video",
		audio: "Audio",
		image: "Image",
		pdf: "PDF Document",
		code: "Code",
		markdown: "Markdown",
		text: "Text",
		unsupported: "Unsupported",
	};
	return labels[type];
}
