import type { File, Folder } from "@petrel/shared";
import { useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { buildBreadcrumbSegments, FolderBreadcrumb } from "@/components/navigation";
import { CreateShareModal } from "@/components/sharing";
import {
	useCreateFolder,
	useDeleteFile,
	useFiles,
	useUpdateFile,
	useUpdateFolder,
	useUploadFile,
	useZipDownload,
} from "@/hooks";
import { api } from "@/lib/api";
import { EmptySpaceContextMenu } from "./EmptySpaceContextMenu";
import { CreateFolderDialog, DeleteConfirmDialog, RenameDialog } from "./FileDialogs";
import { FileGrid } from "./FileGrid";
import { FileList } from "./FileList";
import { MultiSelectionContextMenu } from "./MultiSelectionContextMenu";
import { SearchBar } from "./SearchBar";
import { SortDropdown } from "./SortDropdown";
import type { SortField, UploadProgress, ViewMode } from "./types";
import { UploadBar, UploadProgressList } from "./UploadZone";
import { isFile, isFolder, parseSelectionKey } from "./utils/selection";
import { ViewToggle } from "./ViewToggle";

interface FileBrowserProps {
	folderId?: number;
	folderPath?: string;
}

/**
 * Main file browser component with grid/list views, search, sort, and upload
 */
export function FileBrowser({ folderId, folderPath }: FileBrowserProps) {
	const navigate = useNavigate();
	const queryClient = useQueryClient();
	const fileInputRef = useRef<HTMLInputElement>(null);
	const [isCreateFolderOpen, setIsCreateFolderOpen] = useState(false);

	// View state
	const [viewMode, setViewMode] = useState<ViewMode>("grid");
	const [sortBy, setSortBy] = useState<SortField>("name");
	const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
	const [searchQuery, setSearchQuery] = useState("");
	const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

	// Dialog state
	const [renameItem, setRenameItem] = useState<File | Folder | null>(null);
	const [deleteItem, setDeleteItem] = useState<File | Folder | null>(null);
	const [shareItem, setShareItem] = useState<File | Folder | null>(null);

	// Upload state
	const [uploads, setUploads] = useState<UploadProgress[]>([]);

	// Helper to get selection key
	const getSelectionKey = (item: File | Folder) =>
		`${isFolder(item) ? "folder" : "file"}-${item.id}`;

	// Queries
	const { data, isLoading } = useFiles({
		folderId,
		sort: sortBy,
		order: sortOrder,
		search: searchQuery || undefined,
	});

	// Clear selection when folder changes
	useEffect(() => {
		setSelectedIds(new Set());
	}, []);

	const updateMutation = useUpdateFile();
	const updateFolderMutation = useUpdateFolder();
	const createFolderMutation = useCreateFolder();
	const uploadMutation = useUploadFile();
	const deleteMutation = useDeleteFile();
	const pendingZipToastRef = useRef<string | number | undefined>(undefined);
	const { startDownload: startZipDownload } = useZipDownload({
		onComplete: () => {
			if (pendingZipToastRef.current) {
				toast.success("ZIP download started", { id: pendingZipToastRef.current });
				pendingZipToastRef.current = undefined;
			} else {
				toast.success("ZIP download started");
			}
		},
		onError: (error) => {
			const message = error || "Failed to create ZIP archive";
			if (pendingZipToastRef.current) {
				toast.error(message, { id: pendingZipToastRef.current });
				pendingZipToastRef.current = undefined;
			} else {
				toast.error(message);
			}
		},
	});

	// Sort items - folders first, then files
	const sortedItems = useMemo(() => {
		if (!data?.items) return [];
		const folders = data.items.filter(isFolder);
		const files = data.items.filter(isFile);
		return [...folders, ...files];
	}, [data?.items]);

	// Breadcrumb segments
	const breadcrumbSegments = useMemo(
		() =>
			buildBreadcrumbSegments({
				chain: data?.parentChain,
				path: folderPath ?? data?.currentFolder?.path ?? "",
			}),
		[folderPath, data?.currentFolder, data?.parentChain],
	);

	// Handlers
	const handleSelect = useCallback(
		(item: File | Folder, event: React.MouseEvent) => {
			const key = getSelectionKey(item);
			if (event.shiftKey || event.ctrlKey || event.metaKey) {
				setSelectedIds((prev) => {
					const next = new Set(prev);
					if (next.has(key)) {
						next.delete(key);
					} else {
						next.add(key);
					}
					return next;
				});
			} else {
				setSelectedIds(new Set([key]));
			}
		},
		[getSelectionKey],
	);

	const handleOpen = useCallback(
		(item: File | Folder) => {
			if (isFolder(item)) {
				navigate({ to: "/files/$folderId", params: { folderId: String(item.id) } });
			} else {
				// Pre-warm stream for video files before navigation
				if (item.mimeType.startsWith("video/")) {
					void api.prepareStream(item.id).then((result) => {
						// Pre-fetch first segment in parallel while navigating
						if (result.ready && result.firstSegmentUrl) {
							const token = localStorage.getItem("petrel_access_token");
							const headers: HeadersInit = token ? { Authorization: `Bearer ${token}` } : {};
							void fetch(result.firstSegmentUrl, { method: "GET", headers });
						}
					});
				}
				navigate({
					to: "/files/preview/$fileId",
					params: { fileId: String(item.id) },
					search: { fromFolder: folderId ? String(folderId) : undefined },
				});
			}
		},
		[navigate, folderId],
	);

	const handleDownload = useCallback((item: File | Folder) => {
		if (isFolder(item)) {
			// Folders cannot be downloaded directly currently
			toast.error("Folder download is not supported yet");
			return;
		}
		window.open(api.getDownloadUrl(item.id), "_blank");
	}, []);

	const handleCopyLink = useCallback((item: File | Folder) => {
		const url = `${window.location.origin}/files/${isFolder(item) ? item.id : `preview/${item.id}`}`;
		navigator.clipboard.writeText(url);
		toast.success("Link copied to clipboard");
	}, []);

	const handleCopyShareLink = useCallback(async (item: File | Folder) => {
		try {
			const share = await api.createShare({
				type: isFolder(item) ? "folder" : "file",
				targetId: item.id,
				allowDownload: true,
				allowZip: true,
				showMetadata: true,
			});
			const url = `${window.location.origin}/s/${share.token}`;
			await navigator.clipboard.writeText(url);
			toast.success("Share link copied to clipboard");
		} catch (error) {
			console.error("Failed to create share link:", error);
			const message = error instanceof Error ? error.message : "Unknown error";
			if (message.includes("Unauthorized") || message.includes("null is not an object")) {
				toast.error(
					"You must be logged in to create share links. Please refresh the page and log in.",
				);
			} else {
				toast.error(`Failed to create share link: ${message}`);
			}
		}
	}, []);

	const handleDownloadZip = useCallback(async () => {
		const fileIds: number[] = [];
		const folderIds: number[] = [];

		for (const key of selectedIds) {
			const parsed = parseSelectionKey(key);
			if (!parsed) continue;

			if (parsed.type === "file") {
				fileIds.push(parsed.id);
			} else {
				folderIds.push(parsed.id);
			}
		}

		if (fileIds.length === 0 && folderIds.length === 0) {
			toast.error("No files or folders selected for ZIP download");
			return;
		}

		try {
			const itemCount = fileIds.length + folderIds.length;
			pendingZipToastRef.current = toast.loading(
				`Preparing ZIP archive (${itemCount} item${itemCount === 1 ? "" : "s"})...`,
			);
			await startZipDownload(fileIds, folderIds);
		} catch (error) {
			const message = error instanceof Error ? error.message : "Unknown error";
			if (pendingZipToastRef.current) {
				toast.error(`ZIP download failed: ${message}`, { id: pendingZipToastRef.current });
				pendingZipToastRef.current = undefined;
			} else {
				toast.error(`ZIP download failed: ${message}`);
			}
		}
	}, [selectedIds, startZipDownload]);

	const handleContextMenu = useCallback((_item: File | Folder, _event: React.MouseEvent) => {
		// Context menu is handled by the ContextMenu component
	}, []);

	const handleSortChange = useCallback((newSortBy: SortField, newSortOrder: "asc" | "desc") => {
		setSortBy(newSortBy);
		setSortOrder(newSortOrder);
	}, []);

	const handleSort = useCallback(
		(field: SortField) => {
			if (sortBy === field) {
				setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"));
			} else {
				setSortBy(field);
				setSortOrder("asc");
			}
		},
		[sortBy],
	);

	const handleCreateFolder = useCallback(
		async (name: string) => {
			await createFolderMutation.mutateAsync({ name, parentId: folderId });
			toast.success(`Folder "${name}" created`);
		},
		[createFolderMutation, folderId],
	);

	const handleRename = useCallback(
		async (newName: string) => {
			if (!renameItem) return;
			if (isFolder(renameItem)) {
				await updateFolderMutation.mutateAsync({ id: renameItem.id, data: { name: newName } });
			} else {
				await updateMutation.mutateAsync({ id: renameItem.id, data: { name: newName } });
			}
			toast.success(`Renamed to "${newName}"`);
			setRenameItem(null);
		},
		[updateMutation, updateFolderMutation, renameItem],
	);

	const handleMove = useCallback(
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
			}
		},
		[updateMutation, updateFolderMutation],
	);

	const handleDelete = useCallback(async () => {
		if (!deleteItem) return;
		await deleteMutation.mutateAsync(deleteItem.id);
		toast.success(`"${deleteItem.name}" deleted`);
		setDeleteItem(null);
		setSelectedIds((prev) => {
			const next = new Set(prev);
			next.delete(getSelectionKey(deleteItem));
			return next;
		});
	}, [deleteMutation, deleteItem, getSelectionKey]);

	const handleUpload = useCallback(
		async (files: FileList) => {
			const fileArray = Array.from(files);
			const newUploads: UploadProgress[] = fileArray.map((file) => ({
				file,
				progress: 0,
				status: "pending" as const,
			}));
			setUploads((prev) => [...prev, ...newUploads]);

			for (const file of fileArray) {
				setUploads((prev) =>
					prev.map((u) => (u.file === file ? { ...u, status: "uploading" as const } : u)),
				);

				try {
					await uploadMutation.mutateAsync({
						file,
						folderId,
						onProgress: (progress) => {
							setUploads((prev) => prev.map((u) => (u.file === file ? { ...u, progress } : u)));
						},
					});
					setUploads((prev) =>
						prev.map((u) =>
							u.file === file ? { ...u, status: "completed" as const, progress: 100 } : u,
						),
					);
				} catch (error) {
					setUploads((prev) =>
						prev.map((u) =>
							u.file === file
								? { ...u, status: "error" as const, error: (error as Error).message }
								: u,
						),
					);
				}
			}
		},
		[uploadMutation, folderId],
	);

	const handleDismissUpload = useCallback((file: globalThis.File) => {
		setUploads((prev) => prev.filter((u) => u.file !== file));
	}, []);

	const handleCancelUpload = useCallback((file: globalThis.File) => {
		setUploads((prev) => {
			const upload = prev.find((u) => u.file === file);
			if (!upload) return prev;

			if (upload.status === "uploading") {
				toast.error("Upload cancel is not supported yet");
				return prev;
			}

			return prev.filter((u) => u.file !== file);
		});
	}, []);

	// Empty space context menu handlers
	const handleEmptySpaceUpload = useCallback(() => {
		fileInputRef.current?.click();
	}, []);

	const handleEmptySpaceNewFolder = useCallback(() => {
		setIsCreateFolderOpen(true);
	}, []);

	const handleRefresh = useCallback(() => {
		void queryClient.invalidateQueries({ queryKey: ["files"] });
		toast.success("Refreshed");
	}, [queryClient]);

	// Multi-selection handlers
	const handleClearSelection = useCallback(() => {
		setSelectedIds(new Set());
	}, []);

	const handleDeleteSelected = useCallback(() => {
		// For now, delete first selected item (bulk delete needs confirmation dialog update)
		const firstKey = Array.from(selectedIds)[0];
		if (!firstKey) return;
		const parsed = parseSelectionKey(firstKey);
		if (!parsed) return;
		const item = sortedItems.find(
			(i) => i.id === parsed.id && (isFile(i) ? "file" : "folder") === parsed.type,
		);
		if (item) setDeleteItem(item);
	}, [selectedIds, sortedItems]);

	const handleShareSelected = useCallback(() => {
		// Share first selected item (or could create folder share for multiple)
		const firstKey = Array.from(selectedIds)[0];
		if (!firstKey) return;
		const parsed = parseSelectionKey(firstKey);
		if (!parsed) return;
		const item = sortedItems.find(
			(i) => i.id === parsed.id && (isFile(i) ? "file" : "folder") === parsed.type,
		);
		if (item) setShareItem(item);
	}, [selectedIds, sortedItems]);

	const handleFileInputChange = useCallback(
		(e: React.ChangeEvent<HTMLInputElement>) => {
			const files = e.target.files;
			if (files && files.length > 0) {
				void handleUpload(files);
			}
			// Reset input so same file can be selected again
			e.target.value = "";
		},
		[handleUpload],
	);

	const hasMultipleSelected = selectedIds.size > 1;

	return (
		<div className="space-y-4">
			{/* Hidden file input for context menu upload */}
			<input
				ref={fileInputRef}
				type="file"
				multiple
				className="hidden"
				onChange={handleFileInputChange}
			/>

			{/* Breadcrumb */}
			<FolderBreadcrumb segments={breadcrumbSegments} onMove={handleMove} />

			{/* Toolbar */}
			<div className="flex flex-wrap items-center justify-between gap-4">
				<div className="flex items-center gap-2">
					<SearchBar value={searchQuery} onChange={setSearchQuery} className="w-48 sm:w-64" />
				</div>
				<div className="flex items-center gap-2">
					<CreateFolderDialog
						onCreateFolder={handleCreateFolder}
						isCreating={createFolderMutation.isPending}
						open={isCreateFolderOpen}
						onOpenChange={setIsCreateFolderOpen}
					/>
					<SortDropdown sortBy={sortBy} sortOrder={sortOrder} onSortChange={handleSortChange} />
					<ViewToggle viewMode={viewMode} onViewModeChange={setViewMode} />
				</div>
			</div>

			{/* Upload bar (persistent) */}
			<UploadBar onUpload={handleUpload} />

			{/* File list/grid with empty space context menu */}
			<EmptySpaceContextMenu
				viewMode={viewMode}
				onUpload={handleEmptySpaceUpload}
				onNewFolder={handleEmptySpaceNewFolder}
				onRefresh={handleRefresh}
				onViewModeChange={setViewMode}
			>
				<div className="min-h-[200px]">
					{hasMultipleSelected ? (
						<MultiSelectionContextMenu
							selectedCount={selectedIds.size}
							onDownloadZip={handleDownloadZip}
							onShareSelected={handleShareSelected}
							onDeleteSelected={handleDeleteSelected}
							onClearSelection={handleClearSelection}
						>
							<div>
								{viewMode === "grid" ? (
									<FileGrid
										items={sortedItems}
										selectedIds={selectedIds}
										onSelect={handleSelect}
										onOpen={handleOpen}
										onContextMenu={handleContextMenu}
										onMove={handleMove}
										onRename={setRenameItem}
										onDelete={setDeleteItem}
										onShare={setShareItem}
										onDownload={handleDownload}
										onDownloadZip={handleDownloadZip}
										onCopyLink={handleCopyLink}
										onCopyShareLink={handleCopyShareLink}
										isLoading={isLoading}
									/>
								) : (
									<FileList
										items={sortedItems}
										selectedIds={selectedIds}
										onSelect={handleSelect}
										onOpen={handleOpen}
										onContextMenu={handleContextMenu}
										onMove={handleMove}
										onRename={setRenameItem}
										onDelete={setDeleteItem}
										onShare={setShareItem}
										onDownload={handleDownload}
										onDownloadZip={handleDownloadZip}
										onCopyLink={handleCopyLink}
										onCopyShareLink={handleCopyShareLink}
										sortBy={sortBy}
										sortOrder={sortOrder}
										onSort={handleSort}
										isLoading={isLoading}
									/>
								)}
							</div>
						</MultiSelectionContextMenu>
					) : (
						<>
							{viewMode === "grid" ? (
								<FileGrid
									items={sortedItems}
									selectedIds={selectedIds}
									onSelect={handleSelect}
									onOpen={handleOpen}
									onContextMenu={handleContextMenu}
									onMove={handleMove}
									onRename={setRenameItem}
									onDelete={setDeleteItem}
									onShare={setShareItem}
									onDownload={handleDownload}
									onDownloadZip={handleDownloadZip}
									onCopyLink={handleCopyLink}
									onCopyShareLink={handleCopyShareLink}
									isLoading={isLoading}
								/>
							) : (
								<FileList
									items={sortedItems}
									selectedIds={selectedIds}
									onSelect={handleSelect}
									onOpen={handleOpen}
									onContextMenu={handleContextMenu}
									onMove={handleMove}
									onRename={setRenameItem}
									onDelete={setDeleteItem}
									onShare={setShareItem}
									onDownload={handleDownload}
									onDownloadZip={handleDownloadZip}
									onCopyLink={handleCopyLink}
									onCopyShareLink={handleCopyShareLink}
									sortBy={sortBy}
									sortOrder={sortOrder}
									onSort={handleSort}
									isLoading={isLoading}
								/>
							)}
						</>
					)}
				</div>
			</EmptySpaceContextMenu>

			{/* Upload progress */}
			<UploadProgressList
				uploads={uploads}
				onCancel={handleCancelUpload}
				onDismiss={handleDismissUpload}
			/>

			{/* Dialogs */}
			<RenameDialog
				open={!!renameItem}
				onOpenChange={(open) => !open && setRenameItem(null)}
				currentName={renameItem?.name ?? ""}
				onRename={handleRename}
				isRenaming={updateMutation.isPending}
			/>

			<DeleteConfirmDialog
				open={!!deleteItem}
				onOpenChange={(open) => !open && setDeleteItem(null)}
				itemName={deleteItem?.name ?? ""}
				itemType={deleteItem && isFile(deleteItem) ? "file" : "folder"}
				onConfirm={handleDelete}
				isDeleting={deleteMutation.isPending}
			/>

			{shareItem && (
				<CreateShareModal
					type={isFolder(shareItem) ? "folder" : "file"}
					targetId={shareItem.id}
					targetName={shareItem.name}
					isOpen={!!shareItem}
					onClose={() => setShareItem(null)}
				/>
			)}
		</div>
	);
}
