import type { File, Folder } from '@petrel/shared';

export interface PaginationInfo {
  limit: number;
  offset: number;
  total: number;
}

export interface FileListData {
  files: File[];
  folders: Folder[];
  currentFolder: Folder | null;
  pagination: PaginationInfo;
}

export type ApiResponse<T> =
  | { data: T; error: null }
  | { data: null; error: string };

export interface UploadChunkRequest {
  uploadId: string;
  chunkIndex: number;
  totalChunks: number;
  fileName: string;
  path?: string;
  mimeType?: string;
  size?: number;
}

export interface FileUpdateRequest {
  name?: string;
  path?: string;
}

export interface CreateFolderRequest {
  name: string;
  parentPath?: string | null;
}