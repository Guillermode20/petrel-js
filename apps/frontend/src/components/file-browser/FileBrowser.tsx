import type { File, Folder } from "@petrel/shared";
import { useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { useCallback, useMemo, useRef } from "react";
import { toast } from "sonner";
import type { ContextMenuActionHandler, MenuContext } from "@/components/global-context-menu";
import {
	toClipboardItem,
	useContextMenuActions,
	useContextMenuClipboardActions,
	useContextMenuClipboardState,
	useContextMenuKeyboardShortcuts,
} from "@/components/global-context-menu";
import { buildBreadcrumbSegments, FolderBreadcrumb } from "@/components/navigation";
import { PageBar } from "@/components/navigation/PageBar";
import { useFiles, useZipDownload } from "@/hooks";
import { api } from "@/lib/api";
import { logger } from "@/lib/logger";
import { FileBrowserDialogs } from "./FileBrowserDialogs";
import { FileBrowserStatusBar } from "./FileBrowserStatusBar";
import { FileBrowserToolbar } from "./FileBrowserToolbar";
import { FileGrid } from "./FileGrid";
import { FileList } from "./FileList";
import {
	useFileBrowserContextMenuHandler,
	useFileBrowserDialogs,
	useFileBrowserState,
	useFileOperations,
	useFileUploads,
} from "./hooks";
import { UploadBar, UploadProgressList } from "./UploadZone";
import { getSelectionKey, isFile, isFolder, parseSelectionKey } from "./utils/selection";

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

	// Global context menu
	const { open: openContextMenu } = useContextMenuActions();
	const { items: clipboardItems } = useContextMenuClipboardState();
	const { clear: clearClipboard, setItems: setClipboardItems } = useContextMenuClipboardActions();

	// Fetch files
	const { data, isLoading } = useFiles({ folderId, page: 1, limit: 40, search: undefined });

	// Hooks
	const browserState = useFileBrowserState({
		folderId,
		items: data?.items ?? [],
		onClearClipboard: clearClipboard,
	});
	const fileOps = useFileOperations();
	const fileUploads = useFileUploads({ folderId });
	const dialogs = useFileBrowserDialogs();
	const { startDownload: startZipDownload } = useZipDownload();

	// Derived state
	const sortedItems = useMemo(() => {
		if (!data?.items) return [];
		return [...data.items.filter(isFolder), ...data.items.filter(isFile)];
	}, [data?.items]);

	const selectedItems = useMemo(
		() => sortedItems.filter((item) => browserState.selectedIds.has(getSelectionKey(item))),
		[sortedItems, browserState.selectedIds],
	);

	const selectionStats = useMemo(
		() => ({
			count: selectedItems.length,
			size: selectedItems.reduce((acc, item) => (isFile(item) ? acc + item.size : acc), 0),
		}),
		[selectedItems],
	);

	const breadcrumbSegments = useMemo(
		() =>
			buildBreadcrumbSegments({
				chain: data?.parentChain,
				path: folderPath ?? data?.currentFolder?.path ?? "",
			}),
		[folderPath, data?.currentFolder, data?.parentChain],
	);

	// Handlers
	const handleOpen = useCallback(
		(item: File | Folder) => {
			if (isFolder(item)) {
				navigate({ to: "/files/$folderId", params: { folderId: String(item.id) } });
			} else {
				if (item.mimeType.startsWith("video/")) {
					void api
						.prepareStream(item.id)
						.then((result: { ready: boolean; firstSegmentUrl?: string }) => {
							if (result.ready && result.firstSegmentUrl) {
								const token = localStorage.getItem("petrel_access_token");
								void fetch(result.firstSegmentUrl, {
									method: "GET",
									headers: token ? { Authorization: `Bearer ${token}` } : {},
								});
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
			toast.error("Folder download is not supported yet");
			return;
		}
		window.open(api.getDownloadUrl(item.id), "_blank");
	}, []);

	const handleDownloadZip = useCallback(async () => {
		const fileIds: number[] = [];
		const folderIds: number[] = [];
		for (const key of browserState.selectedIds) {
			const parsed = parseSelectionKey(key);
			if (parsed?.type === "file") fileIds.push(parsed.id);
			else if (parsed?.type === "folder") folderIds.push(parsed.id);
		}
		if (fileIds.length === 0 && folderIds.length === 0) {
			toast.error("No files or folders selected for ZIP download");
			return;
		}
		await startZipDownload(fileIds, folderIds);
	}, [browserState.selectedIds, startZipDownload]);

	const handleCopyLink = useCallback((item: File | Folder) => {
		void navigator.clipboard.writeText(
			`${window.location.origin}/files/${isFolder(item) ? item.id : `preview/${item.id}`}`,
		);
		toast.success("Link copied to clipboard");
	}, []);

	const handleCreateFolder = useCallback(
		async (name: string) => {
			await fileOps.createFolder(name, folderId);
		},
		[fileOps, folderId],
	);

	const handleRename = useCallback(
		async (newName: string) => {
			if (!dialogs.renameItem) return;
			await fileOps.rename(dialogs.renameItem, newName);
			dialogs.setRenameItem(null);
		},
		[fileOps, dialogs.renameItem, dialogs.setRenameItem],
	);

	const handleDelete = useCallback(async () => {
		if (!dialogs.deleteItem) return;
		await fileOps.remove(dialogs.deleteItem);
		dialogs.setDeleteItem(null);
		browserState.clearSelection();
	}, [fileOps, dialogs.deleteItem, dialogs.setDeleteItem, browserState]);

	const handleDeleteSelection = useCallback(async () => {
		await fileOps.removeMany(dialogs.deleteSelection);
		dialogs.setDeleteSelection([]);
		browserState.clearSelection();
	}, [fileOps, dialogs.deleteSelection, dialogs.setDeleteSelection, browserState]);

	const handleMoveSelection = useCallback(
		async (targetFolderId: number | null) => {
			await fileOps.moveMany(dialogs.moveSelection, targetFolderId);
			dialogs.setMoveSelection([]);
			browserState.clearSelection();
		},
		[fileOps, dialogs.moveSelection, dialogs.setMoveSelection, browserState],
	);

	const handleUpload = useCallback(
		async (files: FileList) => {
			await fileUploads.addUploads(files);
		},
		[fileUploads],
	);

	const handleRefresh = useCallback(() => {
		void queryClient.invalidateQueries({ queryKey: ["files"] });
		toast.success("Refreshed");
	}, [queryClient]);

	const handleFileInputChange = useCallback(
		(e: React.ChangeEvent<HTMLInputElement>) => {
			if (e.target.files?.length) {
				void handleUpload(e.target.files);
				e.target.value = "";
			}
		},
		[handleUpload],
	);

	// Context menu
	const buildMenuContext = useCallback(
		(item: File | Folder): MenuContext =>
			browserState.selectedIds.size > 1
				? { type: "multi-selection", items: selectedItems, selectedIds: browserState.selectedIds }
				: isFolder(item)
					? { type: "folder", item }
					: { type: "file", item },
		[browserState.selectedIds, selectedItems],
	);

	const contextMenuHandlerId = useFileBrowserContextMenuHandler(
		useCallback<ContextMenuActionHandler>(
			async (action: string, context: MenuContext) => {
				logger.debug("[FileBrowser] Context menu action:", { action, context });
				if (context.type === "file" || context.type === "folder") {
					const item = context.item;
					if (action === "open") return handleOpen(item);
					if (action === "download") return handleDownload(item);
					if (action === "clipboard-copy") {
						setClipboardItems([toClipboardItem(item)]);
						toast.success("Copied");
						return;
					}
					if (action === "share") return dialogs.setShareItem(item);
					if (action === "rename") return dialogs.setRenameItem(item);
					if (action === "move") return dialogs.setMoveSelection([item]);
					if (action === "delete") return dialogs.setDeleteItem(item);
					if (action === "copy-link") return handleCopyLink(item);
					if (action === "properties") return dialogs.setPropertiesItem(item);
				} else if (context.type === "multi-selection") {
					if (action === "download-zip-selected") return void handleDownloadZip();
					if (action === "clipboard-copy-selected") {
						setClipboardItems(context.items.map(toClipboardItem));
						toast.success("Copied selection");
						return;
					}
					if (action === "share-selected") {
						const first = selectedItems[0];
						if (first) dialogs.setShareItem(first);
						return;
					}
					if (action === "delete-selected") return dialogs.setDeleteSelection(selectedItems);
					if (action === "clear-selection") return browserState.clearSelection();
					if (action === "move-selected") return dialogs.setMoveSelection(selectedItems);
				} else if (context.type === "empty-space") {
					if (action === "upload") return fileInputRef.current?.click();
					if (action === "new-folder") return dialogs.setIsCreateFolderOpen(true);
					if (action === "refresh") return handleRefresh();
					if (action === "view-grid") return browserState.setViewMode("grid");
					if (action === "view-list") return browserState.setViewMode("list");
					if (action === "paste" && clipboardItems.length > 0) {
						for (const item of clipboardItems)
							await fileOps.move({ id: item.id, type: item.kind }, context.folderId ?? null);
						clearClipboard();
						toast.success("Pasted");
					}
				}
			},
			[
				handleOpen,
				handleDownload,
				handleDownloadZip,
				handleCopyLink,
				handleRefresh,
				selectedItems,
				browserState,
				clipboardItems,
				setClipboardItems,
				clearClipboard,
				fileOps,
				dialogs,
			],
		),
	);

	const handleContextMenu = useCallback(
		(item: File | Folder, event: React.MouseEvent) => {
			event.preventDefault();
			event.stopPropagation();
			openContextMenu(
				{ x: event.clientX, y: event.clientY },
				buildMenuContext(item),
				contextMenuHandlerId,
			);
		},
		[buildMenuContext, contextMenuHandlerId, openContextMenu],
	);

	const handleBackgroundContextMenu = useCallback(
		(event: React.MouseEvent) => {
			event.preventDefault();
			openContextMenu(
				{ x: event.clientX, y: event.clientY },
				browserState.selectedIds.size > 1
					? { type: "multi-selection", items: selectedItems, selectedIds: browserState.selectedIds }
					: { type: "empty-space", folderId },
				contextMenuHandlerId,
			);
		},
		[contextMenuHandlerId, folderId, openContextMenu, browserState.selectedIds, selectedItems],
	);

	useContextMenuKeyboardShortcuts({
		getContext: () => {
			if (browserState.selectedIds.size === 0) return null;
			if (browserState.selectedIds.size > 1) {
				return {
					context: {
						type: "multi-selection",
						items: selectedItems,
						selectedIds: browserState.selectedIds,
					},
					handlerId: contextMenuHandlerId,
				};
			}
			const firstKey = browserState.selectedIds.values().next().value as string | undefined;
			if (!firstKey) return null;
			const item = sortedItems.find((i) => getSelectionKey(i) === firstKey);
			if (!item) return null;
			return {
				context: isFolder(item) ? { type: "folder", item } : { type: "file", item },
				handlerId: contextMenuHandlerId,
			};
		},
	});

	// Render
	return (
		<div className="space-y-4">
			<input
				ref={fileInputRef}
				type="file"
				multiple
				className="hidden"
				onChange={handleFileInputChange}
			/>
			<FolderBreadcrumb segments={breadcrumbSegments} onMove={fileOps.move} />
			<FileBrowserToolbar
				searchQuery={browserState.searchQuery}
				onSearchChange={browserState.setSearchQuery}
				viewMode={browserState.viewMode}
				onViewModeChange={browserState.setViewMode}
				sortBy={browserState.sortBy}
				sortOrder={browserState.sortOrder}
				onSortChange={(sortBy, sortOrder) => {
					browserState.setSortBy(sortBy);
					browserState.setSortOrder(sortOrder);
				}}
				onCreateFolder={handleCreateFolder}
				isCreatingFolder={fileOps.isCreatingFolder}
				createFolderOpen={dialogs.isCreateFolderOpen}
				onCreateFolderOpenChange={dialogs.setIsCreateFolderOpen}
			/>
			<UploadBar onUpload={handleUpload} />
			<div className="min-h-[200px]" onContextMenu={handleBackgroundContextMenu}>
				{browserState.viewMode === "grid" ? (
					<FileGrid
						items={sortedItems}
						selectedIds={browserState.selectedIds}
						onSelect={browserState.toggleSelection}
						onOpen={handleOpen}
						onContextMenu={handleContextMenu}
						onMove={fileOps.move}
						onRename={dialogs.setRenameItem}
						onDelete={dialogs.setDeleteItem}
						onShare={dialogs.setShareItem}
						onDownload={handleDownload}
						onDownloadZip={handleDownloadZip}
						onCopyLink={handleCopyLink}
						isLoading={isLoading}
						contextMenuHandlerId={contextMenuHandlerId}
						currentFolderPath={data?.currentFolder?.path ?? null}
						searchQuery={browserState.searchQuery}
					/>
				) : (
					<FileList
						items={sortedItems}
						selectedIds={browserState.selectedIds}
						onSelect={browserState.toggleSelection}
						onOpen={handleOpen}
						onContextMenu={handleContextMenu}
						onMove={fileOps.move}
						onRename={dialogs.setRenameItem}
						onDelete={dialogs.setDeleteItem}
						onShare={dialogs.setShareItem}
						onDownload={handleDownload}
						onDownloadZip={handleDownloadZip}
						onCopyLink={handleCopyLink}
						sortBy={browserState.sortBy}
						sortOrder={browserState.sortOrder}
						onSort={browserState.handleSort}
						isLoading={isLoading}
						contextMenuHandlerId={contextMenuHandlerId}
						currentFolderPath={data?.currentFolder?.path ?? null}
						searchQuery={browserState.searchQuery}
					/>
				)}
			</div>
			<UploadProgressList
				uploads={fileUploads.uploads}
				onCancel={fileUploads.cancelUpload}
				onDismiss={fileUploads.removeUpload}
			/>
			<PageBar>
				<FileBrowserStatusBar
					selectionCount={selectionStats.count}
					selectionSize={selectionStats.size}
					totalItems={data?.total ?? 0}
					currentItemsCount={data?.items.length ?? 0}
					currentPage={browserState.page}
					totalPages={data ? Math.ceil(data.total / data.limit) : 1}
					onPageChange={browserState.setPage}
				/>
			</PageBar>
			<FileBrowserDialogs
				renameItem={dialogs.renameItem}
				onRename={handleRename}
				isRenaming={fileOps.isRenaming}
				deleteItem={dialogs.deleteItem}
				onDelete={handleDelete}
				deleteSelection={dialogs.deleteSelection}
				onDeleteSelection={handleDeleteSelection}
				deleteSelectionStats={dialogs.deleteSelectionStats}
				moveSelection={dialogs.moveSelection}
				onMove={handleMoveSelection}
				moveExcludeFolderIds={dialogs.moveExcludeFolderIds}
				currentFolderId={folderId}
				shareItem={dialogs.shareItem}
				onShareClose={() => dialogs.setShareItem(null)}
				propertiesItem={dialogs.propertiesItem}
				onPropertiesClose={() => dialogs.setPropertiesItem(null)}
				createFolderOpen={dialogs.isCreateFolderOpen}
				onCreateFolderOpenChange={dialogs.setIsCreateFolderOpen}
				onCreateFolder={handleCreateFolder}
				isCreatingFolder={fileOps.isCreatingFolder}
				isDeleting={fileOps.isDeleting}
			/>
		</div>
	);
}
