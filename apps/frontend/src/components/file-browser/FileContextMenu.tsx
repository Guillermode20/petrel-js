import { isFile } from "./utils/selection";
import { Copy, Download, ExternalLink, FileArchive, FolderInput, Link, Pencil, Share2, Trash2 } from "lucide-react";
import {
	ContextMenu,
	ContextMenuContent,
	ContextMenuItem,
	ContextMenuSeparator,
	ContextMenuTrigger,
} from "@/components/ui/context-menu";

import type { FileContextMenuHandlers } from "./types";

interface FileContextMenuProps extends FileContextMenuHandlers {
	allowZip?: boolean;
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
	onCopyShareLink,
	onDownloadZip,
	allowZip = true,
}: FileContextMenuProps) {
	const isFileItem = isFile(item);

	return (
		<ContextMenu>
			<ContextMenuTrigger asChild>{children}</ContextMenuTrigger>
			<ContextMenuContent className="w-48">
				<ContextMenuItem onClick={onOpen}>
					<ExternalLink className="mr-2 h-4 w-4" />
					Open
				</ContextMenuItem>
				{isFileItem && onDownload && (
					<ContextMenuItem onClick={onDownload}>
						<Download className="mr-2 h-4 w-4" />
						Download
					</ContextMenuItem>
				)}
				{allowZip && onDownloadZip && (
					<ContextMenuItem onClick={onDownloadZip}>
						<FileArchive className="mr-2 h-4 w-4" />
						Download ZIP
					</ContextMenuItem>
				)}
				<ContextMenuSeparator />
				{onShare && (
					<ContextMenuItem onClick={onShare}>
						<Share2 className="mr-2 h-4 w-4" />
						Share
					</ContextMenuItem>
				)}
				{onCopyLink && (
					<ContextMenuItem onClick={onCopyLink}>
						<Copy className="mr-2 h-4 w-4" />
						Copy link
					</ContextMenuItem>
				)}
				{onCopyShareLink && (
					<ContextMenuItem onClick={onCopyShareLink}>
						<Link className="mr-2 h-4 w-4" />
						Copy share link
					</ContextMenuItem>
				)}
				<ContextMenuSeparator />
				{onRename && (
					<ContextMenuItem onClick={onRename}>
						<Pencil className="mr-2 h-4 w-4" />
						Rename
					</ContextMenuItem>
				)}
				{onMove && (
					<ContextMenuItem onClick={onMove}>
						<FolderInput className="mr-2 h-4 w-4" />
						Move to...
					</ContextMenuItem>
				)}
				<ContextMenuSeparator />
				{onDelete && (
					<ContextMenuItem onClick={onDelete} className="text-destructive focus:text-destructive">
						<Trash2 className="mr-2 h-4 w-4" />
						Delete
					</ContextMenuItem>
				)}
			</ContextMenuContent>
		</ContextMenu>
	);
}
