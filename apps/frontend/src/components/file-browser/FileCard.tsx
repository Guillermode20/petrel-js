import { cn } from '@/lib/utils'
import { isFile } from '@/hooks'
import { api } from '@/lib/api'
import { getFileIcon, getFolderIcon, formatFileSize } from './utils'
import type { FileItemProps } from './types'

/**
 * File card component for grid view
 */
export function FileCard({
    item,
    isSelected,
    onSelect,
    onDoubleClick,
    onContextMenu,
}: FileItemProps) {
    const isFileItem = isFile(item)
    const Icon = isFileItem ? getFileIcon(item.mimeType) : getFolderIcon()
    const showThumbnail = isFileItem && item.mimeType.startsWith('image/')

    return (
        <div
            className={cn(
                'group relative flex cursor-pointer flex-col items-center gap-2 rounded-lg border border-transparent p-3 transition-colors',
                'hover:bg-secondary/50',
                isSelected && 'border-primary bg-primary/10'
            )}
            onClick={(e) => onSelect?.(item, e)}
            onDoubleClick={() => onDoubleClick?.(item)}
            onContextMenu={(e) => {
                e.preventDefault()
                onContextMenu?.(item, e)
            }}
        >
            {/* Thumbnail or icon */}
            <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-md bg-secondary/30">
                {showThumbnail ? (
                    <img
                        src={api.getThumbnailUrl(item.id, 'small')}
                        alt={item.name}
                        className="h-full w-full object-cover"
                        loading="lazy"
                    />
                ) : (
                    <Icon className="h-10 w-10 text-muted-foreground" />
                )}
            </div>

            {/* File name */}
            <div className="w-full text-center">
                <p className="truncate text-sm font-medium" title={item.name}>
                    {item.name}
                </p>
                {isFileItem && (
                    <p className="text-xs text-muted-foreground">{formatFileSize(item.size)}</p>
                )}
            </div>

            {/* Selection indicator */}
            {isSelected && (
                <div className="absolute right-2 top-2 h-3 w-3 rounded-full bg-primary" />
            )}
        </div>
    )
}
