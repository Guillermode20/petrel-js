import { useState } from 'react'
import { ArrowLeft, Trash2, Image, Music, Film } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { api } from '@/lib/api'
import { AlbumCover } from './AlbumCover'
import type { AlbumDetailProps } from './types'
import type { File } from '@petrel/shared'

function getFileTypeIcon(file: File): React.ReactNode {
    const mimeType = file.mimeType?.toLowerCase() ?? ''
    if (mimeType.startsWith('video/')) return <Film className="h-4 w-4" />
    if (mimeType.startsWith('audio/')) return <Music className="h-4 w-4" />
    return <Image className="h-4 w-4" />
}

/**
 * Album detail view with file grid
 */
export function AlbumDetail({
    album,
    files,
    isLoading,
    onBack,
    onFileClick,
    onRemoveFile,
    className,
}: AlbumDetailProps) {
    const [selectedFiles, setSelectedFiles] = useState<Set<number>>(new Set())

    function toggleSelect(fileId: number): void {
        setSelectedFiles((prev) => {
            const next = new Set(prev)
            if (next.has(fileId)) {
                next.delete(fileId)
            } else {
                next.add(fileId)
            }
            return next
        })
    }

    return (
        <div className={cn('flex flex-col gap-6', className)}>
            {/* Header */}
            <div className="flex items-start gap-6">
                {onBack && (
                    <Button variant="ghost" size="icon" onClick={onBack}>
                        <ArrowLeft className="h-5 w-5" />
                    </Button>
                )}

                <AlbumCover album={album} size="lg" />

                <div className="flex-1 space-y-2">
                    <h1 className="text-2xl font-semibold">{album.name}</h1>
                    {album.description && (
                        <p className="text-muted-foreground">{album.description}</p>
                    )}
                    <p className="text-sm text-muted-foreground">
                        {files.length} {files.length === 1 ? 'item' : 'items'}
                    </p>
                </div>

                {selectedFiles.size > 0 && onRemoveFile && (
                    <Button
                        variant="destructive"
                        onClick={() => {
                            selectedFiles.forEach((id) => onRemoveFile(id))
                            setSelectedFiles(new Set())
                        }}
                    >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Remove ({selectedFiles.size})
                    </Button>
                )}
            </div>

            {/* File grid */}
            {isLoading ? (
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
                    {Array.from({ length: 12 }).map((_, i) => (
                        <Skeleton key={i} className="aspect-square w-full rounded-lg" />
                    ))}
                </div>
            ) : files.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12">
                    <Image className="h-12 w-12 text-muted-foreground" />
                    <p className="mt-4 text-lg font-medium">Album is empty</p>
                    <p className="text-sm text-muted-foreground">
                        Add files from the file browser
                    </p>
                </div>
            ) : (
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
                    {files.map((file) => {
                        const isSelected = selectedFiles.has(file.id)
                        const hasThumbnail = file.thumbnailPath

                        return (
                            <div
                                key={file.id}
                                className={cn(
                                    'group relative aspect-square cursor-pointer overflow-hidden rounded-lg border bg-secondary transition-all',
                                    isSelected
                                        ? 'border-primary ring-2 ring-primary'
                                        : 'border-border hover:border-primary/50'
                                )}
                                onClick={() => onFileClick?.(file)}
                            >
                                {/* Thumbnail */}
                                {hasThumbnail ? (
                                    <img
                                        src={api.getThumbnailUrl(file.id, 'medium')}
                                        alt={file.name}
                                        className="h-full w-full object-cover"
                                    />
                                ) : (
                                    <div className="flex h-full w-full items-center justify-center">
                                        {getFileTypeIcon(file)}
                                    </div>
                                )}

                                {/* Selection overlay */}
                                <div
                                    className={cn(
                                        'absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 transition-opacity',
                                        isSelected && 'opacity-100'
                                    )}
                                    onClick={(e) => {
                                        e.stopPropagation()
                                        toggleSelect(file.id)
                                    }}
                                >
                                    <div
                                        className={cn(
                                            'h-6 w-6 rounded-full border-2 border-white',
                                            isSelected && 'bg-primary'
                                        )}
                                    />
                                </div>

                                {/* File type indicator */}
                                <div className="absolute bottom-2 left-2 flex items-center gap-1 rounded bg-black/60 px-1.5 py-0.5 text-xs text-white">
                                    {getFileTypeIcon(file)}
                                </div>

                                {/* File name on hover */}
                                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-2 opacity-0 transition-opacity group-hover:opacity-100">
                                    <p className="truncate text-xs text-white">{file.name}</p>
                                </div>
                            </div>
                        )
                    })}
                </div>
            )}
        </div>
    )
}
