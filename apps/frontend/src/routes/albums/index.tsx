import { useState } from 'react'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { Image } from 'lucide-react'
import { AlbumGrid, CreateAlbumModal } from '@/components/albums'
import { useAlbums } from '@/hooks'
import type { Album } from '@petrel/shared'

export const Route = createFileRoute('/albums/')({
    component: AlbumsPage,
})

function AlbumsPage() {
    const navigate = useNavigate()
    const { data: albums, isLoading } = useAlbums()
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)

    function handleAlbumClick(album: Album): void {
        navigate({
            to: '/albums/$albumId',
            params: { albumId: String(album.id) },
        })
    }

    return (
        <div className="flex flex-col gap-6 p-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-semibold flex items-center gap-2">
                        <Image className="h-6 w-6" />
                        Albums
                    </h1>
                    <p className="text-muted-foreground mt-1">
                        Organize your files into albums
                    </p>
                </div>
            </div>

            <AlbumGrid
                albums={albums ?? []}
                isLoading={isLoading}
                onAlbumClick={handleAlbumClick}
                onCreateClick={() => setIsCreateModalOpen(true)}
            />

            <CreateAlbumModal
                isOpen={isCreateModalOpen}
                onClose={() => setIsCreateModalOpen(false)}
                onSuccess={(album) => handleAlbumClick(album)}
            />
        </div>
    )
}
