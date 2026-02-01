import { Copy, Download, ExternalLink, Info } from "lucide-react";
import {
	ContextMenu,
	ContextMenuContent,
	ContextMenuItem,
	ContextMenuSeparator,
	ContextMenuShortcut,
	ContextMenuTrigger,
} from "@/components/ui/context-menu";

interface ImageContextMenuProps {
	children: React.ReactNode;
	hasExif: boolean;
	showingInfo: boolean;
	onOpenInNewTab?: () => void;
	onDownload?: () => void;
	onCopyImage?: () => void;
	onToggleExif?: () => void;
}

/**
 * Context menu for image viewer with download, copy, and EXIF actions
 */
export function ImageContextMenu({
	children,
	hasExif,
	showingInfo,
	onOpenInNewTab,
	onDownload,
	onCopyImage,
	onToggleExif,
}: ImageContextMenuProps): React.ReactNode {
	return (
		<ContextMenu>
			<ContextMenuTrigger asChild>{children}</ContextMenuTrigger>
			<ContextMenuContent className="w-48">
				{onOpenInNewTab && (
					<ContextMenuItem onClick={onOpenInNewTab}>
						<ExternalLink className="mr-2 h-4 w-4" />
						Open in new tab
					</ContextMenuItem>
				)}
				{onDownload && (
					<ContextMenuItem onClick={onDownload}>
						<Download className="mr-2 h-4 w-4" />
						Download
					</ContextMenuItem>
				)}
				{onCopyImage && (
					<ContextMenuItem onClick={onCopyImage}>
						<Copy className="mr-2 h-4 w-4" />
						Copy image
					</ContextMenuItem>
				)}
				{hasExif && onToggleExif && (
					<>
						<ContextMenuSeparator />
						<ContextMenuItem onClick={onToggleExif}>
							<Info className="mr-2 h-4 w-4" />
							{showingInfo ? "Hide" : "View"} EXIF data
							<ContextMenuShortcut>I</ContextMenuShortcut>
						</ContextMenuItem>
					</>
				)}
			</ContextMenuContent>
		</ContextMenu>
	);
}
