import type { Album, File } from '@petrel/shared'

export interface AlbumGridProps {
  albums: Album[]
  isLoading?: boolean
  onAlbumClick?: (album: Album) => void
  onCreateClick?: () => void
  className?: string
}

export interface AlbumCardProps {
  album: Album
  onClick?: () => void
  className?: string
}

export interface AlbumDetailProps {
  album: Album
  files: File[]
  isLoading?: boolean
  onBack?: () => void
  onFileClick?: (file: File) => void
  onRemoveFile?: (fileId: number) => void
  onReorder?: (fileIds: number[]) => void
  className?: string
}

export interface CreateAlbumModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess?: (album: Album) => void
}

export interface AddToAlbumModalProps {
  fileIds: number[]
  isOpen: boolean
  onClose: () => void
  onSuccess?: () => void
}

export interface AlbumCoverProps {
  album: Album
  size?: 'sm' | 'md' | 'lg'
  className?: string
}
