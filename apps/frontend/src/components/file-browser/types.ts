import type { File, Folder } from '@petrel/shared'

export interface FileItemProps {
  item: File | Folder
  isSelected?: boolean
  onSelect?: (item: File | Folder, event: React.MouseEvent) => void
  onDoubleClick?: (item: File | Folder) => void
  onContextMenu?: (item: File | Folder, event: React.MouseEvent) => void
}

export interface FileGridProps {
  items: Array<File | Folder>
  selectedIds: Set<number>
  onSelect: (item: File | Folder, event: React.MouseEvent) => void
  onOpen: (item: File | Folder) => void
  onContextMenu: (item: File | Folder, event: React.MouseEvent) => void
  isLoading?: boolean
}

export interface FileListProps {
  items: Array<File | Folder>
  selectedIds: Set<number>
  onSelect: (item: File | Folder, event: React.MouseEvent) => void
  onOpen: (item: File | Folder) => void
  onContextMenu: (item: File | Folder, event: React.MouseEvent) => void
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
  selectedIds: Set<number>
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
