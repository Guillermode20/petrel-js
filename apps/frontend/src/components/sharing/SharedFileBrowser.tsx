import type { File, Folder, ShareSettings } from "@petrel/shared";
import { ChevronRight, FolderIcon, Home } from "lucide-react";
import React, { useState, useCallback } from "react";
import { FileGrid } from "@/components/file-browser/FileGrid";
import { FileList } from "@/components/file-browser/FileList";
import { ViewToggle } from "@/components/file-browser/ViewToggle";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { SortField, ViewMode } from "@/components/file-browser/types";
import { SharedFileContextMenu } from "./SharedFileContextMenu";
import { getSelectionKey, parseSelectionKey } from "@/components/file-browser/utils/selection";
import { api } from "@/lib/api";
import { toast } from "sonner";

export interface BreadcrumbItem {
	folder: Folder;
	index: number;
}

export interface SharedFileBrowserProps {
	folder: Folder;
	files: File[];
	folders: Folder[];
	shareToken: string;
	password?: string;
	settings: ShareSettings;
	onFileOpen: (file: File) => void;
	onFolderOpen: (folder: Folder) => void;
	breadcrumbPath?: BreadcrumbItem[];
	onBreadcrumbClick?: (index: number) => void;
	className?: string;
}

/**
 * SharedFileBrowser - File browser for public shares
 *
 * Reuses the existing FileGrid and FileList components from the regular files UI,
 * but strips out unneeded features like:
 * - Upload functionality
 * - Create folder
 * - Rename/delete/share actions
 * - Move functionality
 * - Context menu actions
 * - Search bar
 *
 * Includes:
 * - Grid/list view toggle
 * - File/folder opening
 * - Download (if allowed by share settings)
 * - Breadcrumb navigation for subfolders
 */
export function SharedFileBrowser({
	folder,
	files,
	folders,
	shareToken,
	password,
	settings,
	onFileOpen,
	onFolderOpen,
	breadcrumbPath = [],
	onBreadcrumbClick,
	className,
}: SharedFileBrowserProps): React.ReactNode {
	const [viewMode, setViewMode] = useState<ViewMode>("grid");
	const [sortBy, setSortBy] = useState<SortField>("name");
	const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
	const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
	const [lastSelectedIndex, setLastSelectedIndex] = useState<number | null>(null);

	// Combine folders and files, folders first
	const items = [...folders, ...files];

	// Handle selection with modifier key support
	const handleSelect = (item: File | Folder, event: React.MouseEvent) => {
		const key = getSelectionKey(item);
		const index = items.findIndex(i => getSelectionKey(i) === key);

		const isCtrlCmd = event.ctrlKey || event.metaKey;
		const isShift = event.shiftKey;

		if (isShift && lastSelectedIndex !== null && items[lastSelectedIndex]) {
			// Range selection
			const start = Math.min(lastSelectedIndex, index);
			const end = Math.max(lastSelectedIndex, index);
			const newSelected = new Set(selectedIds);
			for (let i = start; i <= end; i++) {
				const item = items[i];
				if (item) {
					const itemKey = getSelectionKey(item);
					newSelected.add(itemKey);
				}
			}
			setSelectedIds(newSelected);
		} else if (isCtrlCmd) {
			// Toggle selection
			const newSelected = new Set(selectedIds);
			if (newSelected.has(key)) {
				newSelected.delete(key);
			} else {
				newSelected.add(key);
			}
			setSelectedIds(newSelected);
			setLastSelectedIndex(index);
		} else {
			// Single selection
			setSelectedIds(new Set([key]));
			setLastSelectedIndex(index);
		}
	};

	// Handle ZIP download
	const handleZipDownload = useCallback(async () => {
		if (!settings.allowDownload || !settings.allowZip) return;

		const fileIds: number[] = [];
		for (const key of selectedIds) {
			const parsed = parseSelectionKey(key);
			if (!parsed) continue;

			if (parsed.type === "file") {
				fileIds.push(parsed.id);
			} else {
				// For folders, we need to let the backend handle recursive inclusion
				// or fetch all file IDs within the folder if the backend only accepts files.
				// The backend routes.ts shows it currently expects fileIds in the body.
				// TO-DO: Backend should ideally support folderIds in ZIP request.
				toast.error("Folder ZIP download is not supported yet");
				return;
			}
		}

		if (fileIds.length === 0) {
			toast.error("No files selected for ZIP download");
			return;
		}

		try {
			const { jobId } = await api.createZipDownload(shareToken, fileIds, password);
			
			// Poll for status
			const pollStatus = async () => {
				const status = await api.getZipDownloadStatus(shareToken, jobId, password);
				if (status.status === "completed") {
					window.location.href = api.getZipDownloadUrl(shareToken, jobId, password);
					toast.success("ZIP download started");
				} else if (status.status === "error") {
					toast.error("Failed to create ZIP archive");
				} else {
					setTimeout(pollStatus, 2000);
				}
			};
			
			toast.promise(pollStatus(), {
				loading: "Preparing ZIP archive...",
				success: "ZIP archive ready",
				error: "Failed to prepare ZIP",
			});
		} catch (error) {
			toast.error(`ZIP download failed: ${error instanceof Error ? error.message : "Unknown error"}`);
		}
	}, [selectedIds, shareToken, password, settings.allowDownload, settings.allowZip]);

	// Handle sort
	const handleSort = (field: SortField) => {
		if (sortBy === field) {
			setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"));
		} else {
			setSortBy(field);
			setSortOrder("asc");
		}
	};

	// Handle file opening
	const handleOpen = (item: File | Folder) => {
		if ("mimeType" in item) {
			onFileOpen(item);
		} else {
			onFolderOpen(item);
		}
	};

	// Handle download (only if allowed)
	const handleDownload = (item: File | Folder) => {
		if (!settings.allowDownload) return;
		if ("mimeType" in item) {
			window.open(api.getShareDownloadUrl(shareToken, password, item.id), "_blank");
		}
	};

	return (
		<div className={cn("flex flex-1 flex-col", className)}>
			{/* Toolbar with breadcrumbs */}
			<div className="flex h-10 items-center justify-between border-b border-border px-4">
				<div className="flex items-center gap-1 overflow-hidden">
					{/* Root icon */}
					<Button
						variant="ghost"
						size="sm"
						className="h-6 px-1 text-muted-foreground hover:text-foreground"
						onClick={() => onBreadcrumbClick?.(0)}
						disabled={breadcrumbPath.length === 0}
					>
						<Home className="h-4 w-4" />
					</Button>

					{/* Breadcrumb path */}
					{breadcrumbPath.map((item, index) => (
						<React.Fragment key={item.folder.id}>
							<ChevronRight className="h-3 w-3 shrink-0 text-muted-foreground" />
							<Button
								variant="ghost"
								size="sm"
								className="h-6 max-w-[150px] truncate px-1 text-sm font-medium hover:text-foreground"
								onClick={() => onBreadcrumbClick?.(index + 1)}
								disabled={index === breadcrumbPath.length - 1}
							>
								{item.folder.name}
							</Button>
						</React.Fragment>
					))}

					{/* Current folder indicator - always show current folder name */}
					<ChevronRight className="h-3 w-3 shrink-0 text-muted-foreground" />
					<FolderIcon className="h-4 w-4 text-muted-foreground" />
					<span className="ml-1 text-sm font-medium">{folder.name}</span>

					<span className="ml-2 text-sm text-muted-foreground">
						({files.length} files, {folders.length} folders)
					</span>
				</div>
				<ViewToggle viewMode={viewMode} onViewModeChange={setViewMode} />
			</div>

			{/* Content */}
			<div className="flex-1 overflow-auto p-4">
				{viewMode === "grid" ? (
					<FileGrid
						items={items}
						selectedIds={selectedIds}
						onSelect={handleSelect}
						onOpen={handleOpen}
						onContextMenu={() => {}}
						onMove={() => {}}
						onDownload={settings.allowDownload ? handleDownload : undefined}
						onDownloadZip={settings.allowZip ? handleZipDownload : undefined}
						isLoading={false}
						ContextMenuComponent={SharedFileContextMenu}
						contextMenuProps={{
							shareToken,
							password,
							settings,
						}}
					/>
				) : (
					<FileList
						items={items}
						selectedIds={selectedIds}
						onSelect={handleSelect}
						onOpen={handleOpen}
						onContextMenu={() => {}}
						onMove={() => {}}
						onDownload={settings.allowDownload ? handleDownload : undefined}
						onDownloadZip={settings.allowZip ? handleZipDownload : undefined}
						sortBy={sortBy}
						sortOrder={sortOrder}
						onSort={handleSort}
						isLoading={false}
						ContextMenuComponent={SharedFileContextMenu}
						contextMenuProps={{
							shareToken,
							password,
							settings,
						}}
					/>
				)}
			</div>
		</div>
	);
}
