import { Image } from 'lucide-react'
import { cn } from '@/lib/utils'
import { api } from '@/lib/api'
import type { AlbumCoverProps } from './types'

const SIZES = {
    sm: 'h-12 w-12',
    md: 'h-24 w-24',
    lg: 'h-32 w-32',
}

const ICON_SIZES = {
    sm: 'h-4 w-4',
    md: 'h-8 w-8',
    lg: 'h-12 w-12',
}

/**
 * Album cover component with thumbnail grid fallback
 */
export function AlbumCover({ album, size = 'md', className }: AlbumCoverProps) {
    const sizeClass = SIZES[size]
    const iconSize = ICON_SIZES[size]

    // If album has a cover image, use it
    if (album.coverFileId) {
        return (
            <div className={cn('overflow-hidden rounded-lg bg-secondary', sizeClass, className)}>
                <img
                    src={api.getThumbnailUrl(album.coverFileId, size === 'sm' ? 'small' : 'medium')}
                    alt={album.name}
                    className="h-full w-full object-cover"
                />
            </div>
        )
    }

    // Fallback to placeholder
    return (
        <div
            className={cn(
                'flex items-center justify-center rounded-lg bg-secondary',
                sizeClass,
                className
            )}
        >
            <Image className={cn('text-muted-foreground', iconSize)} />
        </div>
    )
}
