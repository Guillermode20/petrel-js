import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { AlbumDetail } from '@/components/albums'
import { useAlbum, useRemoveFileFromAlbum } from '@/hooks'
import type { File } from '@petrel/shared'

export const Route = createFileRoute('/albums/$albumId')({
    component: AlbumDetailPage,
})

function AlbumDetailPage() {
    const { albumId } = Route.useParams()
    const navigate = useNavigate()
    const numericAlbumId = parseInt(albumId, 10)

    const { data: album, isLoading } = useAlbum(numericAlbumId)
    const removeFileMutation = useRemoveFileFromAlbum()

    async function handleRemoveFile(fileId: number): Promise<void> {
        try {
            await removeFileMutation.mutateAsync({
                albumId: numericAlbumId,
                fileId,
            })
            toast.success('File removed from album')
        } catch (err) {
            toast.error('Failed to remove file')
        }
    }

    function handleFileClick(file: File): void {
        navigate({
            to: '/files/preview/$fileId',
            params: { fileId: String(file.id) },
        })
    }

    function handleBack(): void {
        navigate({ to: '/albums' })
    }

    if (isLoading) {
        return (
            <div className="flex h-full items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        )
    }

    if (!album) {
        return (
            <div className="flex h-full flex-col items-center justify-center gap-4">
                <p className="text-lg font-medium">Album not found</p>
                <p className="text-sm text-muted-foreground">
                    The album you're looking for doesn't exist or has been deleted.
                </p>
            </div>
        )
    }

    // Extract files from album
    const files = album.files ?? []

    return (
        <div className="p-6">
            <AlbumDetail
                album={album}
                files={files}
                onBack={handleBack}
                onFileClick={handleFileClick}
                onRemoveFile={handleRemoveFile}
            />
        </div>
    )
}
