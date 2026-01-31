import type { File, Folder } from "@petrel/shared";
import { Copy, Download, ExternalLink, FolderInput, Pencil, Share2, Trash2 } from "lucide-react";
import {
	ContextMenu,
	ContextMenuContent,
	ContextMenuItem,
	ContextMenuSeparator,
	ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { isFile } from "@/hooks";

interface FileContextMenuProps {
	children: React.ReactNode;
	item: File | Folder;
	onOpen: () => void;
	onDownload: () => void;
	onRename: () => void;
	onDelete: () => void;
	onShare: () => void;
	onMove: () => void;
	onCopyLink: () => void;
}

/**
 * Context menu for file/folder actions
 */
export function FileContextMenu({
	children,
	item,
	onOpen,
	onDownload,
	onRename,
	onDelete,
	onShare,
	onMove,
	onCopyLink,
}: FileContextMenuProps) {
	const isFileItem = isFile(item);
	const _isImage = isFileItem && item.mimeType.startsWith("image/");

	return (
		<ContextMenu>
			<ContextMenuTrigger asChild>{children}</ContextMenuTrigger>
			<ContextMenuContent className="w-48">
				<ContextMenuItem onClick={onOpen}>
					<ExternalLink className="mr-2 h-4 w-4" />
					Open
				</ContextMenuItem>
				{isFileItem && (
					<ContextMenuItem onClick={onDownload}>
						<Download className="mr-2 h-4 w-4" />
						Download
					</ContextMenuItem>
				)}
				<ContextMenuSeparator />
				<ContextMenuItem onClick={onShare}>
					<Share2 className="mr-2 h-4 w-4" />
					Share
				</ContextMenuItem>
				<ContextMenuItem onClick={onCopyLink}>
					<Copy className="mr-2 h-4 w-4" />
					Copy link
				</ContextMenuItem>
				<ContextMenuSeparator />
				<ContextMenuItem onClick={onRename}>
					<Pencil className="mr-2 h-4 w-4" />
					Rename
				</ContextMenuItem>
				<ContextMenuItem onClick={onMove}>
					<FolderInput className="mr-2 h-4 w-4" />
					Move to...
				</ContextMenuItem>
				<ContextMenuSeparator />
				<ContextMenuItem onClick={onDelete} className="text-destructive focus:text-destructive">
					<Trash2 className="mr-2 h-4 w-4" />
					Delete
				</ContextMenuItem>
			</ContextMenuContent>
		</ContextMenu>
	);
}
