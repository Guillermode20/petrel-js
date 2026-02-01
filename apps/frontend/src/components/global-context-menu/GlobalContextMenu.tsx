import {
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
import type { ReactNode } from "react";
import {
	ContextMenuContent,
	ContextMenuItem,
	ContextMenuSeparator,
	ContextMenuSub,
	ContextMenuSubContent,
	ContextMenuSubTrigger,
	ContextMenuShortcut,
} from "@/components/ui/context-menu";
import { useContextMenuState } from "./useContextMenu";
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
	VideoPlayerContext,
} from "./types";

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
		<ContextMenuContent className="w-48">
			<ContextMenuItem onClick={() => onAction("open", context.item)}>
				<ExternalLink className="mr-2 h-4 w-4" />
				Open
			</ContextMenuItem>
			<ContextMenuItem onClick={() => onAction("download", context.item)}>
				<Download className="mr-2 h-4 w-4" />
				Download
			</ContextMenuItem>
			<ContextMenuSeparator />
			<ContextMenuItem onClick={() => onAction("share", context.item)}>
				<Share2 className="mr-2 h-4 w-4" />
				Share
			</ContextMenuItem>
			<ContextMenuItem onClick={() => onAction("copy-link", context.item)}>
				<Copy className="mr-2 h-4 w-4" />
				Copy link
			</ContextMenuItem>
			<ContextMenuItem onClick={() => onAction("copy-share-link", context.item)}>
				<Link className="mr-2 h-4 w-4" />
				Copy share link
			</ContextMenuItem>
			<ContextMenuSeparator />
			<ContextMenuItem onClick={() => onAction("rename", context.item)}>
				<Pencil className="mr-2 h-4 w-4" />
				Rename
				<ContextMenuShortcut>F2</ContextMenuShortcut>
			</ContextMenuItem>
			<ContextMenuItem onClick={() => onAction("move", context.item)}>
				<FolderInput className="mr-2 h-4 w-4" />
				Move to...
			</ContextMenuItem>
			<ContextMenuSeparator />
			<ContextMenuItem
				onClick={() => onAction("delete", context.item)}
				variant="destructive"
			>
				<Trash2 className="mr-2 h-4 w-4" />
				Delete
				<ContextMenuShortcut>Del</ContextMenuShortcut>
			</ContextMenuItem>
		</ContextMenuContent>
	);
}

function FolderMenuContent({ context, onAction }: MenuContentProps<FolderContext>): ReactNode {
	return (
		<ContextMenuContent className="w-48">
			<ContextMenuItem onClick={() => onAction("open", context.item)}>
				<ExternalLink className="mr-2 h-4 w-4" />
				Open
			</ContextMenuItem>
			<ContextMenuItem onClick={() => onAction("download-zip", context.item)}>
				<FileArchive className="mr-2 h-4 w-4" />
				Download as ZIP
			</ContextMenuItem>
			<ContextMenuSeparator />
			<ContextMenuItem onClick={() => onAction("share", context.item)}>
				<Share2 className="mr-2 h-4 w-4" />
				Share
			</ContextMenuItem>
			<ContextMenuItem onClick={() => onAction("copy-link", context.item)}>
				<Copy className="mr-2 h-4 w-4" />
				Copy link
			</ContextMenuItem>
			<ContextMenuItem onClick={() => onAction("copy-share-link", context.item)}>
				<Link className="mr-2 h-4 w-4" />
				Copy share link
			</ContextMenuItem>
			<ContextMenuSeparator />
			<ContextMenuItem onClick={() => onAction("rename", context.item)}>
				<Pencil className="mr-2 h-4 w-4" />
				Rename
				<ContextMenuShortcut>F2</ContextMenuShortcut>
			</ContextMenuItem>
			<ContextMenuItem onClick={() => onAction("move", context.item)}>
				<FolderInput className="mr-2 h-4 w-4" />
				Move to...
			</ContextMenuItem>
			<ContextMenuSeparator />
			<ContextMenuItem
				onClick={() => onAction("delete", context.item)}
				variant="destructive"
			>
				<Trash2 className="mr-2 h-4 w-4" />
				Delete
				<ContextMenuShortcut>Del</ContextMenuShortcut>
			</ContextMenuItem>
		</ContextMenuContent>
	);
}

function MultiSelectionMenuContent({
	context,
	onAction,
}: MenuContentProps<MultiSelectionContext>): ReactNode {
	const count = context.selectedIds.size;

	return (
		<ContextMenuContent className="w-52">
			<ContextMenuItem onClick={() => onAction("download-zip-selected")}>
				<FileArchive className="mr-2 h-4 w-4" />
				Download as ZIP ({count})
			</ContextMenuItem>
			<ContextMenuSeparator />
			<ContextMenuItem onClick={() => onAction("share-selected")}>
				<Share2 className="mr-2 h-4 w-4" />
				Share selected
			</ContextMenuItem>
			<ContextMenuSeparator />
			<ContextMenuItem onClick={() => onAction("move-selected")}>
				<FolderInput className="mr-2 h-4 w-4" />
				Move selected to...
			</ContextMenuItem>
			<ContextMenuItem
				onClick={() => onAction("delete-selected")}
				variant="destructive"
			>
				<Trash2 className="mr-2 h-4 w-4" />
				Delete selected ({count})
			</ContextMenuItem>
			<ContextMenuSeparator />
			<ContextMenuItem onClick={() => onAction("clear-selection")}>
				Clear selection
			</ContextMenuItem>
		</ContextMenuContent>
	);
}

function EmptySpaceMenuContent({
	onAction,
}: MenuContentProps<EmptySpaceContext>): ReactNode {
	return (
		<ContextMenuContent className="w-48">
			<ContextMenuItem onClick={() => onAction("upload")}>
				<Upload className="mr-2 h-4 w-4" />
				Upload files
			</ContextMenuItem>
			<ContextMenuItem onClick={() => onAction("new-folder")}>
				<FolderPlus className="mr-2 h-4 w-4" />
				New folder
			</ContextMenuItem>
			<ContextMenuSeparator />
			<ContextMenuItem onClick={() => onAction("refresh")}>
				<RefreshCw className="mr-2 h-4 w-4" />
				Refresh
			</ContextMenuItem>
			<ContextMenuSeparator />
			<ContextMenuSub>
				<ContextMenuSubTrigger>
					<Grid className="mr-2 h-4 w-4" />
					View
				</ContextMenuSubTrigger>
				<ContextMenuSubContent>
					<ContextMenuItem onClick={() => onAction("view-grid")}>
						<Grid className="mr-2 h-4 w-4" />
						Grid view
					</ContextMenuItem>
					<ContextMenuItem onClick={() => onAction("view-list")}>
						<List className="mr-2 h-4 w-4" />
						List view
					</ContextMenuItem>
				</ContextMenuSubContent>
			</ContextMenuSub>
		</ContextMenuContent>
	);
}

const PLAYBACK_SPEEDS = [0.5, 0.75, 1, 1.25, 1.5, 2];

function VideoPlayerMenuContent({
	context,
	onAction,
}: MenuContentProps<VideoPlayerContext>): ReactNode {
	return (
		<ContextMenuContent className="w-52">
			<ContextMenuSub>
				<ContextMenuSubTrigger>
					<Timer className="mr-2 h-4 w-4" />
					Playback speed
					<span className="ml-auto text-xs text-muted-foreground">
						{context.playbackRate}x
					</span>
				</ContextMenuSubTrigger>
				<ContextMenuSubContent>
					{PLAYBACK_SPEEDS.map((speed) => (
						<ContextMenuItem
							key={speed}
							onClick={() => onAction("set-playback-speed", speed)}
						>
							{speed === context.playbackRate && "✓ "}
							{speed}x
						</ContextMenuItem>
					))}
				</ContextMenuSubContent>
			</ContextMenuSub>

			{context.audioTracks.length > 1 && (
				<ContextMenuSub>
					<ContextMenuSubTrigger>
						<Music className="mr-2 h-4 w-4" />
						Audio track
					</ContextMenuSubTrigger>
					<ContextMenuSubContent>
						{context.audioTracks.map((track) => (
							<ContextMenuItem
								key={track.id}
								onClick={() => onAction("set-audio-track", track.id)}
							>
								{track.id === context.selectedAudioTrack && "✓ "}
								{track.title ?? track.language}
							</ContextMenuItem>
						))}
					</ContextMenuSubContent>
				</ContextMenuSub>
			)}

			{context.subtitleTracks.length > 0 && (
				<ContextMenuSub>
					<ContextMenuSubTrigger>
						<Video className="mr-2 h-4 w-4" />
						Subtitles
					</ContextMenuSubTrigger>
					<ContextMenuSubContent>
						<ContextMenuItem onClick={() => onAction("set-subtitle-track", null)}>
							{context.selectedSubtitleTrack === undefined && "✓ "}
							Off
						</ContextMenuItem>
						{context.subtitleTracks.map((track) => (
							<ContextMenuItem
								key={track.id}
								onClick={() => onAction("set-subtitle-track", track.id)}
							>
								{track.id === context.selectedSubtitleTrack && "✓ "}
								{track.title ?? track.language}
							</ContextMenuItem>
						))}
					</ContextMenuSubContent>
				</ContextMenuSub>
			)}

			<ContextMenuSeparator />
			<ContextMenuItem onClick={() => onAction("toggle-pip")}>
				<PictureInPicture className="mr-2 h-4 w-4" />
				Picture-in-picture
			</ContextMenuItem>
			<ContextMenuSeparator />
			<ContextMenuItem onClick={() => onAction("download-video")}>
				<Download className="mr-2 h-4 w-4" />
				Download video
			</ContextMenuItem>
			<ContextMenuItem onClick={() => onAction("copy-timestamp-link")}>
				<Link className="mr-2 h-4 w-4" />
				Copy timestamp link
			</ContextMenuItem>
		</ContextMenuContent>
	);
}

function ImageViewerMenuContent({
	context,
	onAction,
}: MenuContentProps<ImageViewerContext>): ReactNode {
	return (
		<ContextMenuContent className="w-48">
			<ContextMenuItem onClick={() => onAction("open-new-tab")}>
				<ExternalLink className="mr-2 h-4 w-4" />
				Open in new tab
			</ContextMenuItem>
			<ContextMenuItem onClick={() => onAction("download-image")}>
				<Download className="mr-2 h-4 w-4" />
				Download
			</ContextMenuItem>
			<ContextMenuItem onClick={() => onAction("copy-image")}>
				<Copy className="mr-2 h-4 w-4" />
				Copy image
			</ContextMenuItem>
			{context.hasExif && (
				<>
					<ContextMenuSeparator />
					<ContextMenuItem onClick={() => onAction("toggle-exif")}>
						<Info className="mr-2 h-4 w-4" />
						{context.showingInfo ? "Hide" : "View"} EXIF data
						<ContextMenuShortcut>I</ContextMenuShortcut>
					</ContextMenuItem>
				</>
			)}
		</ContextMenuContent>
	);
}

function AudioPlayerMenuContent({
	context,
	onAction,
}: MenuContentProps<AudioPlayerContext>): ReactNode {
	return (
		<ContextMenuContent className="w-48">
			<ContextMenuItem onClick={() => onAction("download-track")}>
				<Download className="mr-2 h-4 w-4" />
				Download track
			</ContextMenuItem>
			{context.hasMetadata && (
				<>
					<ContextMenuSeparator />
					<ContextMenuItem onClick={() => onAction("view-metadata")}>
						<Info className="mr-2 h-4 w-4" />
						View track info
					</ContextMenuItem>
				</>
			)}
		</ContextMenuContent>
	);
}

function ShareFileMenuContent({
	context,
	onAction,
}: MenuContentProps<ShareFileContext>): ReactNode {
	return (
		<ContextMenuContent className="w-48">
			<ContextMenuItem onClick={() => onAction("copy-share-link")}>
				<Copy className="mr-2 h-4 w-4" />
				Copy share link
			</ContextMenuItem>
			{context.allowDownload && (
				<ContextMenuItem onClick={() => onAction("download")}>
					<Download className="mr-2 h-4 w-4" />
					Download
				</ContextMenuItem>
			)}
		</ContextMenuContent>
	);
}

function ShareFolderMenuContent({
	context,
	onAction,
}: MenuContentProps<ShareFolderContext>): ReactNode {
	const isFile = "mimeType" in context.item;

	return (
		<ContextMenuContent className="w-48">
			<ContextMenuItem onClick={() => onAction("open", context.item)}>
				<ExternalLink className="mr-2 h-4 w-4" />
				{isFile ? "Preview" : "Open"}
			</ContextMenuItem>
			{context.allowDownload && isFile && (
				<ContextMenuItem onClick={() => onAction("download", context.item)}>
					<Download className="mr-2 h-4 w-4" />
					Download
				</ContextMenuItem>
			)}
			{context.allowDownload && context.allowZip && (
				<ContextMenuItem onClick={() => onAction("download-zip", context.item)}>
					<FileArchive className="mr-2 h-4 w-4" />
					Download as ZIP
				</ContextMenuItem>
			)}
			<ContextMenuSeparator />
			<ContextMenuItem onClick={() => onAction("copy-share-link")}>
				<Copy className="mr-2 h-4 w-4" />
				Copy share link
			</ContextMenuItem>
		</ContextMenuContent>
	);
}
