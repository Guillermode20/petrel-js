import { Loader2 } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { useLongPress, useRegisterContextMenuActionHandler } from "@/components/global-context-menu";
import type { ContextMenuActionHandler, VideoPlayerContext } from "@/components/global-context-menu";
import {
	getStreamUrl,
	useShareStreamInfo,
	useShareStreamSubtitles,
	useShareStreamTracks,
	useStreamInfo,
	useStreamSubtitles,
	useStreamTracks,
} from "@/hooks";
import { api } from "@/lib/api";
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
	src: srcProp,
	fileId,
	shareToken,
	sharePassword,
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
	const authStreamInfoQuery = useStreamInfo(fileId);
	const authSubtitlesQuery = useStreamSubtitles(fileId);
	const authTracksQuery = useStreamTracks(fileId);

	const shareStreamInfoQuery = useShareStreamInfo(shareToken, fileId, sharePassword);
	const shareSubtitlesQuery = useShareStreamSubtitles(shareToken, fileId, sharePassword);
	const shareTracksQuery = useShareStreamTracks(shareToken, fileId, sharePassword);

	const streamInfo = shareToken ? shareStreamInfoQuery.data : authStreamInfoQuery.data;
	const isStreamInfoLoading = shareToken
		? shareStreamInfoQuery.isLoading
		: authStreamInfoQuery.isLoading;
	const subtitlesData = shareToken ? shareSubtitlesQuery.data : authSubtitlesQuery.data;
	const tracksData = shareToken ? shareTracksQuery.data : authTracksQuery.data;

	const src = useMemo(() => {
		return typeof srcProp === "string" && srcProp.length > 0 ? srcProp : getStreamUrl(fileId);
	}, [fileId, srcProp]);
	const isStreamReady = streamInfo?.available ?? false;

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
		path: shareToken
			? `/api/stream/share/${shareToken}/${fileId}/subtitles/${subtitle.id}${sharePassword ? `?password=${encodeURIComponent(sharePassword)}` : ""}`
			: `/api/stream/${fileId}/subtitles/${subtitle.id}`,
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

	// Preload HLS manifest in document head for faster loading
	useEffect(() => {
		if (!src || !isStreamReady) return;

		// Prevent duplicate preload links
		const linkId = `preload-manifest-${fileId}`;
		if (document.getElementById(linkId)) return;

		// Create preload link for manifest
		const link = document.createElement("link");
		link.id = linkId;
		link.rel = "preload";
		link.href = src;
		link.as = "fetch";
		link.crossOrigin = "anonymous";
		document.head.appendChild(link);

		return () => {
			const existingLink = document.getElementById(linkId);
			if (existingLink && existingLink.parentNode) {
				existingLink.parentNode.removeChild(existingLink);
			}
		};
	}, [src, isStreamReady, fileId]);

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

	const handleTogglePip = useCallback(async () => {
		try {
			const video = videoRef.current;
			if (!video) return;
			if (document.pictureInPictureElement) {
				await document.exitPictureInPicture();
			} else {
				await video.requestPictureInPicture();
			}
		} catch (err) {
			toast.error("Picture-in-picture not supported");
		}
	}, [videoRef]);

	const handleDownload = useCallback(() => {
		window.open(api.getDownloadUrl(fileId), "_blank");
	}, [fileId]);

	const handleCopyTimestampLink = useCallback(() => {
		const url = new URL(window.location.href);
		url.searchParams.set("t", String(Math.floor(state.currentTime)));
		navigator.clipboard.writeText(url.toString());
		toast.success("Timestamp link copied");
	}, [state.currentTime]);

	const contextMenuAudioTracks =
		audioTracks?.map((t) => ({ id: t.id, language: t.language ?? "Unknown", title: t.title ?? undefined })) ?? [];
	const contextMenuSubtitleTracks =
		subtitles?.map((s) => ({ id: s.id, language: s.language, title: s.title ?? undefined })) ?? [];

	const handleContextMenuAction = useCallback<ContextMenuActionHandler>(
		async (action: string, context, data?: unknown) => {
			if (context.type !== "video-player") return;

			if (action === "set-playback-speed" && typeof data === "number") {
				controls.setPlaybackRate(data);
				return;
			}

			if (action === "set-audio-track" && typeof data === "number") {
				controls.setAudioTrack(data);
				return;
			}

			if (action === "set-subtitle-track") {
				if (data === null) {
					controls.setSubtitleTrack(-1);
					return;
				}
				if (typeof data === "number") {
					controls.setSubtitleTrack(data);
				}
				return;
			}

			if (action === "toggle-pip") return void handleTogglePip();
			if (action === "download-video") return void handleDownload();
			if (action === "copy-timestamp-link") return void handleCopyTimestampLink();
		},
		[controls, handleCopyTimestampLink, handleDownload, handleTogglePip],
	);

	const contextMenuHandlerId = useRegisterContextMenuActionHandler(handleContextMenuAction);

	const contextMenuContext = useMemo<VideoPlayerContext>(() => {
		return {
			type: "video-player",
			fileId,
			currentTime: state.currentTime,
			duration: state.duration,
			playbackRate: state.playbackRate,
			audioTracks: contextMenuAudioTracks,
			subtitleTracks: contextMenuSubtitleTracks,
			selectedAudioTrack: state.audioTrack,
			selectedSubtitleTrack: state.subtitleTrack >= 0 ? state.subtitleTrack : undefined,
		};
	}, [
		contextMenuAudioTracks,
		contextMenuSubtitleTracks,
		fileId,
		state.audioTrack,
		state.currentTime,
		state.duration,
		state.playbackRate,
		state.subtitleTrack,
	]);

	const longPressHandlers = useLongPress(
		contextMenuContext,
		contextMenuHandlerId,
	);

	return (
		<div
			ref={containerRef}
			className={cn("group relative aspect-video w-full overflow-hidden rounded-lg bg-background", className)}
			onMouseMove={showControlsTemporarily}
			onMouseLeave={() => state.isPlaying && setShowControls(false)}
			{...longPressHandlers}
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

			{/* Loading overlay when stream not ready */}
			{(!isStreamReady || isStreamInfoLoading) && (
				<div className="absolute inset-0 flex items-center justify-center bg-background/90 backdrop-blur-sm">
					<div className="text-center">
						<Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-2" />
						<p className="text-muted-foreground">Preparing stream...</p>
					</div>
				</div>
			)}

			{/* Error overlay */}
			{state.error && (
				<div className="absolute inset-0 flex items-center justify-center bg-background/90 backdrop-blur-sm">
					<div className="text-center">
						<p className="text-destructive">Playback error</p>
						<p className="text-sm text-muted-foreground">{state.error}</p>
					</div>
				</div>
			)}
		</div>
	);
}
