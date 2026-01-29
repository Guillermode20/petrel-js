import type { File } from '@petrel/shared'

export interface FilePreviewProps {
  file: File
  files?: File[]
  onNavigate?: (direction: 'prev' | 'next') => void
  onClose?: () => void
  className?: string
}

export type PreviewType = 
  | 'video'
  | 'audio'
  | 'image'
  | 'pdf'
  | 'code'
  | 'markdown'
  | 'text'
  | 'unsupported'
