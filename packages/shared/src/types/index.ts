export type UserRole = 'admin' | 'user' | 'guest'

export interface User {
  id: number
  username: string
  role: UserRole
  createdAt: Date
}

export interface File {
  id: number
  name: string
  path: string
  size: number
  mimeType: string
  hash: string
  uploadedBy: number | null
  createdAt: Date
  metadata?: VideoMetadata | AudioMetadata | ImageMetadata
}

export interface Folder {
  id: number
  name: string
  path: string
  parentId: number | null
  ownerId: number | null
}

export type ShareType = 'file' | 'folder' | 'album'

export interface Share {
  id: number
  type: ShareType
  targetId: number
  token: string
  expiresAt: Date | null
  passwordHash: string | null
  downloadCount: number
  viewCount: number
}

export interface ShareSettings {
  shareId: number
  allowDownload: boolean
  allowZip: boolean
  showMetadata: boolean
}

export interface Album {
  id: number
  name: string
  description: string | null
  coverFileId: number | null
  ownerId: number | null
  createdAt: Date
}

export interface AlbumFile {
  albumId: number
  fileId: number
  sortOrder: number
}

export type TranscodeStatus = 'pending' | 'processing' | 'completed' | 'failed'

export interface TranscodeJob {
  id: number
  fileId: number
  status: TranscodeStatus
  progress: number
  outputPath: string | null
  createdAt: Date
  completedAt: Date | null
  error: string | null
}

export type VideoTrackType = 'video' | 'audio' | 'subtitle'

export interface VideoTrack {
  id: number
  fileId: number
  trackType: VideoTrackType
  codec: string
  language: string | null
  index: number
  title: string | null
}

export interface Subtitle {
  id: number
  fileId: number
  language: string
  path: string
  format: string
  title: string | null
}

export interface VideoMetadata {
  duration: number
  width: number
  height: number
  codec: string
  bitrate: number
  fps: number
  audioTracks: Array<{
    codec: string
    language: string | null
    channels: number
  }>
  subtitles: Array<{
    language: string
    format: string
  }>
}

export interface AudioMetadata {
  duration: number
  codec: string
  bitrate: number
  sampleRate: number
  channels: number
  title: string | null
  artist: string | null
  album: string | null
  year: number | null
  genre: string | null
  albumArt: boolean
}

export interface ImageMetadata {
  width: number
  height: number
  format: string
  exif: {
    make: string | null
    model: string | null
    lens: string | null
    dateTaken: Date | null
    exposureTime: string | null
    fNumber: string | null
    iso: number | null
    focalLength: string | null
    gps: {
      latitude: number
      longitude: number
    } | null
  } | null
}
