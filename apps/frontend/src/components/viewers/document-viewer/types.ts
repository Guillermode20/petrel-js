import type { FileItem } from '@petrel/shared'

export interface PDFViewerProps {
  file: FileItem
  className?: string
}

export interface PDFViewerState {
  currentPage: number
  totalPages: number
  scale: number
  isLoading: boolean
  error: string | null
}

export interface CodeViewerProps {
  file: FileItem
  className?: string
}

export interface MarkdownViewerProps {
  file: FileItem
  className?: string
}
