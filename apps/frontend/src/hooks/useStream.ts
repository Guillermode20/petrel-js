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
	shareInfo: (shareToken: string, fileId: number, password?: string) =>
		[...streamKeys.all, "share", "info", shareToken, fileId, password] as const,
	shareSubtitles: (shareToken: string, fileId: number, password?: string) =>
		[...streamKeys.all, "share", "subtitles", shareToken, fileId, password] as const,
	shareTracks: (shareToken: string, fileId: number, password?: string) =>
		[...streamKeys.all, "share", "tracks", shareToken, fileId, password] as const,
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

export function useShareStreamInfo(shareToken: string | undefined, fileId: number, password?: string) {
	return useQuery({
		queryKey: shareToken ? streamKeys.shareInfo(shareToken, fileId, password) : streamKeys.info(fileId),
		queryFn: () => {
			if (!shareToken) {
				throw new Error("Missing share token");
			}
			return api.getShareStreamInfo(shareToken, fileId, password);
		},
		enabled: fileId > 0 && !!shareToken,
		refetchInterval: (query) => {
			const data = query.state.data;
			if (data?.transcodeJob?.status === "processing") {
				return 2000;
			}
			return false;
		},
	});
}

export function useShareStreamSubtitles(
	shareToken: string | undefined,
	fileId: number,
	password?: string,
) {
	return useQuery({
		queryKey: shareToken
			? streamKeys.shareSubtitles(shareToken, fileId, password)
			: streamKeys.subtitles(fileId),
		queryFn: (): Promise<StreamSubtitles> => {
			if (!shareToken) {
				throw new Error("Missing share token");
			}
			return api.getShareStreamSubtitles(shareToken, fileId, password);
		},
		enabled: fileId > 0 && !!shareToken,
	});
}

export function useShareStreamTracks(shareToken: string | undefined, fileId: number, password?: string) {
	return useQuery({
		queryKey: shareToken
			? streamKeys.shareTracks(shareToken, fileId, password)
			: streamKeys.tracks(fileId),
		queryFn: (): Promise<StreamTracks> => {
			if (!shareToken) {
				throw new Error("Missing share token");
			}
			return api.getShareStreamTracks(shareToken, fileId, password);
		},
		enabled: fileId > 0 && !!shareToken,
	});
}

/**
 * Get the HLS master playlist URL for a video
 */
export function getStreamUrl(fileId: number): string {
	return api.getMasterPlaylistUrl(fileId);
}
