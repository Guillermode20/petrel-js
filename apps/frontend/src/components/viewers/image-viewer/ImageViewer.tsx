import type { ImageMetadata } from '@petrel/shared'
import { cn } from '@/lib/utils'
import { api } from '@/lib/api'
import type { ImageViewerProps } from './types'

/**
 * Single image viewer component with metadata display
 */
export function ImageViewer({ file, className }: ImageViewerProps) {
    const metadata = file.metadata as ImageMetadata | undefined

    return (
        <div className={cn('flex flex-col items-center', className)}>
            <div className="relative max-h-[80vh] overflow-hidden rounded-lg">
                <img
                    src={api.getThumbnailUrl(file.id, 'large')}
                    alt={file.name}
                    className="max-h-[80vh] w-auto object-contain"
                />
            </div>

            {metadata && (
                <div className="mt-4 text-sm text-muted-foreground">
                    <span>
                        {metadata.width} × {metadata.height}
                    </span>
                    {metadata.exif?.make && (
                        <span className="ml-4">
                            {metadata.exif.make} {metadata.exif.model}
                        </span>
                    )}
                </div>
            )}
        </div>
    )
}
