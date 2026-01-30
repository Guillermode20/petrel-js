import type { File, Folder, Share, ShareSettings, ShareType } from '@petrel/shared';

export interface ShareData {
  share: Share;
  settings: ShareSettings;
}

export interface ShareContentData extends ShareData {
  content: File | Folder | null;
  files?: File[];
  folders?: Folder[];
}

export type ApiResponse<T> =
  | { data: T; error: null }
  | { data: null; error: string };

export interface CreateShareRequest {
  type: ShareType;
  targetId: number;
  expiresAt?: string | null;
  password?: string | null;
  allowDownload?: boolean;
  allowZip?: boolean;
  showMetadata?: boolean;
}

export interface UpdateShareRequest {
  expiresAt?: string | null;
  password?: string | null;
  allowDownload?: boolean;
  allowZip?: boolean;
  showMetadata?: boolean;
}