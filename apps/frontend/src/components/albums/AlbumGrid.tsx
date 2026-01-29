import { Plus, Image } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Skeleton } from '@/components/ui/skeleton'
import { AlbumCard } from './AlbumCard'
import type { AlbumGridProps } from './types'

/**
 * Grid of album cards with create button
 */
export function AlbumGrid({
    albums,
    isLoading,
    onAlbumClick,
    onCreateClick,
    className,
}: AlbumGridProps) {
    if (isLoading) {
        return (
            <div className={cn('grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5', className)}>
                {Array.from({ length: 8 }).map((_, i) => (
                    <div key={i} className="flex flex-col gap-3 rounded-lg border border-border p-4">
                        <Skeleton className="aspect-square w-full rounded-lg" />
                        <Skeleton className="h-4 w-3/4" />
                        <Skeleton className="h-3 w-1/2" />
                    </div>
                ))}
            </div>
        )
    }

    if (albums.length === 0 && !onCreateClick) {
        return (
            <div className={cn('flex flex-col items-center justify-center py-12', className)}>
                <Image className="h-12 w-12 text-muted-foreground" />
                <p className="mt-4 text-lg font-medium">No albums yet</p>
                <p className="text-sm text-muted-foreground">
                    Create an album to organize your files
                </p>
            </div>
        )
    }

    return (
        <div className={cn('grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5', className)}>
            {/* Create album button */}
            {onCreateClick && (
                <button
                    onClick={onCreateClick}
                    className="flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-border bg-card p-4 text-muted-foreground transition-colors hover:border-primary hover:text-primary"
                >
                    <div className="flex h-32 w-full items-center justify-center rounded-lg bg-secondary">
                        <Plus className="h-8 w-8" />
                    </div>
                    <span className="text-sm font-medium">Create Album</span>
                </button>
            )}

            {/* Album cards */}
            {albums.map((album) => (
                <AlbumCard
                    key={album.id}
                    album={album}
                    onClick={() => onAlbumClick?.(album)}
                />
            ))}
        </div>
    )
}
