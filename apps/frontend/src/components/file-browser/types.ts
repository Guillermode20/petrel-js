import type { File, Folder } from '@petrel/shared'

export interface FileItemProps {
  item: File | Folder
  isSelected?: boolean
  onSelect?: (item: File | Folder, event: React.MouseEvent) => void
  onDoubleClick?: (item: File | Folder, event?: React.MouseEvent) => void
  onDragStart?: (item: File | Folder, event: React.DragEvent) => void
  onDrop?: (target: File | Folder, event: React.DragEvent) => void
}

export interface FileGridProps {
  items: Array<File | Folder>
  selectedIds: Set<string>
  onSelect: (item: File | Folder, event: React.MouseEvent) => void
  onOpen: (item: File | Folder) => void
  onContextMenu: (item: File | Folder, event: React.MouseEvent) => void
  onMove: (item: { id: number; type: 'file' | 'folder' }, targetId: number | null) => void
  onRename?: (item: File | Folder) => void
  onDelete?: (item: File | Folder) => void
  onShare?: (item: File | Folder) => void
  onDownload?: (item: File | Folder) => void
  onCopyLink?: (item: File | Folder) => void
  isLoading?: boolean
}

export interface FileListProps {
  items: Array<File | Folder>
  selectedIds: Set<string>
  onSelect: (item: File | Folder, event: React.MouseEvent) => void
  onOpen: (item: File | Folder) => void
  onContextMenu: (item: File | Folder, event: React.MouseEvent) => void
  onMove: (item: { id: number; type: 'file' | 'folder' }, targetId: number | null) => void
  onRename?: (item: File | Folder) => void
  onDelete?: (item: File | Folder) => void
  onShare?: (item: File | Folder) => void
  onDownload?: (item: File | Folder) => void
  onCopyLink?: (item: File | Folder) => void
  sortBy: SortField
  sortOrder: 'asc' | 'desc'
  onSort: (field: SortField) => void
  isLoading?: boolean
}

export type ViewMode = 'grid' | 'list'

export type SortField = 'name' | 'date' | 'size' | 'type'

export interface FileBrowserState {
  viewMode: ViewMode
  sortBy: SortField
  sortOrder: 'asc' | 'desc'
  selectedIds: Set<string>
  searchQuery: string
}

export interface UploadProgress {
  file: globalThis.File
  progress: number
  status: 'pending' | 'uploading' | 'completed' | 'error'
  error?: string
}

export interface ContextMenuAction {
  label: string
  icon: React.ComponentType<{ className?: string }>
  action: () => void
  destructive?: boolean
  disabled?: boolean
}
