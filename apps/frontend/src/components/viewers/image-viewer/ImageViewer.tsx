import type { ImageMetadata } from "@petrel/shared";
import { useCallback, useState } from "react";
import { useLongPress, useRegisterContextMenuActionHandler } from "@/components/global-context-menu";
import type { ContextMenuActionHandler, ImageViewerContext } from "@/components/global-context-menu";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";
import type { ImageViewerProps } from "./types";

/**
 * Single image viewer component with metadata display
 */
export function ImageViewer({ file, className }: ImageViewerProps) {
	const metadata = file.metadata as ImageMetadata | undefined;
	const [showInfo, setShowInfo] = useState(true);

	const handleContextMenuAction = useCallback<ContextMenuActionHandler>(
		async (action: string, context, _data?: unknown) => {
			if (context.type !== "image-viewer") return;

			if (action === "open-new-tab") {
				window.open(api.getThumbnailUrl(file.id, "large"), "_blank");
				return;
			}
			if (action === "download-image") {
				window.open(api.getDownloadUrl(file.id), "_blank");
				return;
			}
			if (action === "copy-image") {
				try {
					const response = await fetch(api.getThumbnailUrl(file.id, "large"));
					const blob = await response.blob();
					await navigator.clipboard.write([new ClipboardItem({ [blob.type]: blob })]);
				} catch {
					// ignore
				}
				return;
			}
			if (action === "toggle-exif") {
				setShowInfo((prev) => !prev);
			}
		},
		[file.id],
	);

	const contextMenuHandlerId = useRegisterContextMenuActionHandler(handleContextMenuAction);
	const contextMenuContext: ImageViewerContext = {
		type: "image-viewer",
		file,
		hasExif: !!metadata?.exif,
		showingInfo: showInfo,
	};

	const longPressHandlers = useLongPress(
		contextMenuContext,
		contextMenuHandlerId,
	);

	return (
		<div className={cn("flex flex-col items-center", className)}>
			<div className="relative max-h-[80vh] overflow-hidden rounded-lg" {...longPressHandlers}>
				<img
					src={api.getThumbnailUrl(file.id, "large")}
					alt={file.name}
					className="max-h-[80vh] w-auto object-contain"
				/>
			</div>

			{showInfo && metadata && (
				<div className="mt-4 text-sm text-muted-foreground">
					<span>
						{metadata.width} × {metadata.height}
					</span>
					{metadata.exif?.make && (
						<span className="ml-4">
							{metadata.exif.make} {metadata.exif.model}
						</span>
					)}
				</div>
			)}
		</div>
	);
}
