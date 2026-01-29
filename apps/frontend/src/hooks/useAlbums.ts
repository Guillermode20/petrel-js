import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'

/**
 * Query keys for albums
 */
export const albumKeys = {
  all: ['albums'] as const,
  lists: () => [...albumKeys.all, 'list'] as const,
  details: () => [...albumKeys.all, 'detail'] as const,
  detail: (id: number) => [...albumKeys.details(), id] as const,
}

/**
 * Hook for fetching all albums
 */
export function useAlbums() {
  return useQuery({
    queryKey: albumKeys.lists(),
    queryFn: () => api.getAlbums(),
  })
}

/**
 * Hook for fetching a single album with its files
 */
export function useAlbum(id: number) {
  return useQuery({
    queryKey: albumKeys.detail(id),
    queryFn: () => api.getAlbum(id),
    enabled: id > 0,
  })
}

/**
 * Hook for creating an album
 */
export function useCreateAlbum() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: { name: string; description?: string }) => api.createAlbum(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: albumKeys.lists() })
    },
  })
}

/**
 * Hook for updating an album
 */
export function useUpdateAlbum() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: number
      data: { name?: string; description?: string; coverFileId?: number }
    }) => api.updateAlbum(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: albumKeys.lists() })
      queryClient.invalidateQueries({ queryKey: albumKeys.detail(variables.id) })
    },
  })
}

/**
 * Hook for deleting an album
 */
export function useDeleteAlbum() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: number) => api.deleteAlbum(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: albumKeys.lists() })
    },
  })
}

/**
 * Hook for adding files to an album
 */
export function useAddFilesToAlbum() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ albumId, fileIds }: { albumId: number; fileIds: number[] }) =>
      api.addFilesToAlbum(albumId, fileIds),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: albumKeys.detail(variables.albumId) })
    },
  })
}

/**
 * Hook for removing a file from an album
 */
export function useRemoveFileFromAlbum() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ albumId, fileId }: { albumId: number; fileId: number }) =>
      api.removeFileFromAlbum(albumId, fileId),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: albumKeys.detail(variables.albumId) })
    },
  })
}

/**
 * Hook for reordering files in an album
 */
export function useReorderAlbumFiles() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ albumId, fileIds }: { albumId: number; fileIds: number[] }) =>
      api.reorderAlbumFiles(albumId, fileIds),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: albumKeys.detail(variables.albumId) })
    },
  })
}
