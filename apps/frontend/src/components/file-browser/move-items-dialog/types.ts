export interface MoveItemsDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	itemCount: number;
	initialFolderId?: number | null;
	/** Folder IDs that are part of the move selection — these are excluded from the target list */
	excludeFolderIds?: Set<number>;
	onMove: (targetFolderId: number | null) => Promise<void>;
}
