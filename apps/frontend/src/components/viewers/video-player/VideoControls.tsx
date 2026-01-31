import {
	Loader2,
	Maximize,
	Minimize,
	Pause,
	Play,
	Settings,
	Subtitles,
	Volume2,
	VolumeX,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuRadioGroup,
	DropdownMenuRadioItem,
	DropdownMenuSeparator,
	DropdownMenuSub,
	DropdownMenuSubContent,
	DropdownMenuSubTrigger,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Progress } from "@/components/ui/progress";
import { Slider } from "@/components/ui/slider";
import { cn } from "@/lib/utils";
import type { VideoControls, VideoPlayerState } from "./types";
import { formatDuration } from "./utils";

interface VideoControlsProps {
	state: VideoPlayerState;
	controls: VideoControls;
	className?: string;
}

const playbackRates = [0.5, 0.75, 1, 1.25, 1.5, 2];

/**
 * Video player control bar with play/pause, seek, volume, quality, and more
 */
export function VideoControlBar({ state, controls, className }: VideoControlsProps) {
	const {
		isPlaying,
		isBuffering,
		isMuted,
		isFullscreen,
		currentTime,
		duration,
		buffered,
		volume,
		playbackRate,
		quality,
		availableQualities,
		audioTrack,
		audioTracks,
		subtitleTrack,
		subtitles,
		transcodeJob,
	} = state;

	const bufferedProgress = duration > 0 ? (buffered / duration) * 100 : 0;

	// Show transcode progress if job is processing
	if (transcodeJob?.status === "processing") {
		return (
			<div
				className={cn("absolute inset-0 flex items-center justify-center bg-black/80", className)}
			>
				<div className="flex flex-col items-center gap-4 text-center">
					<Loader2 className="h-8 w-8 animate-spin text-primary" />
					<div>
						<p className="text-sm font-medium">Preparing video...</p>
						<p className="text-xs text-muted-foreground">Transcoding: {transcodeJob.progress}%</p>
					</div>
					<Progress value={transcodeJob.progress} className="w-48" />
				</div>
			</div>
		);
	}

	return (
		<div
			className={cn(
				"absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4 transition-opacity",
				className,
			)}
		>
			{/* Seek bar */}
			<div className="group relative mb-2 h-1 w-full cursor-pointer rounded bg-white/20">
				{/* Buffered progress */}
				<div
					className="absolute h-full rounded bg-white/30"
					style={{ width: `${bufferedProgress}%` }}
				/>
				{/* Playback progress */}
				<Slider
					value={[currentTime]}
					min={0}
					max={duration || 100}
					step={0.1}
					onValueChange={([value]) => controls.seek(value)}
					className="absolute inset-0"
				/>
			</div>

			{/* Controls row */}
			<div className="flex items-center justify-between gap-4">
				{/* Left controls */}
				<div className="flex items-center gap-2">
					{/* Play/Pause */}
					<Button
						variant="ghost"
						size="icon"
						className="h-8 w-8 text-white hover:bg-white/20 hover:text-white"
						onClick={controls.togglePlay}
					>
						{isBuffering ? (
							<Loader2 className="h-5 w-5 animate-spin" />
						) : isPlaying ? (
							<Pause className="h-5 w-5" />
						) : (
							<Play className="h-5 w-5" />
						)}
					</Button>

					{/* Volume */}
					<div className="flex items-center gap-1">
						<Button
							variant="ghost"
							size="icon"
							className="h-8 w-8 text-white hover:bg-white/20 hover:text-white"
							onClick={controls.toggleMute}
						>
							{isMuted || volume === 0 ? (
								<VolumeX className="h-5 w-5" />
							) : (
								<Volume2 className="h-5 w-5" />
							)}
						</Button>
						<Slider
							value={[isMuted ? 0 : volume * 100]}
							min={0}
							max={100}
							step={1}
							onValueChange={([value]) => controls.setVolume(value / 100)}
							className="w-20"
						/>
					</div>

					{/* Time display */}
					<span className="text-xs text-white">
						{formatDuration(currentTime)} / {formatDuration(duration)}
					</span>
				</div>

				{/* Right controls */}
				<div className="flex items-center gap-1">
					{/* Subtitles */}
					{subtitles.length > 0 && (
						<DropdownMenu>
							<DropdownMenuTrigger asChild>
								<Button
									variant="ghost"
									size="icon"
									className={cn(
										"h-8 w-8 text-white hover:bg-white/20 hover:text-white",
										subtitleTrack >= 0 && "text-primary",
									)}
								>
									<Subtitles className="h-5 w-5" />
								</Button>
							</DropdownMenuTrigger>
							<DropdownMenuContent align="end">
								<DropdownMenuRadioGroup
									value={String(subtitleTrack)}
									onValueChange={(v) => controls.setSubtitleTrack(parseInt(v, 10))}
								>
									<DropdownMenuRadioItem value="-1">Off</DropdownMenuRadioItem>
									<DropdownMenuSeparator />
									{subtitles.map((sub, index) => (
										<DropdownMenuRadioItem key={sub.id} value={String(index)}>
											{sub.title ?? sub.language}
										</DropdownMenuRadioItem>
									))}
								</DropdownMenuRadioGroup>
							</DropdownMenuContent>
						</DropdownMenu>
					)}

					{/* Settings */}
					<DropdownMenu>
						<DropdownMenuTrigger asChild>
							<Button
								variant="ghost"
								size="icon"
								className="h-8 w-8 text-white hover:bg-white/20 hover:text-white"
							>
								<Settings className="h-5 w-5" />
							</Button>
						</DropdownMenuTrigger>
						<DropdownMenuContent align="end" className="w-48">
							{/* Quality */}
							<DropdownMenuSub>
								<DropdownMenuSubTrigger>Quality: {quality}</DropdownMenuSubTrigger>
								<DropdownMenuSubContent>
									<DropdownMenuRadioGroup value={quality} onValueChange={controls.setQuality}>
										{availableQualities.map((q) => (
											<DropdownMenuRadioItem key={q} value={q}>
												{q}
											</DropdownMenuRadioItem>
										))}
									</DropdownMenuRadioGroup>
								</DropdownMenuSubContent>
							</DropdownMenuSub>

							{/* Playback speed */}
							<DropdownMenuSub>
								<DropdownMenuSubTrigger>Speed: {playbackRate}x</DropdownMenuSubTrigger>
								<DropdownMenuSubContent>
									<DropdownMenuRadioGroup
										value={String(playbackRate)}
										onValueChange={(v) => controls.setPlaybackRate(parseFloat(v))}
									>
										{playbackRates.map((rate) => (
											<DropdownMenuRadioItem key={rate} value={String(rate)}>
												{rate}x
											</DropdownMenuRadioItem>
										))}
									</DropdownMenuRadioGroup>
								</DropdownMenuSubContent>
							</DropdownMenuSub>

							{/* Audio track */}
							{audioTracks.length > 1 && (
								<DropdownMenuSub>
									<DropdownMenuSubTrigger>
										Audio:{" "}
										{audioTracks[audioTrack]?.title ??
											audioTracks[audioTrack]?.language ??
											"Track 1"}
									</DropdownMenuSubTrigger>
									<DropdownMenuSubContent>
										<DropdownMenuRadioGroup
											value={String(audioTrack)}
											onValueChange={(v) => controls.setAudioTrack(parseInt(v, 10))}
										>
											{audioTracks.map((track, index) => (
												<DropdownMenuRadioItem key={track.id} value={String(index)}>
													{track.title ?? track.language ?? `Track ${index + 1}`}
												</DropdownMenuRadioItem>
											))}
										</DropdownMenuRadioGroup>
									</DropdownMenuSubContent>
								</DropdownMenuSub>
							)}
						</DropdownMenuContent>
					</DropdownMenu>

					{/* Fullscreen */}
					<Button
						variant="ghost"
						size="icon"
						className="h-8 w-8 text-white hover:bg-white/20 hover:text-white"
						onClick={controls.toggleFullscreen}
					>
						{isFullscreen ? <Minimize className="h-5 w-5" /> : <Maximize className="h-5 w-5" />}
					</Button>
				</div>
			</div>
		</div>
	);
}
