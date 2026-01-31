import type { File, Folder, ShareSettings } from "@petrel/shared";
import { FolderIcon } from "lucide-react";
import React, { useState } from "react";
import { FileGrid } from "@/components/file-browser/FileGrid";
import { FileList } from "@/components/file-browser/FileList";
import { ViewToggle } from "@/components/file-browser/ViewToggle";
import { cn } from "@/lib/utils";
import type { SortField, ViewMode } from "@/components/file-browser/types";

export interface SharedFileBrowserProps {
	folder: Folder;
	files: File[];
	folders: Folder[];
	shareToken: string;
	password?: string;
	settings: ShareSettings;
	onFileOpen: (file: File) => void;
	onFolderOpen: (folder: Folder) => void;
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
 *
 * Note: Breadcrumb navigation is not currently supported for shares as the API doesn't
 * provide subfolder contents. Only the top-level folder contents are displayed.
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
	className,
}: SharedFileBrowserProps): React.ReactNode {
	const [viewMode, setViewMode] = useState<ViewMode>("grid");
	const [sortBy, setSortBy] = useState<SortField>("name");
	const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
	const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

	// Combine folders and files, folders first
	const items = [...folders, ...files];

	// Handle selection (simplified - no multi-select)
	const handleSelect = () => {
		setSelectedIds(new Set());
	};

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
			const url = new URL(
				`/api/shares/${shareToken}/download/${item.id}`,
				window.location.origin,
			);
			if (password) {
				url.searchParams.set("password", password);
			}
			window.open(url.toString(), "_blank");
		}
	};

	return (
		<div className={cn("flex flex-1 flex-col", className)}>
			{/* Toolbar */}
			<div className="flex items-center justify-between border-b border-border px-4 py-2">
				<div className="flex items-center gap-2">
					<FolderIcon className="h-4 w-4 text-muted-foreground" />
					<span className="font-medium">{folder.name}</span>
					<span className="text-sm text-muted-foreground">
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
						isLoading={false}
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
						sortBy={sortBy}
						sortOrder={sortOrder}
						onSort={handleSort}
						isLoading={false}
					/>
				)}
			</div>
		</div>
	);
}
