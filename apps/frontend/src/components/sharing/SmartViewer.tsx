import type { File, ShareSettings } from "@petrel/shared";
import { Download, FileQuestion } from "lucide-react";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";
import type { PreviewType } from "../viewers/file-preview/types";
import { getPreviewType } from "../viewers/file-preview/utils";
import { VideoPlayer } from "../viewers/video-player";

export interface SmartViewerProps {
	file: File;
	shareToken: string;
	password?: string;
	settings: ShareSettings;
	className?: string;
}

/**
 * SmartViewer - Content type router for public shares
 *
 * Renders the appropriate viewer based on file type.
 * Uses share-aware URLs for streaming and thumbnails.
 */
export function SmartViewer({
	file,
	shareToken,
	password,
	settings,
	className,
}: SmartViewerProps): React.ReactNode {
	const previewType = getPreviewType(file);

	return (
		<div className={cn("flex h-full flex-col", className)}>
			{renderViewer(previewType, file, shareToken, password, settings)}
		</div>
	);
}

/**
 * Renders the appropriate viewer based on content type
 */
function renderViewer(
	previewType: PreviewType,
	file: File,
	shareToken: string,
	password: string | undefined,
	_settings: ShareSettings,
): React.ReactNode {
	switch (previewType) {
		case "video":
			return (
				<VideoPlayer
					src={api.getShareStreamUrl(shareToken, file.id, password)}
					fileId={file.id}
					className="h-full w-full"
				/>
			);

		case "audio":
			return <ShareAudioPlayer file={file} shareToken={shareToken} password={password} />;

		case "image":
			return <ShareImageViewer file={file} shareToken={shareToken} password={password} />;

		case "pdf":
		case "code":
		case "markdown":
		case "text":
			return (
				<DownloadOnlyView
					file={file}
					shareToken={shareToken}
					password={password}
					message="Preview not available for this file type in shared view"
				/>
			);

		default:
			return (
				<DownloadOnlyView
					file={file}
					shareToken={shareToken}
					password={password}
					message="This file type cannot be previewed"
				/>
			);
	}
}

interface ShareMediaProps {
	file: File;
	shareToken: string;
	password?: string;
}

/**
 * Simple audio player for shared files
 */
function ShareAudioPlayer({ file, shareToken, password }: ShareMediaProps): React.ReactNode {
	const audioUrl = api.getAudioStreamUrl(file.id, { shareToken, password });

	return (
		<div className="flex h-full flex-col items-center justify-center gap-6 p-8">
			<div className="w-full max-w-md rounded-lg border border-border bg-card p-6">
				<div className="mb-4 text-center">
					<h3 className="text-lg font-medium">{file.name}</h3>
					<p className="text-sm text-muted-foreground">{formatFileSize(file.size)}</p>
				</div>
				<audio src={audioUrl} controls className="w-full" controlsList="nodownload" />
			</div>
		</div>
	);
}

/**
 * Simple image viewer for shared files
 */
function ShareImageViewer({ file, shareToken, password }: ShareMediaProps): React.ReactNode {
	const imageUrl = api.getShareThumbnailUrl(shareToken, file.id, "large", password);

	return (
		<div className="flex h-full items-center justify-center p-4">
			<img
				src={imageUrl}
				alt={file.name}
				className="max-h-full max-w-full object-contain"
				loading="lazy"
			/>
		</div>
	);
}

interface DownloadOnlyViewProps {
	file: File;
	shareToken: string;
	password?: string;
	message: string;
}

/**
 * Fallback view for unsupported file types
 */
function DownloadOnlyView({
	file,
	shareToken,
	password,
	message,
}: DownloadOnlyViewProps): React.ReactNode {
	function handleDownload(): void {
		const url = api.getShareDownloadUrl(shareToken, password);
		const link = document.createElement("a");
		link.href = url;
		link.download = file.name;
		document.body.appendChild(link);
		link.click();
		document.body.removeChild(link);
	}

	return (
		<div className="flex h-full flex-col items-center justify-center gap-4 p-8">
			<FileQuestion className="h-16 w-16 text-muted-foreground" />
			<p className="text-lg font-medium">{file.name}</p>
			<p className="text-sm text-muted-foreground">{message}</p>
			<Button onClick={handleDownload} className="mt-4">
				<Download className="mr-2 h-4 w-4" />
				Download File
			</Button>
		</div>
	);
}

/**
 * Formats file size for display
 */
function formatFileSize(bytes: number): string {
	if (bytes === 0) return "0 B";
	const k = 1024;
	const sizes = ["B", "KB", "MB", "GB", "TB"];
	const i = Math.floor(Math.log(bytes) / Math.log(k));
	return `${parseFloat((bytes / k ** i).toFixed(1))} ${sizes[i]}`;
}
