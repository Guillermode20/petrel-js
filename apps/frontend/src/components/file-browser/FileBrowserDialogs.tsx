import type { File, Folder } from "@petrel/shared";
import { CreateShareModal } from "@/components/sharing";
import {
	BulkDeleteConfirmDialog,
	CreateFolderDialog,
	DeleteConfirmDialog,
	RenameDialog,
} from "./FileDialogs";
import { FileProperties } from "./FileProperties";
import { MoveItemsDialog } from "./move-items-dialog";
import { isFile } from "./utils/selection";

interface FileBrowserDialogsProps {
	// Rename dialog
	renameItem: File | Folder | null;
	onRename: (newName: string) => Promise<void>;
	isRenaming: boolean;

	// Delete dialog
	deleteItem: File | Folder | null;
	onDelete: () => Promise<void>;

	// Bulk delete dialog
	deleteSelection: Array<File | Folder>;
	onDeleteSelection: () => Promise<void>;
	deleteSelectionStats: {
		files: number;
		folders: number;
		total: number;
	};

	// Move dialog
	moveSelection: Array<File | Folder>;
	onMove: (targetFolderId: number | null) => Promise<void>;
	moveExcludeFolderIds: Set<number>;
	currentFolderId?: number;

	// Share dialog
	shareItem: File | Folder | null;
	onShareClose: () => void;

	// Properties dialog
	propertiesItem: File | Folder | null;
	onPropertiesClose: () => void;

	// Create folder dialog
	createFolderOpen: boolean;
	onCreateFolderOpenChange: (open: boolean) => void;
	onCreateFolder: (name: string) => Promise<void>;
	isCreatingFolder: boolean;

	// Mutation states
	isDeleting: boolean;
}

/**
 * Container component managing all file browser dialogs
 */
export function FileBrowserDialogs({
	renameItem,
	onRename,
	isRenaming,
	deleteItem,
	onDelete,
	deleteSelection,
	onDeleteSelection,
	deleteSelectionStats,
	moveSelection,
	onMove,
	moveExcludeFolderIds,
	currentFolderId,
	shareItem,
	onShareClose,
	propertiesItem,
	onPropertiesClose,
	createFolderOpen,
	onCreateFolderOpenChange,
	onCreateFolder,
	isCreatingFolder,
	isDeleting,
}: FileBrowserDialogsProps): React.ReactNode {
	return (
		<>
			<RenameDialog
				open={!!renameItem}
				onOpenChange={(open) => !open && !isRenaming}
				currentName={renameItem?.name ?? ""}
				onRename={onRename}
				isRenaming={isRenaming}
			/>

			<DeleteConfirmDialog
				open={!!deleteItem}
				onOpenChange={(open) => !open && !isDeleting}
				itemName={deleteItem?.name ?? ""}
				itemType={deleteItem && isFile(deleteItem) ? "file" : "folder"}
				onConfirm={onDelete}
				isDeleting={isDeleting}
			/>

			<BulkDeleteConfirmDialog
				open={deleteSelection.length > 0}
				onOpenChange={(open) => !open && deleteSelection.length === 0}
				itemCount={deleteSelectionStats.total}
				fileCount={deleteSelectionStats.files}
				folderCount={deleteSelectionStats.folders}
				onConfirm={onDeleteSelection}
				isDeleting={isDeleting}
			/>

			<MoveItemsDialog
				open={moveSelection.length > 0}
				onOpenChange={(open) => !open && moveSelection.length === 0}
				itemCount={moveSelection.length}
				initialFolderId={currentFolderId ?? null}
				excludeFolderIds={moveExcludeFolderIds}
				onMove={onMove}
			/>

			{shareItem && (
				<CreateShareModal
					type={isFile(shareItem) ? "file" : "folder"}
					targetId={shareItem.id}
					targetName={shareItem.name}
					isOpen={!!shareItem}
					onClose={onShareClose}
				/>
			)}

			{propertiesItem && (
				<FileProperties
					open={!!propertiesItem}
					onOpenChange={(open) => !open && onPropertiesClose()}
					item={propertiesItem}
				/>
			)}

			<CreateFolderDialog
				onCreateFolder={onCreateFolder}
				isCreating={isCreatingFolder}
				open={createFolderOpen}
				onOpenChange={onCreateFolderOpenChange}
			/>
		</>
	);
}
