import type { File } from "@petrel/shared";
import { Play } from "lucide-react";
import type { HTMLAttributes } from "react";
import { forwardRef, useRef, useState } from "react";
import { isFile, isFolder, useAuth } from "@/hooks";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";
import type { FileItemProps } from "./types";
import { formatFileSize, getFileIcon, getFolderIcon, getRelativePath } from "./utils";

const PRELOAD_DELAY_MS = 250; // 250ms hover before preloading

/**
 * File card component for grid view
 */
export const FileCard = forwardRef<
	HTMLDivElement,
	FileItemProps & { className?: string } & HTMLAttributes<HTMLDivElement>
>(function FileCard(
	{
		item,
		isSelected,
		onSelect,
		onDoubleClick,
		onDragStart,
		onDrop,
		className,
		currentFolderPath,
		searchQuery,
		...triggerProps
	},
	ref,
) {
	const { token } = useAuth();
	const [isDragOver, setIsDragOver] = useState(false);
	const preloadTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
	const isFileItem = isFile(item);
	const isFolderItem = isFolder(item);
	const Icon = isFileItem ? getFileIcon((item as File).mimeType) : getFolderIcon();
	const isVideoFile = isFileItem && (item as File).mimeType.startsWith("video/");
	const showThumbnail = isFileItem && ((item as File).mimeType.startsWith("image/") || isVideoFile);

	// Calculate relative folder path for display when searching
	const relativeFolderPath =
		searchQuery && isFileItem ? getRelativePath(item.path, currentFolderPath) : "";

	const handleDragOver = (e: React.DragEvent) => {
		if (!isFolderItem) return;
		e.preventDefault();
		e.stopPropagation();
		setIsDragOver(true);
	};

	const handleDragLeave = () => {
		setIsDragOver(false);
	};

	const handleDrop = (e: React.DragEvent) => {
		if (!isFolderItem) return;
		e.preventDefault();
		e.stopPropagation();
		setIsDragOver(false);
		if (onDrop) {
			onDrop(item, e);
		}
	};

	// Hover preload for video files
	const handleMouseEnter = () => {
		if (isVideoFile) {
			// Clear any existing timeout
			if (preloadTimeoutRef.current) {
				clearTimeout(preloadTimeoutRef.current);
			}
			// Set new timeout to preload after delay
			preloadTimeoutRef.current = setTimeout(() => {
				void api.prepareStream((item as File).id).then((result) => {
					// If stream is ready, pre-fetch the first segment in parallel
					if (result.ready && result.firstSegmentUrl) {
						const headers: HeadersInit = token ? { Authorization: `Bearer ${token}` } : {};
						void fetch(result.firstSegmentUrl, { method: "GET", headers });
					}
				});
			}, PRELOAD_DELAY_MS);
		}
	};

	const handleMouseLeave = () => {
		// Clear preload timeout if user leaves before delay
		if (preloadTimeoutRef.current) {
			clearTimeout(preloadTimeoutRef.current);
			preloadTimeoutRef.current = null;
		}
	};

	const handleDoubleClickWithCleanup = () => {
		// Clear any pending preload timeout and trigger immediately
		if (preloadTimeoutRef.current) {
			clearTimeout(preloadTimeoutRef.current);
			preloadTimeoutRef.current = null;
		}
		onDoubleClick?.(item);
	};

	const handleContextMenuCapture = (e: React.MouseEvent<HTMLDivElement>) => {
		// Select the item before the context menu trigger runs
		onSelect?.(item, e);
	};

	return (
		<div
			ref={ref}
			draggable
			data-testid={`file-item-${item.name}`}
			onDragStart={(e) => onDragStart?.(item, e)}
			onDragOver={handleDragOver}
			onDragLeave={handleDragLeave}
			onDrop={handleDrop}
			onContextMenuCapture={handleContextMenuCapture}
			className={cn(
				"group relative flex cursor-pointer flex-col items-center gap-1.5 rounded-lg border border-transparent p-2 transition-colors",
				"hover:bg-secondary/50",
				isSelected && "border-primary bg-primary/10",
				isDragOver && "bg-primary/20 scale-105 border-primary duration-75",
				className,
			)}
			onClick={(e) => onSelect?.(item, e)}
			onDoubleClick={handleDoubleClickWithCleanup}
			onMouseEnter={handleMouseEnter}
			onMouseLeave={handleMouseLeave}
			{...triggerProps}
		>
			{/* Thumbnail or icon */}
			<div className="relative flex h-16 w-16 items-center justify-center overflow-hidden rounded-md bg-secondary/30">
				{showThumbnail ? (
					<>
						<img
							src={api.getThumbnailUrl((item as File).id, "small")}
							alt={item.name}
							className="h-full w-full object-cover"
							loading="lazy"
						/>
						{/* Video play indicator overlay */}
						{isVideoFile && (
							<div className="absolute bottom-1 right-1 flex h-5 w-5 items-center justify-center rounded bg-black/60">
								<Play className="h-3 w-3 fill-white text-white" />
							</div>
						)}
					</>
				) : (
					<Icon className="h-8 w-8 text-foreground/80 group-hover:text-foreground" />
				)}
			</div>

			{/* File name */}
			<div className="w-full text-center">
				<p className="truncate text-xs font-medium text-foreground" title={item.name}>
					{item.name}
				</p>
				{relativeFolderPath && (
					<p className="truncate text-[10px] text-muted-foreground" title={relativeFolderPath}>
						{relativeFolderPath}
					</p>
				)}
				{isFileItem && (
					<p className="text-[10px] text-muted-foreground">{formatFileSize((item as File).size)}</p>
				)}
			</div>

			{/* Selection indicator */}
			{isSelected && (
				<div className="absolute right-1.5 top-1.5 h-2.5 w-2.5 rounded-full bg-primary" />
			)}
		</div>
	);
});
