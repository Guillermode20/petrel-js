import {
	Loader2,
	Music,
	Pause,
	Play,
	Repeat,
	Shuffle,
	SkipBack,
	SkipForward,
	Volume2,
	VolumeX,
} from "lucide-react";
import { useCallback, useState } from "react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";
import { formatDuration } from "@/components/viewers/video-player/utils";
import { AudioContextMenu } from "./AudioContextMenu";
import type { AudioPlayerProps } from "./types";
import { useAudioPlayer } from "./useAudioPlayer";

/**
 * Audio player with album art, track info, and playback controls
 */
export function AudioPlayer({ file, className, autoPlay = false, onEnded }: AudioPlayerProps) {
	const { state, controls, metadata } = useAudioPlayer({
		file,
		autoPlay,
		onEnded,
	});

	const {
		isPlaying,
		isLoading,
		currentTime,
		duration,
		volume,
		isMuted,
		isLooped,
		supportsScrubbing,
		scrubbingMessage,
	} = state;

	const [showMetadata, setShowMetadata] = useState(false);

	const handleDownload = useCallback(() => {
		window.open(api.getDownloadUrl(file.id), "_blank");
	}, [file.id]);

	const handleViewMetadata = useCallback(() => {
		setShowMetadata((prev) => !prev);
	}, []);

	return (
		<AudioContextMenu
			hasMetadata={!!metadata}
			onDownload={handleDownload}
			onViewMetadata={handleViewMetadata}
		>
		<div
			className={cn(
				"flex flex-col items-center gap-6 rounded-lg border border-border bg-card p-6",
				className,
			)}
		>
			{/* Album art placeholder */}
			<div className="flex h-48 w-48 items-center justify-center overflow-hidden rounded-lg bg-secondary">
				<Music className="h-16 w-16 text-muted-foreground" />
			</div>

			{/* Track info */}
			<div className="text-center">
				<h3 className="text-lg font-medium">{metadata?.title ?? file.name}</h3>
				{metadata?.artist && <p className="text-sm text-muted-foreground">{metadata.artist}</p>}
				{metadata?.album && <p className="text-xs text-muted-foreground">{metadata.album}</p>}
			</div>

			{/* Progress bar */}
			<div className="w-full space-y-1">
				<Slider
					value={[currentTime]}
					min={0}
					max={duration > 0 ? duration : 100}
					step={0.1}
					onValueChange={([value]) => {
						if (typeof value === "number") {
							controls.seek(value);
						}
					}}
					disabled={isLoading || !supportsScrubbing}
				/>
				<div className="flex justify-between text-xs text-muted-foreground">
					<span>{formatDuration(currentTime)}</span>
					<span>{formatDuration(duration)}</span>
				</div>
				{!supportsScrubbing && scrubbingMessage && (
					<p className="text-xs text-amber-500">{scrubbingMessage}</p>
				)}
			</div>

			{/* Main controls */}
			<div className="flex items-center gap-4">
				<Button
					variant="ghost"
					size="icon"
					className={cn("h-8 w-8", isLooped && "text-primary")}
					onClick={controls.toggleLoop}
				>
					<Repeat className="h-4 w-4" />
				</Button>

				<Button variant="ghost" size="icon" className="h-10 w-10" onClick={controls.previous}>
					<SkipBack className="h-5 w-5" />
				</Button>

				<Button size="icon" className="h-14 w-14 rounded-full" onClick={controls.togglePlay}>
					{isLoading ? (
						<Loader2 className="h-6 w-6 animate-spin" />
					) : isPlaying ? (
						<Pause className="h-6 w-6" />
					) : (
						<Play className="h-6 w-6 ml-1" />
					)}
				</Button>

				<Button variant="ghost" size="icon" className="h-10 w-10" onClick={controls.next}>
					<SkipForward className="h-5 w-5" />
				</Button>

				<Button variant="ghost" size="icon" className="h-8 w-8 opacity-50" disabled>
					<Shuffle className="h-4 w-4" />
				</Button>
			</div>

			{/* Volume control */}
			<div className="flex w-full max-w-xs items-center gap-2">
				<Button
					variant="ghost"
					size="icon"
					className="h-8 w-8 shrink-0"
					onClick={controls.toggleMute}
				>
					{isMuted || volume === 0 ? (
						<VolumeX className="h-4 w-4" />
					) : (
						<Volume2 className="h-4 w-4" />
					)}
				</Button>
				<Slider
					value={[isMuted ? 0 : volume * 100]}
					min={0}
					max={100}
					step={1}
					onValueChange={([value]) => {
						if (typeof value === "number") {
							controls.setVolume(value / 100);
						}
					}}
					className="flex-1"
				/>
			</div>

			{/* Metadata panel */}
			{showMetadata && metadata && (
				<div className="w-full rounded-lg border border-border bg-secondary/30 p-3 text-sm">
					<h4 className="mb-2 font-medium">Track Info</h4>
					<div className="space-y-1 text-muted-foreground">
						{metadata.title && <p><span className="text-foreground">Title:</span> {metadata.title}</p>}
						{metadata.artist && <p><span className="text-foreground">Artist:</span> {metadata.artist}</p>}
						{metadata.album && <p><span className="text-foreground">Album:</span> {metadata.album}</p>}
						{metadata.year && <p><span className="text-foreground">Year:</span> {metadata.year}</p>}
						{metadata.genre && <p><span className="text-foreground">Genre:</span> {metadata.genre}</p>}
					</div>
				</div>
			)}
		</div>
		</AudioContextMenu>
	);
}
