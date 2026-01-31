import type { File } from "@petrel/shared";
import { forwardRef, useRef, useState } from "react";
import { isFile, isFolder } from "@/hooks";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";
import type { FileItemProps } from "./types";
import { formatFileSize, getFileIcon, getFolderIcon } from "./utils";

const PRELOAD_DELAY_MS = 250; // 250ms hover before preloading

/**
 * File card component for grid view
 */
export const FileCard = forwardRef<HTMLDivElement, FileItemProps & { className?: string }>(
	function FileCard(
		{ item, isSelected, onSelect, onDoubleClick, onDragStart, onDrop, className, ...props },
		ref,
	) {
		const [isDragOver, setIsDragOver] = useState(false);
		const preloadTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
		const isFileItem = isFile(item);
		const isFolderItem = isFolder(item);
		const Icon = isFileItem ? getFileIcon((item as File).mimeType) : getFolderIcon();
		const showThumbnail = isFileItem && (item as File).mimeType.startsWith("image/");
		const isVideoFile = isFileItem && (item as File).mimeType.startsWith("video/");

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
							const token = localStorage.getItem("petrel_access_token");
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

		return (
			<div
				ref={ref}
				draggable
				onDragStart={(e) => onDragStart?.(item, e)}
				onDragOver={handleDragOver}
				onDragLeave={handleDragLeave}
				onDrop={handleDrop}
				className={cn(
					"group relative flex cursor-pointer flex-col items-center gap-2 rounded-lg border border-transparent p-3 transition-colors",
					"hover:bg-secondary/50",
					isSelected && "border-primary bg-primary/10",
					isDragOver && "bg-primary/20 scale-105 border-primary duration-75",
					className,
				)}
				onClick={(e) => onSelect?.(item, e)}
				onDoubleClick={handleDoubleClickWithCleanup}
				onMouseEnter={handleMouseEnter}
				onMouseLeave={handleMouseLeave}
				{...props}
			>
				{/* Thumbnail or icon */}
				<div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-md bg-secondary/30">
					{showThumbnail ? (
						<img
							src={api.getThumbnailUrl((item as File).id, "small")}
							alt={item.name}
							className="h-full w-full object-cover"
							loading="lazy"
						/>
					) : (
						<Icon className="h-10 w-10 text-foreground/80 group-hover:text-foreground" />
					)}
				</div>

				{/* File name */}
				<div className="w-full text-center">
					<p className="truncate text-sm font-medium text-foreground" title={item.name}>
						{item.name}
					</p>
					{isFileItem && (
						<p className="text-xs text-muted-foreground">{formatFileSize((item as File).size)}</p>
					)}
				</div>

				{/* Selection indicator */}
				{isSelected && <div className="absolute right-2 top-2 h-3 w-3 rounded-full bg-primary" />}
			</div>
		);
	},
);
