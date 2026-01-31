import { useCallback, useEffect, useRef, useState } from "react";
import { getStreamUrl, useStreamInfo, useStreamSubtitles, useStreamTracks } from "@/hooks";
import { cn } from "@/lib/utils";
import type { VideoPlayerProps } from "./types";
import { useVideoPlayer } from "./useVideoPlayer";
import { VideoControlBar } from "./VideoControls";

/**
 * Custom video player with HLS.js support, quality switching, and darkmatter styling
 *
 * Features:
 * - HLS streaming with quality selection
 * - Audio track and subtitle switching
 * - Keyboard shortcuts (space, arrows, f, m)
 * - Resume playback position
 * - Transcode progress overlay
 */
export function VideoPlayer({
	fileId,
	poster,
	className,
	autoPlay = false,
	onEnded,
	onError,
}: VideoPlayerProps) {
	const containerRef = useRef<HTMLDivElement>(null);
	const [showControls, setShowControls] = useState(true);
	const controlsTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

	// Fetch stream info (qualities, transcode status)
	const { data: streamInfo } = useStreamInfo(fileId);
	const { data: subtitlesData } = useStreamSubtitles(fileId);
	const { data: tracksData } = useStreamTracks(fileId);

	const src = getStreamUrl(fileId);

	const audioTracks = tracksData
		?.filter((track) => track.type === "audio")
		.map((track) => ({
			id: track.index,
			fileId,
			trackType: track.type as "audio",
			codec: track.codec,
			language: track.language,
			index: track.index,
			title: track.title,
		}));

	const subtitles = subtitlesData?.map((subtitle) => ({
		id: subtitle.id,
		fileId,
		language: subtitle.language,
		path: `/api/stream/${fileId}/subtitles/${subtitle.id}`,
		format: "webvtt",
		title: subtitle.title,
	}));

	const { state, controls, videoRef } = useVideoPlayer({
		src,
		fileId,
		audioTracks,
		subtitles,
		transcodeJob: streamInfo?.transcodeJob ?? undefined,
		autoPlay,
	});

	// Handle video end
	useEffect(() => {
		const video = videoRef.current;
		if (!video || !onEnded) return;

		video.addEventListener("ended", onEnded);
		return () => video.removeEventListener("ended", onEnded);
	}, [onEnded, videoRef]);

	// Handle errors
	useEffect(() => {
		if (state.error && onError) {
			onError(new Error(state.error));
		}
	}, [state.error, onError]);

	// Keyboard shortcuts
	useEffect(() => {
		const handleKeyDown = (e: KeyboardEvent) => {
			// Only handle if not typing in an input
			if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
				return;
			}

			switch (e.key.toLowerCase()) {
				case " ":
				case "k":
					e.preventDefault();
					controls.togglePlay();
					break;
				case "arrowleft":
				case "j":
					e.preventDefault();
					controls.seekRelative(-5);
					break;
				case "arrowright":
				case "l":
					e.preventDefault();
					controls.seekRelative(5);
					break;
				case "arrowup":
					e.preventDefault();
					controls.setVolume(state.volume + 0.1);
					break;
				case "arrowdown":
					e.preventDefault();
					controls.setVolume(state.volume - 0.1);
					break;
				case "m":
					e.preventDefault();
					controls.toggleMute();
					break;
				case "f":
					e.preventDefault();
					controls.toggleFullscreen();
					break;
			}
		};

		document.addEventListener("keydown", handleKeyDown);
		return () => document.removeEventListener("keydown", handleKeyDown);
	}, [controls, state.volume]);

	// Auto-hide controls
	const showControlsTemporarily = useCallback(() => {
		setShowControls(true);
		if (controlsTimeoutRef.current) {
			clearTimeout(controlsTimeoutRef.current);
		}
		if (state.isPlaying) {
			controlsTimeoutRef.current = setTimeout(() => {
				setShowControls(false);
			}, 3000);
		}
	}, [state.isPlaying]);

	useEffect(() => {
		if (!state.isPlaying) {
			setShowControls(true);
		}
	}, [state.isPlaying]);

	return (
		<div
			ref={containerRef}
			className={cn(
				"group relative aspect-video w-full overflow-hidden rounded-lg bg-black",
				className,
			)}
			onMouseMove={showControlsTemporarily}
			onMouseLeave={() => state.isPlaying && setShowControls(false)}
		>
			<video
				ref={videoRef}
				className="h-full w-full"
				poster={poster}
				playsInline
				onClick={controls.togglePlay}
			/>

			{/* Controls overlay */}
			<div
				className={cn(
					"transition-opacity duration-300",
					showControls ? "opacity-100" : "opacity-0",
				)}
			>
				<VideoControlBar state={state} controls={controls} />
			</div>

			{/* Error overlay */}
			{state.error && (
				<div className="absolute inset-0 flex items-center justify-center bg-black/80">
					<div className="text-center">
						<p className="text-destructive">Playback error</p>
						<p className="text-sm text-muted-foreground">{state.error}</p>
					</div>
				</div>
			)}
		</div>
	);
}
