import type { File, Folder } from "@petrel/shared";
import type { LucideIcon } from "lucide-react";

/**
 * Base context menu item definition
 */
export interface ContextMenuItem {
	id: string;
	label: string;
	icon?: LucideIcon;
	shortcut?: string;
	disabled?: boolean;
	destructive?: boolean;
	action?: () => void;
	submenu?: ContextMenuItem[];
}

/**
 * Context menu separator
 */
export interface ContextMenuSeparator {
	type: "separator";
}

/**
 * Union type for menu content items
 */
export type ContextMenuContent = ContextMenuItem | ContextMenuSeparator;

/**
 * Check if item is a separator
 */
export function isSeparator(item: ContextMenuContent): item is ContextMenuSeparator {
	return "type" in item && item.type === "separator";
}

/**
 * Position for the context menu
 */
export interface ContextMenuPosition {
	x: number;
	y: number;
}

/**
 * Context types for different menu scenarios
 */
export type ContextMenuType =
	| "file"
	| "folder"
	| "multi-selection"
	| "empty-space"
	| "video-player"
	| "image-viewer"
	| "audio-player"
	| "share-file"
	| "share-folder"
	| "sidebar-item";

/**
 * Context data passed to menu builders
 */
export interface FileContext {
	type: "file";
	item: File;
}

export interface FolderContext {
	type: "folder";
	item: Folder;
}

export interface MultiSelectionContext {
	type: "multi-selection";
	items: Array<File | Folder>;
	selectedIds: Set<string>;
}

export interface EmptySpaceContext {
	type: "empty-space";
	folderId?: number;
}

export interface VideoPlayerContext {
	type: "video-player";
	fileId: number;
	currentTime: number;
	duration: number;
	playbackRate: number;
	audioTracks: Array<{ id: number; language: string; title?: string }>;
	subtitleTracks: Array<{ id: number; language: string; title?: string }>;
	selectedAudioTrack?: number;
	selectedSubtitleTrack?: number;
}

export interface ImageViewerContext {
	type: "image-viewer";
	file: File;
	hasExif: boolean;
	showingInfo: boolean;
}

export interface AudioPlayerContext {
	type: "audio-player";
	file: File;
	hasMetadata: boolean;
}

export interface ShareFileContext {
	type: "share-file";
	file: File;
	allowDownload: boolean;
	shareToken: string;
}

export interface ShareFolderContext {
	type: "share-folder";
	item: File | Folder;
	allowDownload: boolean;
	allowZip: boolean;
	shareToken: string;
	isSelected?: boolean;
}

export interface SidebarItemContext {
	type: "sidebar-item";
	label: string;
	href: string;
}

/**
 * Union of all context types
 */
export type MenuContext =
	| FileContext
	| FolderContext
	| MultiSelectionContext
	| EmptySpaceContext
	| VideoPlayerContext
	| ImageViewerContext
	| AudioPlayerContext
	| ShareFileContext
	| ShareFolderContext
	| SidebarItemContext;

/**
 * State for the global context menu
 */
export interface ContextMenuState {
	isOpen: boolean;
	position: ContextMenuPosition;
	context: MenuContext | null;
	handlerId: string | null;
}

/**
 * Actions for the context menu provider
 */
export interface ContextMenuActions {
	open: (position: ContextMenuPosition, context: MenuContext, handlerId?: string) => void;
	close: () => void;
}

export type ContextMenuActionHandler = (
	action: string,
	context: MenuContext,
	data?: unknown,
) => void | Promise<void>;

export interface ContextMenuActionRegistry {
	register: (handler: ContextMenuActionHandler) => string;
	unregister: (handlerId: string) => void;
	dispatch: (
		handlerId: string,
		action: string,
		context: MenuContext,
		data?: unknown,
	) => Promise<boolean>;
}
