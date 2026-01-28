import type { Album, AlbumFile, File } from '@petrel/shared';

export type ApiResponse<T> =
  | { data: T; error: null }
  | { data: null; error: string };

export interface AlbumWithFiles {
  album: Album;
  files: Array<File & { sortOrder: number }>;
}

export interface CreateAlbumRequest {
  name: string;
  description?: string | null;
  coverFileId?: number | null;
}

export interface UpdateAlbumRequest {
  name?: string;
  description?: string | null;
  coverFileId?: number | null;
}

export interface AddFilesRequest {
  fileIds: number[];
}

export interface ReorderRequest {
  items: Array<{ fileId: number; sortOrder: number }>;
}