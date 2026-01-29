import type { Share } from '@petrel/shared'

export interface CreateShareModalProps {
  type: 'file' | 'folder'
  targetId: number
  targetName: string
  isOpen: boolean
  onClose: () => void
  onSuccess?: (share: Share) => void
}

export interface ShareTableProps {
  shares: Share[]
  isLoading?: boolean
  onDelete?: (shareId: number) => void
  className?: string
}

export interface CopyLinkButtonProps {
  shareToken: string
  className?: string
}

export interface QRCodeDisplayProps {
  shareToken: string
  size?: number
  className?: string
}

export interface ShareCardProps {
  share: Share
  onDelete?: () => void
  className?: string
}
