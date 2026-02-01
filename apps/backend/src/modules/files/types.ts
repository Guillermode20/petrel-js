import type { ApiResponse, FileListData, PaginationInfo } from "@petrel/shared";

export type { ApiResponse, FileListData, PaginationInfo };

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
