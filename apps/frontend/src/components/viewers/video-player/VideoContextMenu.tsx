import { Download, Link, Music, PictureInPicture, Timer, Video } from "lucide-react";
import {
	ContextMenu,
	ContextMenuContent,
	ContextMenuItem,
	ContextMenuSeparator,
	ContextMenuSub,
	ContextMenuSubContent,
	ContextMenuSubTrigger,
	ContextMenuTrigger,
} from "@/components/ui/context-menu";

const PLAYBACK_SPEEDS = [0.5, 0.75, 1, 1.25, 1.5, 2];

interface AudioTrack {
	id: number;
	language: string;
	title?: string;
}

interface SubtitleTrack {
	id: number;
	language: string;
	title?: string;
}

interface VideoContextMenuProps {
	children: React.ReactNode;
	fileId: number;
	currentTime: number;
	playbackRate: number;
	audioTracks: AudioTrack[];
	subtitleTracks: SubtitleTrack[];
	selectedAudioTrack?: number;
	selectedSubtitleTrack?: number;
	onPlaybackRateChange?: (rate: number) => void;
	onAudioTrackChange?: (trackId: number) => void;
	onSubtitleTrackChange?: (trackId: number | null) => void;
	onTogglePip?: () => void;
	onDownload?: () => void;
	onCopyTimestampLink?: () => void;
}

/**
 * Context menu for video player with playback controls, track selection, and actions
 */
export function VideoContextMenu({
	children,
	playbackRate,
	audioTracks,
	subtitleTracks,
	selectedAudioTrack,
	selectedSubtitleTrack,
	onPlaybackRateChange,
	onAudioTrackChange,
	onSubtitleTrackChange,
	onTogglePip,
	onDownload,
	onCopyTimestampLink,
}: VideoContextMenuProps): React.ReactNode {
	return (
		<ContextMenu>
			<ContextMenuTrigger asChild>{children}</ContextMenuTrigger>
			<ContextMenuContent className="w-52">
				{onPlaybackRateChange && (
					<ContextMenuSub>
						<ContextMenuSubTrigger>
							<Timer className="mr-2 h-4 w-4" />
							Playback speed
							<span className="ml-auto text-xs text-muted-foreground">{playbackRate}x</span>
						</ContextMenuSubTrigger>
						<ContextMenuSubContent>
							{PLAYBACK_SPEEDS.map((speed) => (
								<ContextMenuItem key={speed} onClick={() => onPlaybackRateChange(speed)}>
									{speed === playbackRate && <span className="mr-2">✓</span>}
									{speed}x
								</ContextMenuItem>
							))}
						</ContextMenuSubContent>
					</ContextMenuSub>
				)}

				{audioTracks.length > 1 && onAudioTrackChange && (
					<ContextMenuSub>
						<ContextMenuSubTrigger>
							<Music className="mr-2 h-4 w-4" />
							Audio track
						</ContextMenuSubTrigger>
						<ContextMenuSubContent>
							{audioTracks.map((track) => (
								<ContextMenuItem key={track.id} onClick={() => onAudioTrackChange(track.id)}>
									{track.id === selectedAudioTrack && <span className="mr-2">✓</span>}
									{track.title ?? track.language}
								</ContextMenuItem>
							))}
						</ContextMenuSubContent>
					</ContextMenuSub>
				)}

				{subtitleTracks.length > 0 && onSubtitleTrackChange && (
					<ContextMenuSub>
						<ContextMenuSubTrigger>
							<Video className="mr-2 h-4 w-4" />
							Subtitles
						</ContextMenuSubTrigger>
						<ContextMenuSubContent>
							<ContextMenuItem onClick={() => onSubtitleTrackChange(null)}>
								{selectedSubtitleTrack === undefined && <span className="mr-2">✓</span>}
								Off
							</ContextMenuItem>
							{subtitleTracks.map((track) => (
								<ContextMenuItem
									key={track.id}
									onClick={() => onSubtitleTrackChange(track.id)}
								>
									{track.id === selectedSubtitleTrack && <span className="mr-2">✓</span>}
									{track.title ?? track.language}
								</ContextMenuItem>
							))}
						</ContextMenuSubContent>
					</ContextMenuSub>
				)}

				<ContextMenuSeparator />

				{onTogglePip && (
					<ContextMenuItem onClick={onTogglePip}>
						<PictureInPicture className="mr-2 h-4 w-4" />
						Picture-in-picture
					</ContextMenuItem>
				)}

				<ContextMenuSeparator />

				{onDownload && (
					<ContextMenuItem onClick={onDownload}>
						<Download className="mr-2 h-4 w-4" />
						Download video
					</ContextMenuItem>
				)}

				{onCopyTimestampLink && (
					<ContextMenuItem onClick={onCopyTimestampLink}>
						<Link className="mr-2 h-4 w-4" />
						Copy timestamp link
					</ContextMenuItem>
				)}
			</ContextMenuContent>
		</ContextMenu>
	);
}
