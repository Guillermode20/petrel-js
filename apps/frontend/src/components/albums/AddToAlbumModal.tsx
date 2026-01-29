import { useState } from 'react'
import { Loader2, Image, Check } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Skeleton } from '@/components/ui/skeleton'
import { useAlbums, useAddFilesToAlbum } from '@/hooks'
import { AlbumCover } from './AlbumCover'
import type { AddToAlbumModalProps } from './types'

/**
 * Modal for adding files to an existing album
 */
export function AddToAlbumModal({
    fileIds,
    isOpen,
    onClose,
    onSuccess,
}: AddToAlbumModalProps) {
    const [selectedAlbumId, setSelectedAlbumId] = useState<number | null>(null)

    const { data: albums, isLoading: albumsLoading } = useAlbums()
    const addFilesToAlbumMutation = useAddFilesToAlbum()

    async function handleAdd(): Promise<void> {
        if (selectedAlbumId === null) {
            toast.error('Please select an album')
            return
        }

        try {
            await addFilesToAlbumMutation.mutateAsync({
                albumId: selectedAlbumId,
                fileIds,
            })

            toast.success(
                `Added ${fileIds.length} ${fileIds.length === 1 ? 'file' : 'files'} to album`
            )
            onSuccess?.()
            handleClose()
        } catch (err) {
            toast.error('Failed to add files to album')
        }
    }

    function handleClose(): void {
        setSelectedAlbumId(null)
        onClose()
    }

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Image className="h-5 w-5" />
                        Add to Album
                    </DialogTitle>
                    <DialogDescription>
                        Add {fileIds.length} {fileIds.length === 1 ? 'file' : 'files'} to an album.
                    </DialogDescription>
                </DialogHeader>

                <ScrollArea className="max-h-[300px]">
                    {albumsLoading ? (
                        <div className="space-y-2 p-2">
                            {Array.from({ length: 4 }).map((_, i) => (
                                <Skeleton key={i} className="h-16 w-full" />
                            ))}
                        </div>
                    ) : albums?.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-8">
                            <Image className="h-10 w-10 text-muted-foreground" />
                            <p className="mt-2 text-sm text-muted-foreground">
                                No albums yet. Create one first.
                            </p>
                        </div>
                    ) : (
                        <div className="space-y-1 p-2">
                            {albums?.map((album) => {
                                const isSelected = selectedAlbumId === album.id

                                return (
                                    <button
                                        key={album.id}
                                        onClick={() => setSelectedAlbumId(album.id)}
                                        className={cn(
                                            'flex w-full items-center gap-3 rounded-lg p-3 text-left transition-colors hover:bg-secondary',
                                            isSelected && 'bg-secondary ring-1 ring-primary'
                                        )}
                                    >
                                        <AlbumCover album={album} size="sm" />
                                        <div className="flex-1 min-w-0">
                                            <p className="font-medium truncate">{album.name}</p>
                                            <p className="text-xs text-muted-foreground">
                                                {album.fileCount ?? 0} items
                                            </p>
                                        </div>
                                        {isSelected && (
                                            <Check className="h-5 w-5 text-primary shrink-0" />
                                        )}
                                    </button>
                                )
                            })}
                        </div>
                    )}
                </ScrollArea>

                <DialogFooter>
                    <Button variant="outline" onClick={handleClose}>
                        Cancel
                    </Button>
                    <Button
                        onClick={handleAdd}
                        disabled={addFilesToAlbumMutation.isPending || !selectedAlbumId}
                    >
                        {addFilesToAlbumMutation.isPending && (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        )}
                        Add to Album
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
