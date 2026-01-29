import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import type { File, Folder } from '@petrel/shared'

/**
 * Query keys for files and folders
 */
export const fileKeys = {
  all: ['files'] as const,
  lists: () => [...fileKeys.all, 'list'] as const,
  list: (params: { folderId?: number; page?: number; sort?: string; order?: string; search?: string }) =>
    [...fileKeys.lists(), params] as const,
  details: () => [...fileKeys.all, 'detail'] as const,
  detail: (id: number) => [...fileKeys.details(), id] as const,
}

/**
 * Hook for fetching files and folders in a directory
 */
export function useFiles(params?: {
  folderId?: number
  page?: number
  limit?: number
  sort?: 'name' | 'date' | 'size' | 'type'
  order?: 'asc' | 'desc'
  search?: string
}) {
  return useQuery({
    queryKey: fileKeys.list({
      folderId: params?.folderId,
      page: params?.page,
      sort: params?.sort,
      order: params?.order,
      search: params?.search,
    }),
    queryFn: () => api.getFiles(params),
  })
}

/**
 * Hook for fetching a single file's details
 */
export function useFile(id: number) {
  return useQuery({
    queryKey: fileKeys.detail(id),
    queryFn: () => api.getFile(id),
    enabled: id > 0,
  })
}

/**
 * Hook for uploading files
 */
export function useUploadFile() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      file,
      folderId,
      onProgress,
    }: {
      file: globalThis.File
      folderId?: number
      onProgress?: (progress: number) => void
    }) => api.uploadFile(file, folderId, onProgress),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: fileKeys.lists() })
    },
  })
}

/**
 * Hook for deleting files
 */
export function useDeleteFile() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: number) => api.deleteFile(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: fileKeys.lists() })
    },
  })
}

/**
 * Hook for updating files (rename, move)
 */
export function useUpdateFile() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: { name?: string; folderId?: number } }) =>
      api.updateFile(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: fileKeys.lists() })
      queryClient.invalidateQueries({ queryKey: fileKeys.detail(variables.id) })
    },
  })
}

/**
 * Hook for creating folders
 */
export function useCreateFolder() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ name, parentId }: { name: string; parentId?: number }) =>
      api.createFolder(name, parentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: fileKeys.lists() })
    },
  })
}

/**
 * Type guard for checking if an item is a file
 */
export function isFile(item: File | Folder): item is File {
  return 'mimeType' in item
}

/**
 * Type guard for checking if an item is a folder
 */
export function isFolder(item: File | Folder): item is Folder {
  return !('mimeType' in item)
}
