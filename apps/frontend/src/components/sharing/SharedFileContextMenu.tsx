import type { ShareSettings } from "@petrel/shared";
import { Copy, Download, ExternalLink, FileArchive } from "lucide-react";
import {
	ContextMenu,
	ContextMenuContent,
	ContextMenuItem,
	ContextMenuSeparator,
	ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { isFile } from "@/hooks";
import { toast } from "sonner";
import type { FileContextMenuHandlers } from "../file-browser/types";

interface SharedFileContextMenuProps extends FileContextMenuHandlers {
	settings?: ShareSettings;
}

/**
 * Context menu for shared files/folders with options based on share settings
 */
export function SharedFileContextMenu({
	children,
	item,
	settings,
	onOpen,
	onDownload,
	onDownloadZip,
}: SharedFileContextMenuProps) {
	const isFileItem = isFile(item);

	const handleCopyLink = () => {
		const url = new URL(window.location.href);
		navigator.clipboard.writeText(url.toString());
		toast.success("Share link copied to clipboard");
	};

	return (
		<ContextMenu>
			<ContextMenuTrigger asChild>{children}</ContextMenuTrigger>
			<ContextMenuContent className="w-48">
				<ContextMenuItem onClick={onOpen}>
					<ExternalLink className="mr-2 h-4 w-4" />
					Open
				</ContextMenuItem>
				{isFileItem && settings?.allowDownload && onDownload && (
					<ContextMenuItem onClick={onDownload}>
						<Download className="mr-2 h-4 w-4" />
						Download
					</ContextMenuItem>
				)}
				{settings?.allowDownload && settings?.allowZip && onDownloadZip && (
					<ContextMenuItem onClick={onDownloadZip}>
						<FileArchive className="mr-2 h-4 w-4" />
						Download ZIP
					</ContextMenuItem>
				)}
				<ContextMenuSeparator />
				<ContextMenuItem onClick={handleCopyLink}>
					<Copy className="mr-2 h-4 w-4" />
					Copy share link
				</ContextMenuItem>
			</ContextMenuContent>
		</ContextMenu>
	);
}
