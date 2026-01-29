import type { File, ImageMetadata } from '@petrel/shared'

export interface ImageViewerProps {
  file: File
  className?: string
}

export interface LightboxProps {
  images: File[]
  initialIndex?: number
  open: boolean
  onOpenChange: (open: boolean) => void
  onDownload?: (file: File) => void
}

export interface AlbumGalleryProps {
  files: File[]
  onImageClick?: (file: File, index: number) => void
  className?: string
  isLoading?: boolean
}

export interface ExifDisplayProps {
  metadata: ImageMetadata
  className?: string
}

export interface SlideshowState {
  isPlaying: boolean
  interval: number
}
