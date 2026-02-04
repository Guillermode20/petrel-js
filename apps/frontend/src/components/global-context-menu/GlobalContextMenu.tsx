import {
	ArrowLeft,
	ArrowRight,
	ClipboardPaste,
	Copy,
	Download,
	ExternalLink,
	FileArchive,
	FolderInput,
	FolderPlus,
	Grid,
	Info,
	Link,
	List,
	ListPlus,
	Music,
	Pencil,
	PictureInPicture,
	RefreshCw,
	Share2,
	Timer,
	Trash2,
	Upload,
	Video,
} from "lucide-react";
import { type ReactNode, useMemo } from "react";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuShortcut,
	DropdownMenuSub,
	DropdownMenuSubContent,
	DropdownMenuSubTrigger,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useContextMenuClipboardState } from "./clipboard";
import type {
	AudioPlayerContext,
	EmptySpaceContext,
	FileContext,
	FolderContext,
	ImageViewerContext,
	MenuContext,
	MultiSelectionContext,
	ShareFileContext,
	ShareFolderContext,
	SidebarItemContext,
	VideoPlayerContext,
} from "./types";
import { useContextMenuActions, useContextMenuState } from "./useContextMenu";

interface GlobalContextMenuProps {
	onAction: (action: string, data?: unknown) => void;
}

interface MenuPlacement {
	align: "start" | "end";
	side: "top" | "bottom";
}

function getMenuPlacement(x: number, y: number): MenuPlacement {
	const viewportWidth = window.innerWidth;
	const viewportHeight = window.innerHeight;

	const estimatedMenuWidth = 220;
	const estimatedMenuHeight = 300;

	return {
		align: x > viewportWidth - estimatedMenuWidth ? "end" : "start",
		side: y > viewportHeight - estimatedMenuHeight ? "top" : "bottom",
	};
}

/**
 * GlobalContextMenu - renders a programmatically-opened menu anchored to screen coordinates.
 *
 * Uses Radix DropdownMenu under the hood (for keyboard nav, focus management, submenus),
 * anchored to an invisible fixed-position trigger.
 */
export function GlobalContextMenu({ onAction }: GlobalContextMenuProps): ReactNode {
	const { isOpen, position, context } = useContextMenuState();
	const { close } = useContextMenuActions();

	const placement = useMemo<MenuPlacement>(() => {
		if (!isOpen) return { align: "start", side: "bottom" };
		return getMenuPlacement(position.x, position.y);
	}, [isOpen, position.x, position.y]);

	if (!context) return null;

	return (
		<DropdownMenu open={isOpen} onOpenChange={(open) => !open && close()}>
			<DropdownMenuTrigger asChild>
				<button
					type="button"
					aria-hidden="true"
					tabIndex={-1}
					className="fixed z-50 h-px w-px opacity-0"
					style={{ left: position.x, top: position.y }}
				/>
			</DropdownMenuTrigger>
			<DropdownMenuContent
				align={placement.align}
				side={placement.side}
				sideOffset={6}
				collisionPadding={8}
				className="w-[13.5rem]"
				onCloseAutoFocus={(e) => e.preventDefault()}
			>
				<GlobalContextMenuContent onAction={onAction} />
			</DropdownMenuContent>
		</DropdownMenu>
	);
}

interface GlobalContextMenuContentProps {
	onAction: (action: string, data?: unknown) => void;
}

/**
 * Renders the appropriate context menu content based on context type
 */
export function GlobalContextMenuContent({ onAction }: GlobalContextMenuContentProps): ReactNode {
	const { context } = useContextMenuState();

	if (!context) return null;

	switch (context.type) {
		case "file":
			return <FileMenuContent context={context} onAction={onAction} />;
		case "folder":
			return <FolderMenuContent context={context} onAction={onAction} />;
		case "multi-selection":
			return <MultiSelectionMenuContent context={context} onAction={onAction} />;
		case "empty-space":
			return <EmptySpaceMenuContent context={context} onAction={onAction} />;
		case "video-player":
			return <VideoPlayerMenuContent context={context} onAction={onAction} />;
		case "image-viewer":
			return <ImageViewerMenuContent context={context} onAction={onAction} />;
		case "audio-player":
			return <AudioPlayerMenuContent context={context} onAction={onAction} />;
		case "share-file":
			return <ShareFileMenuContent context={context} onAction={onAction} />;
		case "share-folder":
			return <ShareFolderMenuContent context={context} onAction={onAction} />;
		case "sidebar-item":
			return <SidebarItemMenuContent context={context} onAction={onAction} />;
		default:
			return null;
	}
}

interface MenuContentProps<T extends MenuContext> {
	context: T;
	onAction: (action: string, data?: unknown) => void;
}

function FileMenuContent({ context, onAction }: MenuContentProps<FileContext>): ReactNode {
	return (
		<>
			<DropdownMenuItem onClick={() => onAction("open", context.item)}>
				<ExternalLink className="mr-2 h-4 w-4" />
				Open
			</DropdownMenuItem>
			<DropdownMenuItem onClick={() => onAction("download", context.item)}>
				<Download className="mr-2 h-4 w-4" />
				Download
			</DropdownMenuItem>
			<DropdownMenuItem onClick={() => onAction("clipboard-copy", context.item)}>
				<Copy className="mr-2 h-4 w-4" />
				Copy
			</DropdownMenuItem>
			<DropdownMenuSeparator />
			<DropdownMenuItem onClick={() => onAction("share", context.item)}>
				<Share2 className="mr-2 h-4 w-4" />
				Share
			</DropdownMenuItem>
			<DropdownMenuItem onClick={() => onAction("copy-link", context.item)}>
				<Copy className="mr-2 h-4 w-4" />
				Copy link
			</DropdownMenuItem>
			<DropdownMenuItem onClick={() => onAction("copy-share-link", context.item)}>
				<Link className="mr-2 h-4 w-4" />
				Copy share link
			</DropdownMenuItem>
			<DropdownMenuSeparator />
			<DropdownMenuItem onClick={() => onAction("rename", context.item)}>
				<Pencil className="mr-2 h-4 w-4" />
				Rename
				<DropdownMenuShortcut>F2</DropdownMenuShortcut>
			</DropdownMenuItem>
			<DropdownMenuItem onClick={() => onAction("move", context.item)}>
				<FolderInput className="mr-2 h-4 w-4" />
				Move to...
			</DropdownMenuItem>
			<DropdownMenuItem onClick={() => onAction("properties", context.item)}>
				<Info className="mr-2 h-4 w-4" />
				Properties
			</DropdownMenuItem>
			<DropdownMenuSeparator />
			<DropdownMenuItem onClick={() => onAction("delete", context.item)} variant="destructive">
				<Trash2 className="mr-2 h-4 w-4" />
				Delete
				<DropdownMenuShortcut>Del</DropdownMenuShortcut>
			</DropdownMenuItem>
		</>
	);
}

function FolderMenuContent({ context, onAction }: MenuContentProps<FolderContext>): ReactNode {
	return (
		<>
			<DropdownMenuItem onClick={() => onAction("open", context.item)}>
				<ExternalLink className="mr-2 h-4 w-4" />
				Open
			</DropdownMenuItem>
			<DropdownMenuItem onClick={() => onAction("download-zip", context.item)}>
				<FileArchive className="mr-2 h-4 w-4" />
				Download as ZIP
			</DropdownMenuItem>
			<DropdownMenuItem onClick={() => onAction("clipboard-copy", context.item)}>
				<Copy className="mr-2 h-4 w-4" />
				Copy
			</DropdownMenuItem>
			<DropdownMenuSeparator />
			<DropdownMenuItem onClick={() => onAction("share", context.item)}>
				<Share2 className="mr-2 h-4 w-4" />
				Share
			</DropdownMenuItem>
			<DropdownMenuItem onClick={() => onAction("copy-link", context.item)}>
				<Copy className="mr-2 h-4 w-4" />
				Copy link
			</DropdownMenuItem>
			<DropdownMenuItem onClick={() => onAction("copy-share-link", context.item)}>
				<Link className="mr-2 h-4 w-4" />
				Copy share link
			</DropdownMenuItem>
			<DropdownMenuSeparator />
			<DropdownMenuItem onClick={() => onAction("rename", context.item)}>
				<Pencil className="mr-2 h-4 w-4" />
				Rename
				<DropdownMenuShortcut>F2</DropdownMenuShortcut>
			</DropdownMenuItem>
			<DropdownMenuItem onClick={() => onAction("move", context.item)}>
				<FolderInput className="mr-2 h-4 w-4" />
				Move to...
			</DropdownMenuItem>
			<DropdownMenuSeparator />
			<DropdownMenuItem onClick={() => onAction("delete", context.item)} variant="destructive">
				<Trash2 className="mr-2 h-4 w-4" />
				Delete
				<DropdownMenuShortcut>Del</DropdownMenuShortcut>
			</DropdownMenuItem>
		</>
	);
}

function MultiSelectionMenuContent({
	context,
	onAction,
}: MenuContentProps<MultiSelectionContext>): ReactNode {
	const count = context.selectedIds.size;

	return (
		<>
			<DropdownMenuItem onClick={() => onAction("download-zip-selected")}>
				<FileArchive className="mr-2 h-4 w-4" />
				Download as ZIP ({count})
			</DropdownMenuItem>
			<DropdownMenuItem onClick={() => onAction("clipboard-copy-selected")}>
				<Copy className="mr-2 h-4 w-4" />
				Copy selected ({count})
			</DropdownMenuItem>
			<DropdownMenuSeparator />
			<DropdownMenuItem onClick={() => onAction("share-selected")}>
				<Share2 className="mr-2 h-4 w-4" />
				Share selected
			</DropdownMenuItem>
			<DropdownMenuSeparator />
			<DropdownMenuItem onClick={() => onAction("move-selected")}>
				<FolderInput className="mr-2 h-4 w-4" />
				Move selected to...
			</DropdownMenuItem>
			<DropdownMenuItem onClick={() => onAction("delete-selected")} variant="destructive">
				<Trash2 className="mr-2 h-4 w-4" />
				Delete selected ({count})
			</DropdownMenuItem>
			<DropdownMenuSeparator />
			<DropdownMenuItem onClick={() => onAction("clear-selection")}>
				Clear selection
			</DropdownMenuItem>
		</>
	);
}

function EmptySpaceMenuContent({ onAction }: MenuContentProps<EmptySpaceContext>): ReactNode {
	const { items } = useContextMenuClipboardState();
	const hasClipboardItems = items.length > 0;

	return (
		<>
			<DropdownMenuItem onClick={() => onAction("upload")}>
				<Upload className="mr-2 h-4 w-4" />
				Upload files
			</DropdownMenuItem>
			<DropdownMenuItem onClick={() => onAction("new-folder")}>
				<FolderPlus className="mr-2 h-4 w-4" />
				New folder
			</DropdownMenuItem>
			<DropdownMenuItem onClick={() => onAction("paste")} disabled={!hasClipboardItems}>
				<ClipboardPaste className="mr-2 h-4 w-4" />
				Paste
			</DropdownMenuItem>
			<DropdownMenuSeparator />
			<DropdownMenuItem onClick={() => onAction("refresh")}>
				<RefreshCw className="mr-2 h-4 w-4" />
				Refresh
			</DropdownMenuItem>
			<DropdownMenuSeparator />
			<DropdownMenuSub>
				<DropdownMenuSubTrigger>
					<Grid className="mr-2 h-4 w-4" />
					View
				</DropdownMenuSubTrigger>
				<DropdownMenuSubContent>
					<DropdownMenuItem onClick={() => onAction("view-grid")}>
						<Grid className="mr-2 h-4 w-4" />
						Grid view
					</DropdownMenuItem>
					<DropdownMenuItem onClick={() => onAction("view-list")}>
						<List className="mr-2 h-4 w-4" />
						List view
					</DropdownMenuItem>
				</DropdownMenuSubContent>
			</DropdownMenuSub>
		</>
	);
}

const PLAYBACK_SPEEDS = [0.5, 0.75, 1, 1.25, 1.5, 2];

function VideoPlayerMenuContent({
	context,
	onAction,
}: MenuContentProps<VideoPlayerContext>): ReactNode {
	return (
		<>
			<DropdownMenuSub>
				<DropdownMenuSubTrigger>
					<Timer className="mr-2 h-4 w-4" />
					Playback speed
					<span className="ml-auto text-xs text-muted-foreground">{context.playbackRate}x</span>
				</DropdownMenuSubTrigger>
				<DropdownMenuSubContent>
					{PLAYBACK_SPEEDS.map((speed) => (
						<DropdownMenuItem key={speed} onClick={() => onAction("set-playback-speed", speed)}>
							{speed === context.playbackRate && "✓ "}
							{speed}x
						</DropdownMenuItem>
					))}
				</DropdownMenuSubContent>
			</DropdownMenuSub>

			{context.audioTracks.length > 1 && (
				<DropdownMenuSub>
					<DropdownMenuSubTrigger>
						<Music className="mr-2 h-4 w-4" />
						Audio track
					</DropdownMenuSubTrigger>
					<DropdownMenuSubContent>
						{context.audioTracks.map((track) => (
							<DropdownMenuItem
								key={track.id}
								onClick={() => onAction("set-audio-track", track.id)}
							>
								{track.id === context.selectedAudioTrack && "✓ "}
								{track.title ?? track.language}
							</DropdownMenuItem>
						))}
					</DropdownMenuSubContent>
				</DropdownMenuSub>
			)}

			{context.subtitleTracks.length > 0 && (
				<DropdownMenuSub>
					<DropdownMenuSubTrigger>
						<Video className="mr-2 h-4 w-4" />
						Subtitles
					</DropdownMenuSubTrigger>
					<DropdownMenuSubContent>
						<DropdownMenuItem onClick={() => onAction("set-subtitle-track", null)}>
							{context.selectedSubtitleTrack === undefined && "✓ "}
							Off
						</DropdownMenuItem>
						{context.subtitleTracks.map((track) => (
							<DropdownMenuItem
								key={track.id}
								onClick={() => onAction("set-subtitle-track", track.id)}
							>
								{track.id === context.selectedSubtitleTrack && "✓ "}
								{track.title ?? track.language}
							</DropdownMenuItem>
						))}
					</DropdownMenuSubContent>
				</DropdownMenuSub>
			)}

			<DropdownMenuSeparator />
			<DropdownMenuItem onClick={() => onAction("toggle-pip")}>
				<PictureInPicture className="mr-2 h-4 w-4" />
				Picture-in-picture
			</DropdownMenuItem>
			<DropdownMenuSeparator />
			<DropdownMenuItem onClick={() => onAction("download-video")}>
				<Download className="mr-2 h-4 w-4" />
				Download video
			</DropdownMenuItem>
			<DropdownMenuItem onClick={() => onAction("copy-timestamp-link")}>
				<Link className="mr-2 h-4 w-4" />
				Copy timestamp link
			</DropdownMenuItem>
		</>
	);
}

function ImageViewerMenuContent({
	context,
	onAction,
}: MenuContentProps<ImageViewerContext>): ReactNode {
	return (
		<>
			<DropdownMenuItem onClick={() => onAction("navigate-prev")}>
				<ArrowLeft className="mr-2 h-4 w-4" />
				Previous
			</DropdownMenuItem>
			<DropdownMenuItem onClick={() => onAction("navigate-next")}>
				<ArrowRight className="mr-2 h-4 w-4" />
				Next
			</DropdownMenuItem>
			<DropdownMenuSeparator />
			<DropdownMenuItem onClick={() => onAction("open-new-tab")}>
				<ExternalLink className="mr-2 h-4 w-4" />
				Open in new tab
			</DropdownMenuItem>
			<DropdownMenuItem onClick={() => onAction("download-image")}>
				<Download className="mr-2 h-4 w-4" />
				Download
			</DropdownMenuItem>
			<DropdownMenuItem onClick={() => onAction("copy-image")}>
				<Copy className="mr-2 h-4 w-4" />
				Copy image
			</DropdownMenuItem>
			{context.hasExif && (
				<>
					<DropdownMenuSeparator />
					<DropdownMenuItem onClick={() => onAction("toggle-exif")}>
						<Info className="mr-2 h-4 w-4" />
						{context.showingInfo ? "Hide" : "View"} EXIF data
						<DropdownMenuShortcut>I</DropdownMenuShortcut>
					</DropdownMenuItem>
				</>
			)}
		</>
	);
}

function AudioPlayerMenuContent({
	context,
	onAction,
}: MenuContentProps<AudioPlayerContext>): ReactNode {
	return (
		<>
			<DropdownMenuItem onClick={() => onAction("add-to-playlist")}>
				<ListPlus className="mr-2 h-4 w-4" />
				Add to playlist
			</DropdownMenuItem>
			<DropdownMenuItem onClick={() => onAction("download-track")}>
				<Download className="mr-2 h-4 w-4" />
				Download track
			</DropdownMenuItem>
			{context.hasMetadata && (
				<>
					<DropdownMenuSeparator />
					<DropdownMenuItem onClick={() => onAction("view-metadata")}>
						<Info className="mr-2 h-4 w-4" />
						View track info
					</DropdownMenuItem>
				</>
			)}
		</>
	);
}

function ShareFileMenuContent({
	context,
	onAction,
}: MenuContentProps<ShareFileContext>): ReactNode {
	return (
		<>
			<DropdownMenuItem onClick={() => onAction("copy-share-link")}>
				<Copy className="mr-2 h-4 w-4" />
				Copy share link
			</DropdownMenuItem>
			{context.allowDownload && (
				<DropdownMenuItem onClick={() => onAction("download")}>
					<Download className="mr-2 h-4 w-4" />
					Download
				</DropdownMenuItem>
			)}
		</>
	);
}

function ShareFolderMenuContent({
	context,
	onAction,
}: MenuContentProps<ShareFolderContext>): ReactNode {
	const isFile = "mimeType" in context.item;

	return (
		<>
			<DropdownMenuItem onClick={() => onAction("open", context.item)}>
				<ExternalLink className="mr-2 h-4 w-4" />
				{isFile ? "Preview" : "Open"}
			</DropdownMenuItem>
			{context.allowDownload && isFile && (
				<DropdownMenuItem onClick={() => onAction("download", context.item)}>
					<Download className="mr-2 h-4 w-4" />
					Download
				</DropdownMenuItem>
			)}
			{isFile && (
				<DropdownMenuItem onClick={() => onAction("toggle-selection", context.item)}>
					{context.isSelected ? "Remove from selection" : "Add to selection"}
				</DropdownMenuItem>
			)}
			{context.allowDownload && context.allowZip && (
				<DropdownMenuItem onClick={() => onAction("download-zip", context.item)}>
					<FileArchive className="mr-2 h-4 w-4" />
					Download as ZIP
				</DropdownMenuItem>
			)}
			<DropdownMenuSeparator />
			<DropdownMenuItem onClick={() => onAction("copy-share-link")}>
				<Copy className="mr-2 h-4 w-4" />
				Copy share link
			</DropdownMenuItem>
		</>
	);
}

function SidebarItemMenuContent({
	context,
	onAction,
}: MenuContentProps<SidebarItemContext>): ReactNode {
	return (
		<>
			<DropdownMenuItem onClick={() => onAction("open-new-tab", context)}>
				<ExternalLink className="mr-2 h-4 w-4" />
				Open in new tab
			</DropdownMenuItem>
			<DropdownMenuItem onClick={() => onAction("copy-link", context)}>
				<Link className="mr-2 h-4 w-4" />
				Copy link
			</DropdownMenuItem>
		</>
	);
}
