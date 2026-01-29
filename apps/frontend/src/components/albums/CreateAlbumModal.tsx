import { useState } from 'react'
import { Loader2, Image } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { useCreateAlbum } from '@/hooks'
import type { CreateAlbumModalProps } from './types'

/**
 * Modal for creating a new album
 */
export function CreateAlbumModal({ isOpen, onClose, onSuccess }: CreateAlbumModalProps) {
    const [name, setName] = useState('')
    const [description, setDescription] = useState('')

    const createAlbumMutation = useCreateAlbum()

    async function handleCreate(): Promise<void> {
        if (!name.trim()) {
            toast.error('Please enter an album name')
            return
        }

        try {
            const album = await createAlbumMutation.mutateAsync({
                name: name.trim(),
                description: description.trim() || undefined,
            })

            toast.success('Album created')
            onSuccess?.(album)
            handleClose()
        } catch (err) {
            toast.error('Failed to create album')
        }
    }

    function handleClose(): void {
        setName('')
        setDescription('')
        onClose()
    }

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Image className="h-5 w-5" />
                        Create Album
                    </DialogTitle>
                    <DialogDescription>
                        Create a new album to organize your files.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-4">
                    <div className="space-y-2">
                        <label htmlFor="album-name" className="text-sm font-medium">
                            Name
                        </label>
                        <Input
                            id="album-name"
                            placeholder="My Album"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            autoFocus
                        />
                    </div>

                    <div className="space-y-2">
                        <label htmlFor="album-description" className="text-sm font-medium">
                            Description (optional)
                        </label>
                        <Input
                            id="album-description"
                            placeholder="A collection of..."
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                        />
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={handleClose}>
                        Cancel
                    </Button>
                    <Button
                        onClick={handleCreate}
                        disabled={createAlbumMutation.isPending || !name.trim()}
                    >
                        {createAlbumMutation.isPending && (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        )}
                        Create Album
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
