import type { File, Folder } from "@petrel/shared";

export interface FileItemProps {
	item: File | Folder;
	isSelected?: boolean;
	onSelect?: (item: File | Folder, event: React.MouseEvent) => void;
	onDoubleClick?: (item: File | Folder, event?: React.MouseEvent) => void;
	onDragStart?: (item: File | Folder, event: React.DragEvent) => void;
	onDrop?: (target: File | Folder, event: React.DragEvent) => void;
}

export interface FileContextMenuHandlers {
	item: File | Folder;
	onOpen: () => void;
	onRename?: () => void;
	onDelete?: () => void;
	onShare?: () => void;
	onDownload?: () => void;
	onDownloadZip?: () => void;
	onMove?: () => void;
	onCopyLink?: () => void;
	onCopyShareLink?: () => void;
	children: React.ReactNode;
}

export interface FileGridProps {
	items: Array<File | Folder>;
	selectedIds: Set<string>;
	onSelect: (item: File | Folder, event: React.MouseEvent) => void;
	onOpen: (item: File | Folder) => void;
	onContextMenu: (item: File | Folder, event: React.MouseEvent) => void;
	onMove: (item: { id: number; type: "file" | "folder" }, targetId: number | null) => void;
	onRename?: (item: File | Folder) => void;
	onDelete?: (item: File | Folder) => void;
	onShare?: (item: File | Folder) => void;
	onDownload?: (item: File | Folder) => void;
	onDownloadZip?: () => void;
	onCopyLink?: (item: File | Folder) => void;
	onCopyShareLink?: (item: File | Folder) => void;
	isLoading?: boolean;
	ContextMenuComponent?: React.ComponentType<FileContextMenuHandlers>;
	contextMenuProps?: Record<string, unknown>;
}

export interface FileListProps {
	items: Array<File | Folder>;
	selectedIds: Set<string>;
	onSelect: (item: File | Folder, event: React.MouseEvent) => void;
	onOpen: (item: File | Folder) => void;
	onContextMenu: (item: File | Folder, event: React.MouseEvent) => void;
	onMove: (item: { id: number; type: "file" | "folder" }, targetId: number | null) => void;
	onRename?: (item: File | Folder) => void;
	onDelete?: (item: File | Folder) => void;
	onShare?: (item: File | Folder) => void;
	onDownload?: (item: File | Folder) => void;
	onDownloadZip?: () => void;
	onCopyLink?: (item: File | Folder) => void;
	onCopyShareLink?: (item: File | Folder) => void;
	sortBy: SortField;
	sortOrder: "asc" | "desc";
	onSort: (field: SortField) => void;
	isLoading?: boolean;
	ContextMenuComponent?: React.ComponentType<FileContextMenuHandlers>;
	contextMenuProps?: Record<string, unknown>;
}

export type ViewMode = "grid" | "list";

export type SortField = "name" | "date" | "size" | "type";

export interface FileBrowserState {
	viewMode: ViewMode;
	sortBy: SortField;
	sortOrder: "asc" | "desc";
	selectedIds: Set<string>;
	searchQuery: string;
}

export interface UploadProgress {
	file: globalThis.File;
	progress: number;
	status: "pending" | "uploading" | "completed" | "error";
	error?: string;
}

export interface ContextMenuAction {
	label: string;
	icon: React.ComponentType<{ className?: string }>;
	action: () => void;
	destructive?: boolean;
	disabled?: boolean;
}
