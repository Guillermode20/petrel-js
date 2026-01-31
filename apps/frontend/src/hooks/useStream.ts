import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";

/**
 * Query keys for streaming
 */
export const streamKeys = {
	all: ["stream"] as const,
	info: (fileId: number) => [...streamKeys.all, "info", fileId] as const,
	subtitles: (fileId: number) => [...streamKeys.all, "subtitles", fileId] as const,
	tracks: (fileId: number) => [...streamKeys.all, "tracks", fileId] as const,
};

type StreamSubtitles = Awaited<ReturnType<typeof api.getStreamSubtitles>>;
type StreamTracks = Awaited<ReturnType<typeof api.getStreamTracks>>;

/**
 * Hook for fetching stream info for a video file
 */
export function useStreamInfo(fileId: number) {
	return useQuery({
		queryKey: streamKeys.info(fileId),
		queryFn: () => api.getStreamInfo(fileId),
		enabled: fileId > 0,
		refetchInterval: (query) => {
			// Poll every 2s if transcoding is in progress
			const data = query.state.data;
			if (data?.transcodeJob?.status === "processing") {
				return 2000;
			}
			return false;
		},
	});
}

export function useStreamSubtitles(fileId: number) {
	return useQuery({
		queryKey: streamKeys.subtitles(fileId),
		queryFn: (): Promise<StreamSubtitles> => api.getStreamSubtitles(fileId),
		enabled: fileId > 0,
	});
}

export function useStreamTracks(fileId: number) {
	return useQuery({
		queryKey: streamKeys.tracks(fileId),
		queryFn: (): Promise<StreamTracks> => api.getStreamTracks(fileId),
		enabled: fileId > 0,
	});
}

/**
 * Get the HLS master playlist URL for a video
 */
export function getStreamUrl(fileId: number): string {
	return api.getMasterPlaylistUrl(fileId);
}
