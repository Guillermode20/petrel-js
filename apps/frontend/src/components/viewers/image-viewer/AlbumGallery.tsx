import { useState, useCallback } from 'react'
import type { File } from '@petrel/shared'
import { cn } from '@/lib/utils'
import { api } from '@/lib/api'
import { Skeleton } from '@/components/ui/skeleton'
import { Lightbox } from './Lightbox'
import type { AlbumGalleryProps } from './types'

/**
 * Masonry-style gallery grid for displaying album images
 */
export function AlbumGallery({
    files,
    onImageClick,
    className,
    isLoading,
}: AlbumGalleryProps) {
    const [lightboxOpen, setLightboxOpen] = useState(false)
    const [lightboxIndex, setLightboxIndex] = useState(0)

    const handleImageClick = useCallback(
        (file: File, index: number) => {
            if (onImageClick) {
                onImageClick(file, index)
            } else {
                setLightboxIndex(index)
                setLightboxOpen(true)
            }
        },
        [onImageClick]
    )

    const handleDownload = useCallback((file: File) => {
        window.open(api.getDownloadUrl(file.id), '_blank')
    }, [])

    if (isLoading) {
        return (
            <div className={cn('grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4', className)}>
                {Array.from({ length: 12 }).map((_, i) => (
                    <Skeleton
                        key={i}
                        className="aspect-square rounded-lg"
                        style={{ animationDelay: `${i * 50}ms` }}
                    />
                ))}
            </div>
        )
    }

    if (files.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-16 text-center">
                <p className="text-lg font-medium text-muted-foreground">No images</p>
                <p className="text-sm text-muted-foreground">Add images to this album</p>
            </div>
        )
    }

    return (
        <>
            <div
                className={cn(
                    'grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5',
                    className
                )}
            >
                {files.map((file, index) => (
                    <button
                        key={file.id}
                        type="button"
                        className="group relative aspect-square overflow-hidden rounded-lg bg-secondary focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
                        onClick={() => handleImageClick(file, index)}
                    >
                        <img
                            src={api.getThumbnailUrl(file.id, 'medium')}
                            alt={file.name}
                            className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-105"
                            loading="lazy"
                        />
                        <div className="absolute inset-0 bg-black/0 transition-colors group-hover:bg-black/20" />
                    </button>
                ))}
            </div>

            <Lightbox
                images={files}
                initialIndex={lightboxIndex}
                open={lightboxOpen}
                onOpenChange={setLightboxOpen}
                onDownload={handleDownload}
            />
        </>
    )
}
