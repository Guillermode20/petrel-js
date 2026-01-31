import { ChevronLeft, ChevronRight, Download, FileQuestion, Share2, X } from "lucide-react";
import { useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";
import { AudioPlayer } from "../audio-player";
import { CodeViewer, MarkdownViewer, PDFViewer } from "../document-viewer";
import { ImageViewer } from "../image-viewer";
import { VideoPlayer } from "../video-player";
import type { FilePreviewProps } from "./types";
import { getPreviewType, getPreviewTypeLabel } from "./utils";

/**
 * Unified file preview component
 * Routes to the appropriate viewer based on file type
 */
export function FilePreview({ file, files, onNavigate, onClose, className }: FilePreviewProps) {
	const previewType = getPreviewType(file);

	// Find current position if files array is provided
	const currentIndex = files?.findIndex((f) => f.id === file.id) ?? -1;
	const hasPrev = currentIndex > 0;
	const hasNext = files ? currentIndex < files.length - 1 : false;

	// Keyboard navigation
	useEffect(() => {
		function handleKeyDown(e: KeyboardEvent): void {
			// Don't interfere with inputs
			if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
				return;
			}

			switch (e.key) {
				case "Escape":
					onClose?.();
					break;
				case "ArrowLeft":
					if (hasPrev && onNavigate) {
						onNavigate("prev");
						e.preventDefault();
					}
					break;
				case "ArrowRight":
					if (hasNext && onNavigate) {
						onNavigate("next");
						e.preventDefault();
					}
					break;
			}
		}

		window.addEventListener("keydown", handleKeyDown);
		return () => window.removeEventListener("keydown", handleKeyDown);
	}, [hasPrev, hasNext, onNavigate, onClose]);

	const handleDownload = useCallback(() => {
		const link = document.createElement("a");
		link.href = api.getDownloadUrl(file.id);
		link.download = file.name;
		document.body.appendChild(link);
		link.click();
		document.body.removeChild(link);
	}, [file.id, file.name]);

	function renderViewer(): React.ReactNode {
		switch (previewType) {
			case "video":
				return (
					<VideoPlayer
						src={api.getMasterPlaylistUrl(file.id)}
						fileId={file.id}
						className="h-full w-full"
					/>
				);

			case "audio":
				return (
					<div className="flex h-full items-center justify-center p-8">
						<AudioPlayer file={file} className="w-full max-w-md" />
					</div>
				);

			case "image":
				return <ImageViewer file={file} className="h-full w-full" />;

			case "pdf":
				return <PDFViewer file={file} className="h-full w-full" />;

			case "code":
				return (
					<div className="flex h-full items-start justify-center overflow-auto p-4">
						<CodeViewer file={file} className="w-full max-w-4xl" />
					</div>
				);

			case "markdown":
				return (
					<div className="flex h-full items-start justify-center overflow-auto p-4">
						<MarkdownViewer file={file} className="w-full max-w-4xl" />
					</div>
				);

			case "text":
				return (
					<div className="flex h-full items-start justify-center overflow-auto p-4">
						<CodeViewer file={file} className="w-full max-w-4xl" />
					</div>
				);
			default:
				return (
					<div className="flex h-full flex-col items-center justify-center gap-4 p-8">
						<FileQuestion className="h-16 w-16 text-muted-foreground" />
						<p className="text-lg font-medium">{file.name}</p>
						<p className="text-sm text-muted-foreground">This file type cannot be previewed</p>
						<Button onClick={handleDownload} className="mt-4">
							<Download className="mr-2 h-4 w-4" />
							Download File
						</Button>
					</div>
				);
		}
	}

	return (
		<div className={cn("flex h-full flex-col bg-background", className)}>
			{/* Header */}
			<div className="flex items-center justify-between border-b border-border px-4 py-2">
				<div className="flex items-center gap-3">
					<span className="font-medium">{file.name}</span>
					<span className="rounded bg-secondary px-2 py-0.5 text-xs text-muted-foreground">
						{getPreviewTypeLabel(previewType)}
					</span>
				</div>

				<div className="flex items-center gap-1">
					<Button variant="ghost" size="icon" onClick={handleDownload}>
						<Download className="h-4 w-4" />
					</Button>
					<Button variant="ghost" size="icon" disabled>
						<Share2 className="h-4 w-4" />
					</Button>
					{onClose && (
						<Button variant="ghost" size="icon" onClick={onClose}>
							<X className="h-4 w-4" />
						</Button>
					)}
				</div>
			</div>

			{/* Content */}
			<div className="relative flex-1 overflow-hidden">
				{renderViewer()}

				{/* Navigation arrows */}
				{onNavigate && hasPrev && (
					<Button
						variant="ghost"
						size="icon"
						className="absolute left-4 top-1/2 -translate-y-1/2 h-12 w-12 rounded-full bg-background/80 backdrop-blur-sm"
						onClick={() => onNavigate("prev")}
					>
						<ChevronLeft className="h-6 w-6" />
					</Button>
				)}

				{onNavigate && hasNext && (
					<Button
						variant="ghost"
						size="icon"
						className="absolute right-4 top-1/2 -translate-y-1/2 h-12 w-12 rounded-full bg-background/80 backdrop-blur-sm"
						onClick={() => onNavigate("next")}
					>
						<ChevronRight className="h-6 w-6" />
					</Button>
				)}
			</div>

			{/* Footer with file info */}
			{files && files.length > 1 && (
				<div className="flex items-center justify-center border-t border-border py-2">
					<span className="text-sm text-muted-foreground">
						{currentIndex + 1} / {files.length}
					</span>
				</div>
			)}
		</div>
	);
}
