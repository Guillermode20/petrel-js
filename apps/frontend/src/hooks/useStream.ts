import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'

/**
 * Query keys for streaming
 */
export const streamKeys = {
  all: ['stream'] as const,
  info: (fileId: number) => [...streamKeys.all, 'info', fileId] as const,
}

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
      const data = query.state.data
      if (data?.transcodeJob?.status === 'processing') {
        return 2000
      }
      return false
    },
  })
}

/**
 * Get the HLS master playlist URL for a video
 */
export function getStreamUrl(fileId: number): string {
  return api.getMasterPlaylistUrl(fileId)
}
