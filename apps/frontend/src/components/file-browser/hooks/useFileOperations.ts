import type { File, Folder } from "@petrel/shared";
import { useCallback } from "react";
import { toast } from "sonner";
import {
	useCreateFolder,
	useDeleteFile,
	useDeleteFolder,
	useUpdateFile,
	useUpdateFolder,
} from "@/hooks";
import { isFolder } from "../utils/selection";

interface UseFileOperationsReturn {
	rename: (item: File | Folder, newName: string) => Promise<void>;
	move: (
		item: { id: number; type: "file" | "folder" },
		targetFolderId: number | null,
	) => Promise<void>;
	moveMany: (items: Array<File | Folder>, targetFolderId: number | null) => Promise<void>;
	remove: (item: File | Folder) => Promise<void>;
	removeMany: (items: Array<File | Folder>) => Promise<void>;
	createFolder: (name: string, parentId?: number) => Promise<void>;
	isRenaming: boolean;
	isMoving: boolean;
	isDeleting: boolean;
	isCreatingFolder: boolean;
}

/**
 * Handles all CRUD operations for files and folders with toast notifications.
 * Uses existing mutations from hooks/useFiles.ts.
 */
export function useFileOperations(): UseFileOperationsReturn {
	const updateMutation = useUpdateFile();
	const updateFolderMutation = useUpdateFolder();
	const createFolderMutation = useCreateFolder();
	const deleteMutation = useDeleteFile();
	const deleteFolderMutation = useDeleteFolder();

	const rename = useCallback(
		async (item: File | Folder, newName: string) => {
			try {
				if (isFolder(item)) {
					await updateFolderMutation.mutateAsync({ id: item.id, data: { name: newName } });
				} else {
					await updateMutation.mutateAsync({ id: item.id, data: { name: newName } });
				}
				toast.success(`Renamed to "${newName}"`);
			} catch (error) {
				toast.error(
					`Failed to rename: ${error instanceof Error ? error.message : "Unknown error"}`,
				);
				throw error;
			}
		},
		[updateMutation, updateFolderMutation],
	);

	const move = useCallback(
		async (item: { id: number; type: "file" | "folder" }, targetFolderId: number | null) => {
			try {
				if (item.type === "folder") {
					await updateFolderMutation.mutateAsync({
						id: item.id,
						data: { parentId: targetFolderId },
					});
				} else {
					await updateMutation.mutateAsync({
						id: item.id,
						data: { folderId: targetFolderId },
					});
				}
				toast.success("Item moved successfully");
			} catch (_error) {
				toast.error("Failed to move item");
				throw _error;
			}
		},
		[updateMutation, updateFolderMutation],
	);

	const moveMany = useCallback(
		async (items: Array<File | Folder>, targetFolderId: number | null) => {
			if (items.length === 0) return;

			try {
				const results = await Promise.allSettled(
					items.map((item) =>
						isFolder(item)
							? updateFolderMutation.mutateAsync({
									id: item.id,
									data: { parentId: targetFolderId },
								})
							: updateMutation.mutateAsync({
									id: item.id,
									data: { folderId: targetFolderId },
								}),
					),
				);

				const succeeded = results.filter((r) => r.status === "fulfilled").length;
				const failed = results.filter((r) => r.status === "rejected").length;

				if (failed > 0) {
					toast.error(
						`Failed to move ${failed} of ${items.length} item${items.length === 1 ? "" : "s"}`,
					);
				}
				if (succeeded > 0) {
					toast.success(`Moved ${succeeded} item${succeeded === 1 ? "" : "s"}`);
				}
			} catch (error) {
				toast.error(
					`Failed to move items: ${error instanceof Error ? error.message : "Unknown error"}`,
				);
				throw error;
			}
		},
		[updateFolderMutation, updateMutation],
	);

	const remove = useCallback(
		async (item: File | Folder) => {
			try {
				if (isFolder(item)) {
					await deleteFolderMutation.mutateAsync(item.id);
				} else {
					await deleteMutation.mutateAsync(item.id);
				}
				toast.success(`"${item.name}" deleted`);
			} catch (error) {
				toast.error(
					`Failed to delete: ${error instanceof Error ? error.message : "Unknown error"}`,
				);
				throw error;
			}
		},
		[deleteMutation, deleteFolderMutation],
	);

	const removeMany = useCallback(
		async (items: Array<File | Folder>) => {
			if (items.length === 0) return;

			try {
				const results = await Promise.allSettled(
					items.map((item) =>
						isFolder(item)
							? deleteFolderMutation.mutateAsync(item.id)
							: deleteMutation.mutateAsync(item.id),
					),
				);

				const succeeded = results.filter((r) => r.status === "fulfilled").length;
				const failed = results.filter((r) => r.status === "rejected").length;

				if (failed > 0) {
					toast.error(
						`Failed to delete ${failed} of ${items.length} item${items.length === 1 ? "" : "s"}`,
					);
				}
				if (succeeded > 0) {
					toast.success(`Deleted ${succeeded} item${succeeded === 1 ? "" : "s"}`);
				}
			} catch (error) {
				toast.error(
					`Failed to delete items: ${error instanceof Error ? error.message : "Unknown error"}`,
				);
				throw error;
			}
		},
		[deleteFolderMutation, deleteMutation],
	);

	const createFolder = useCallback(
		async (name: string, parentId?: number) => {
			try {
				await createFolderMutation.mutateAsync({ name, parentId });
				toast.success(`Folder "${name}" created`);
			} catch (error) {
				toast.error(
					`Failed to create folder: ${error instanceof Error ? error.message : "Unknown error"}`,
				);
				throw error;
			}
		},
		[createFolderMutation],
	);

	return {
		rename,
		move,
		moveMany,
		remove,
		removeMany,
		createFolder,
		isRenaming: updateMutation.isPending || updateFolderMutation.isPending,
		isMoving: updateMutation.isPending || updateFolderMutation.isPending,
		isDeleting: deleteMutation.isPending || deleteFolderMutation.isPending,
		isCreatingFolder: createFolderMutation.isPending,
	};
}
