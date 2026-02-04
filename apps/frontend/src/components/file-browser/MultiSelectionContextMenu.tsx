import { FileArchive, FolderInput, Share2, Trash2, X } from "lucide-react";
import {
	ContextMenu,
	ContextMenuContent,
	ContextMenuItem,
	ContextMenuSeparator,
	ContextMenuShortcut,
	ContextMenuTrigger,
} from "@/components/ui/context-menu";

interface MultiSelectionContextMenuProps {
	children: React.ReactNode;
	selectedCount: number;
	onDownloadZip?: () => void;
	onShareSelected?: () => void;
	onMoveSelected?: () => void;
	onDeleteSelected?: () => void;
	onClearSelection?: () => void;
}

/**
 * Context menu for multi-selected files/folders
 */
export function MultiSelectionContextMenu({
	children,
	selectedCount,
	onDownloadZip,
	onShareSelected,
	onMoveSelected,
	onDeleteSelected,
	onClearSelection,
}: MultiSelectionContextMenuProps): React.ReactNode {
	return (
		<ContextMenu>
			<ContextMenuTrigger asChild>{children}</ContextMenuTrigger>
			<ContextMenuContent className="w-52">
				{onDownloadZip && (
					<ContextMenuItem onClick={onDownloadZip}>
						<FileArchive className="mr-2 h-4 w-4" />
						Download as ZIP ({selectedCount})
					</ContextMenuItem>
				)}
				<ContextMenuSeparator />
				{onShareSelected && (
					<ContextMenuItem onClick={onShareSelected}>
						<Share2 className="mr-2 h-4 w-4" />
						Share selected
					</ContextMenuItem>
				)}
				<ContextMenuSeparator />
				{onMoveSelected && (
					<ContextMenuItem onClick={onMoveSelected}>
						<FolderInput className="mr-2 h-4 w-4" />
						Move selected to...
					</ContextMenuItem>
				)}
				{onDeleteSelected && (
					<ContextMenuItem onClick={onDeleteSelected} variant="destructive">
						<Trash2 className="mr-2 h-4 w-4" />
						Delete selected ({selectedCount})<ContextMenuShortcut>Del</ContextMenuShortcut>
					</ContextMenuItem>
				)}
				<ContextMenuSeparator />
				{onClearSelection && (
					<ContextMenuItem onClick={onClearSelection}>
						<X className="mr-2 h-4 w-4" />
						Clear selection
						<ContextMenuShortcut>Esc</ContextMenuShortcut>
					</ContextMenuItem>
				)}
			</ContextMenuContent>
		</ContextMenu>
	);
}
