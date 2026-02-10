import type { File, Folder } from "@petrel/shared";
import { useCallback, useMemo, useState } from "react";
import { isFile, isFolder } from "../utils/selection";

interface UseFileBrowserDialogsReturn {
	// Dialog state
	renameItem: File | Folder | null;
	deleteItem: File | Folder | null;
	deleteSelection: Array<File | Folder>;
	moveSelection: Array<File | Folder>;
	shareItem: File | Folder | null;
	propertiesItem: File | Folder | null;
	isCreateFolderOpen: boolean;

	// Dialog setters
	setRenameItem: (item: File | Folder | null) => void;
	setDeleteItem: (item: File | Folder | null) => void;
	setDeleteSelection: (items: Array<File | Folder>) => void;
	setMoveSelection: (items: Array<File | Folder>) => void;
	setShareItem: (item: File | Folder | null) => void;
	setPropertiesItem: (item: File | Folder | null) => void;
	setIsCreateFolderOpen: (open: boolean) => void;

	// Helper actions
	openRenameDialog: (item: File | Folder) => void;
	openDeleteDialog: (item: File | Folder) => void;
	openDeleteSelectionDialog: (items: Array<File | Folder>) => void;
	openMoveDialog: (items: Array<File | Folder>) => void;
	openShareDialog: (item: File | Folder) => void;
	openPropertiesDialog: (item: File | Folder) => void;
	openCreateFolderDialog: () => void;
	closeAllDialogs: () => void;

	// Derived state
	deleteSelectionStats: { files: number; folders: number; total: number };
	moveExcludeFolderIds: Set<number>;
}

/**
 * Manages dialog state for the file browser including rename, delete, move,
 * share, and properties dialogs.
 */
export function useFileBrowserDialogs(): UseFileBrowserDialogsReturn {
	const [renameItem, setRenameItem] = useState<File | Folder | null>(null);
	const [deleteItem, setDeleteItem] = useState<File | Folder | null>(null);
	const [deleteSelection, setDeleteSelection] = useState<Array<File | Folder>>([]);
	const [moveSelection, setMoveSelection] = useState<Array<File | Folder>>([]);
	const [shareItem, setShareItem] = useState<File | Folder | null>(null);
	const [propertiesItem, setPropertiesItem] = useState<File | Folder | null>(null);
	const [isCreateFolderOpen, setIsCreateFolderOpen] = useState(false);

	const openRenameDialog = useCallback((item: File | Folder) => {
		setRenameItem(item);
	}, []);

	const openDeleteDialog = useCallback((item: File | Folder) => {
		setDeleteItem(item);
	}, []);

	const openDeleteSelectionDialog = useCallback((items: Array<File | Folder>) => {
		setDeleteSelection(items);
	}, []);

	const openMoveDialog = useCallback((items: Array<File | Folder>) => {
		setMoveSelection(items);
	}, []);

	const openShareDialog = useCallback((item: File | Folder) => {
		setShareItem(item);
	}, []);

	const openPropertiesDialog = useCallback((item: File | Folder) => {
		setPropertiesItem(item);
	}, []);

	const openCreateFolderDialog = useCallback(() => {
		setIsCreateFolderOpen(true);
	}, []);

	const closeAllDialogs = useCallback(() => {
		setRenameItem(null);
		setDeleteItem(null);
		setDeleteSelection([]);
		setMoveSelection([]);
		setShareItem(null);
		setPropertiesItem(null);
		setIsCreateFolderOpen(false);
	}, []);

	const deleteSelectionStats = useMemo(() => {
		const files = deleteSelection.filter(isFile).length;
		const folders = deleteSelection.filter(isFolder).length;
		return { files, folders, total: deleteSelection.length };
	}, [deleteSelection]);

	const moveExcludeFolderIds = useMemo(
		() => new Set(moveSelection.filter(isFolder).map((f) => f.id)),
		[moveSelection],
	);

	return {
		renameItem,
		deleteItem,
		deleteSelection,
		moveSelection,
		shareItem,
		propertiesItem,
		isCreateFolderOpen,
		setRenameItem,
		setDeleteItem,
		setDeleteSelection,
		setMoveSelection,
		setShareItem,
		setPropertiesItem,
		setIsCreateFolderOpen,
		openRenameDialog,
		openDeleteDialog,
		openDeleteSelectionDialog,
		openMoveDialog,
		openShareDialog,
		openPropertiesDialog,
		openCreateFolderDialog,
		closeAllDialogs,
		deleteSelectionStats,
		moveExcludeFolderIds,
	};
}
