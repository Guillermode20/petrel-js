import type { File, ShareSettings } from "@petrel/shared";
import {
	Download,
	Loader2,
	Music,
	Pause,
	Play,
	Repeat,
	SkipBack,
	SkipForward,
	Volume2,
	VolumeX,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Slider } from "@/components/ui/slider";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";
import { formatDuration } from "@/components/viewers/video-player/utils";

export interface ShareAudioPlaylistProps {
	files: File[];
	shareToken: string;
	password?: string;
	settings: ShareSettings;
	className?: string;
}

interface AudioMetadata {
	title?: string;
	artist?: string;
	album?: string;
	duration?: number;
	albumArt?: boolean;
}

/**
 * ShareAudioPlaylist - Audio playlist for shared folders
 *
 * Features:
 * - Track list with metadata
 * - Playback controls
 * - Volume control
 * - Track navigation
 */
export function ShareAudioPlaylist({
	files,
	shareToken,
	password,
	settings,
	className,
}: ShareAudioPlaylistProps): React.ReactNode {
	const audioRef = useRef<HTMLAudioElement>(null);
	const [currentIndex, setCurrentIndex] = useState(0);
	const [isPlaying, setIsPlaying] = useState(false);
	const [isLoading, setIsLoading] = useState(false);
	const [currentTime, setCurrentTime] = useState(0);
	const [duration, setDuration] = useState(0);
	const [volume, setVolume] = useState(1);
	const [isMuted, setIsMuted] = useState(false);
	const [isLooped, setIsLooped] = useState(false);

	const currentFile = files[currentIndex];

	// Get audio stream URL for current track
	const audioUrl = currentFile
		? api.getAudioStreamUrl(currentFile.id, { shareToken, password })
		: "";

	// Play/pause toggle
	const togglePlay = useCallback((): void => {
		const audio = audioRef.current;
		if (!audio) return;

		if (isPlaying) {
			audio.pause();
		} else {
			audio.play().catch(() => setIsPlaying(false));
		}
	}, [isPlaying]);

	// Track selection
	const selectTrack = useCallback((index: number): void => {
		setCurrentIndex(index);
		setIsPlaying(true);
	}, []);

	// Navigation
	const playNext = useCallback((): void => {
		if (currentIndex < files.length - 1) {
			setCurrentIndex(currentIndex + 1);
			setIsPlaying(true);
		} else if (isLooped) {
			setCurrentIndex(0);
			setIsPlaying(true);
		}
	}, [currentIndex, files.length, isLooped]);

	const playPrevious = useCallback((): void => {
		if (currentTime > 3) {
			// Restart current track if past 3 seconds
			if (audioRef.current) {
				audioRef.current.currentTime = 0;
			}
		} else if (currentIndex > 0) {
			setCurrentIndex(currentIndex - 1);
			setIsPlaying(true);
		}
	}, [currentIndex, currentTime]);

	// Volume controls
	const handleVolumeChange = useCallback((value: number): void => {
		const audio = audioRef.current;
		if (!audio) return;
		audio.volume = value;
		setVolume(value);
		if (value > 0) setIsMuted(false);
	}, []);

	const toggleMute = useCallback((): void => {
		const audio = audioRef.current;
		if (!audio) return;
		audio.muted = !isMuted;
		setIsMuted(!isMuted);
	}, [isMuted]);

	// Seek
	const handleSeek = useCallback((time: number): void => {
		const audio = audioRef.current;
		if (!audio) return;
		audio.currentTime = time;
		setCurrentTime(time);
	}, []);

	// Audio event handlers
	useEffect(() => {
		const audio = audioRef.current;
		if (!audio) return;

		function handlePlay(): void {
			setIsPlaying(true);
		}
		function handlePause(): void {
			setIsPlaying(false);
		}
		function handleTimeUpdate(): void {
			setCurrentTime(audio?.currentTime ?? 0);
		}
		function handleDurationChange(): void {
			setDuration(audio?.duration ?? 0);
		}
		function handleLoadStart(): void {
			setIsLoading(true);
		}
		function handleCanPlay(): void {
			setIsLoading(false);
		}
		function handleEnded(): void {
			playNext();
		}

		audio.addEventListener("play", handlePlay);
		audio.addEventListener("pause", handlePause);
		audio.addEventListener("timeupdate", handleTimeUpdate);
		audio.addEventListener("durationchange", handleDurationChange);
		audio.addEventListener("loadstart", handleLoadStart);
		audio.addEventListener("canplay", handleCanPlay);
		audio.addEventListener("ended", handleEnded);

		return () => {
			audio.removeEventListener("play", handlePlay);
			audio.removeEventListener("pause", handlePause);
			audio.removeEventListener("timeupdate", handleTimeUpdate);
			audio.removeEventListener("durationchange", handleDurationChange);
			audio.removeEventListener("loadstart", handleLoadStart);
			audio.removeEventListener("canplay", handleCanPlay);
			audio.removeEventListener("ended", handleEnded);
		};
	}, [playNext]);

	// Auto-play when track changes
	useEffect(() => {
		const audio = audioRef.current;
		if (!audio || !audioUrl) return;

		audio.src = audioUrl;
		if (isPlaying) {
			audio.play().catch(() => setIsPlaying(false));
		}
	}, [audioUrl, currentIndex]); // eslint-disable-line react-hooks/exhaustive-deps

	// Download handler
	function handleDownload(): void {
		if (!currentFile) return;
		const url = api.getShareDownloadUrl(shareToken, password);
		const link = document.createElement("a");
		link.href = url;
		link.download = currentFile.name;
		document.body.appendChild(link);
		link.click();
		document.body.removeChild(link);
	}

	const audioMeta = currentFile?.metadata as AudioMetadata | undefined;

	return (
		<div className={cn("flex flex-1 flex-col gap-4 p-4 lg:flex-row", className)}>
			{/* Hidden audio element */}
			<audio ref={audioRef} preload="metadata" />

			{/* Player card */}
			<div className="flex flex-col items-center gap-4 rounded-lg border border-border bg-card p-6 lg:w-80">
				{/* Album art */}
				<div className="flex h-48 w-48 items-center justify-center overflow-hidden rounded-lg bg-secondary">
					{audioMeta?.albumArt && currentFile ? (
						<img
							src={api.getShareThumbnailUrl(shareToken, currentFile.id, "medium", password)}
							alt=""
							className="h-full w-full object-cover"
						/>
					) : (
						<Music className="h-16 w-16 text-muted-foreground" />
					)}
				</div>

				{/* Track info */}
				<div className="w-full text-center">
					<h3 className="truncate text-lg font-medium">
						{audioMeta?.title ?? currentFile?.name ?? "No track"}
					</h3>
					{audioMeta?.artist && (
						<p className="truncate text-sm text-muted-foreground">{audioMeta.artist}</p>
					)}
					{audioMeta?.album && (
						<p className="truncate text-xs text-muted-foreground">{audioMeta.album}</p>
					)}
				</div>

				{/* Progress bar */}
				<div className="w-full space-y-1">
					<Slider
						value={[currentTime]}
						min={0}
						max={duration > 0 ? duration : 100}
						step={0.1}
						onValueChange={([value]) => {
							if (typeof value === "number") handleSeek(value);
						}}
						disabled={isLoading}
					/>
					<div className="flex justify-between text-xs text-muted-foreground">
						<span>{formatDuration(currentTime)}</span>
						<span>{formatDuration(duration)}</span>
					</div>
				</div>

				{/* Main controls */}
				<div className="flex items-center gap-4">
					<Button
						variant="ghost"
						size="icon"
						className={cn("h-8 w-8", isLooped && "text-primary")}
						onClick={() => setIsLooped(!isLooped)}
					>
						<Repeat className="h-4 w-4" />
					</Button>

					<Button variant="ghost" size="icon" className="h-10 w-10" onClick={playPrevious}>
						<SkipBack className="h-5 w-5" />
					</Button>

					<Button size="icon" className="h-14 w-14 rounded-full" onClick={togglePlay}>
						{isLoading ? (
							<Loader2 className="h-6 w-6 animate-spin" />
						) : isPlaying ? (
							<Pause className="h-6 w-6" />
						) : (
							<Play className="ml-1 h-6 w-6" />
						)}
					</Button>

					<Button
						variant="ghost"
						size="icon"
						className="h-10 w-10"
						onClick={playNext}
						disabled={currentIndex >= files.length - 1 && !isLooped}
					>
						<SkipForward className="h-5 w-5" />
					</Button>

					{settings.allowDownload && (
						<Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleDownload}>
							<Download className="h-4 w-4" />
						</Button>
					)}
				</div>

				{/* Volume control */}
				<div className="flex w-full max-w-xs items-center gap-2">
					<Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={toggleMute}>
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
							if (typeof value === "number") handleVolumeChange(value / 100);
						}}
						className="flex-1"
					/>
				</div>
			</div>

			{/* Playlist */}
			<div className="flex flex-1 flex-col rounded-lg border border-border bg-card">
				<div className="flex items-center justify-between border-b border-border p-4">
					<h3 className="font-medium">Queue</h3>
					<span className="text-sm text-muted-foreground">{files.length} tracks</span>
				</div>

				<ScrollArea className="flex-1">
					<div className="flex flex-col">
						{files.map((file, index) => {
							const isCurrent = index === currentIndex;
							const meta = file.metadata as AudioMetadata | undefined;

							return (
								<button
									key={file.id}
									onClick={() => selectTrack(index)}
									className={cn(
										"group flex items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-secondary/50",
										isCurrent && "bg-secondary",
									)}
								>
									{/* Track number / playing indicator */}
									<div className="flex h-8 w-8 shrink-0 items-center justify-center">
										{isCurrent && isPlaying ? (
											<div className="flex items-center gap-0.5">
												<span className="h-3 w-0.5 animate-pulse bg-primary" />
												<span className="animation-delay-150 h-4 w-0.5 animate-pulse bg-primary" />
												<span className="animation-delay-300 h-2 w-0.5 animate-pulse bg-primary" />
											</div>
										) : (
											<span className="text-sm text-muted-foreground">{index + 1}</span>
										)}
									</div>

									{/* Thumbnail */}
									<div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded bg-secondary">
										{meta?.albumArt ? (
											<img
												src={api.getShareThumbnailUrl(shareToken, file.id, "small", password)}
												alt=""
												className="h-full w-full object-cover"
											/>
										) : (
											<Music className="h-4 w-4 text-muted-foreground" />
										)}
									</div>

									{/* Track info */}
									<div className="min-w-0 flex-1">
										<p className={cn("truncate text-sm", isCurrent && "font-medium text-primary")}>
											{meta?.title ?? file.name}
										</p>
										{meta?.artist && (
											<p className="truncate text-xs text-muted-foreground">{meta.artist}</p>
										)}
									</div>

									{/* Duration */}
									{meta?.duration && (
										<span className="shrink-0 text-xs text-muted-foreground">
											{formatDuration(meta.duration)}
										</span>
									)}

									{/* Play/pause on hover */}
									<div className="shrink-0 opacity-0 transition-opacity group-hover:opacity-100">
										{isCurrent && isPlaying ? (
											<Pause className="h-4 w-4" />
										) : (
											<Play className="h-4 w-4" />
										)}
									</div>
								</button>
							);
						})}
					</div>
				</ScrollArea>
			</div>
		</div>
	);
}
