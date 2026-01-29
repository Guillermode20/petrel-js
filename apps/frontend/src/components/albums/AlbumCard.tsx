import { format } from 'date-fns'
import { cn } from '@/lib/utils'
import { AlbumCover } from './AlbumCover'
import type { AlbumCardProps } from './types'

/**
 * Album card for grid display
 */
export function AlbumCard({ album, onClick, className }: AlbumCardProps) {
    const fileCount = album.fileCount ?? 0

    return (
        <button
            onClick={onClick}
            className={cn(
                'flex flex-col items-start gap-3 rounded-lg border border-border bg-card p-4 text-left transition-colors hover:border-primary/50 hover:bg-secondary/50',
                className
            )}
        >
            {/* Cover */}
            <AlbumCover album={album} size="lg" className="w-full aspect-square" />

            {/* Info */}
            <div className="w-full space-y-1">
                <h3 className="font-medium truncate">{album.name}</h3>
                {album.description && (
                    <p className="text-sm text-muted-foreground truncate">
                        {album.description}
                    </p>
                )}
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span>{fileCount} {fileCount === 1 ? 'item' : 'items'}</span>
                    <span>•</span>
                    <span>{format(new Date(album.createdAt), 'MMM d, yyyy')}</span>
                </div>
            </div>
        </button>
    )
}
