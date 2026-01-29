import { useEffect, useCallback } from 'react'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { Loader2 } from 'lucide-react'
import { FilePreview } from '@/components/viewers/file-preview'
import { useFile, useFiles, isFile } from '@/hooks'
import type { File } from '@petrel/shared'

export const Route = createFileRoute('/files/preview/$fileId')({
    component: FilePreviewPage,
})

function FilePreviewPage() {
    const { fileId } = Route.useParams()
    const navigate = useNavigate()
    const numericFileId = parseInt(fileId, 10)

    const { data: file, isLoading: fileLoading, error: fileError } = useFile(numericFileId)

    // Get sibling files for navigation
    const parentId = file?.parentId ?? null
    const { data: filesResponse } = useFiles(parentId ? { folderId: parentId } : undefined)

    // Filter to only include files (not folders) and sort for consistent navigation
    const siblingFiles = filesResponse?.items
        .filter(isFile)
        .sort((a: File, b: File) => a.name.localeCompare(b.name)) ?? []

    const handleNavigate = useCallback((direction: 'prev' | 'next') => {
        const currentIndex = siblingFiles.findIndex((f: File) => f.id === numericFileId)
        if (currentIndex === -1) return

        const newIndex = direction === 'prev' ? currentIndex - 1 : currentIndex + 1
        const newFile = siblingFiles[newIndex]

        if (newFile) {
            navigate({
                to: '/files/preview/$fileId',
                params: { fileId: String(newFile.id) },
            })
        }
    }, [siblingFiles, numericFileId, navigate])

    const handleClose = useCallback(() => {
        if (file?.parentId) {
            navigate({
                to: '/files/$folderId',
                params: { folderId: String(file.parentId) },
            })
        } else {
            navigate({ to: '/files' })
        }
    }, [file?.parentId, navigate])

    // Keyboard shortcuts
    useEffect(() => {
        function handleKeyDown(e: KeyboardEvent): void {
            if (e.key === 'Escape') {
                handleClose()
            }
        }

        window.addEventListener('keydown', handleKeyDown)
        return () => window.removeEventListener('keydown', handleKeyDown)
    }, [handleClose])

    if (fileLoading) {
        return (
            <div className="flex h-full items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        )
    }

    if (fileError || !file) {
        return (
            <div className="flex h-full flex-col items-center justify-center gap-4">
                <p className="text-lg font-medium">File not found</p>
                <p className="text-sm text-muted-foreground">
                    The file you're looking for doesn't exist or has been deleted.
                </p>
            </div>
        )
    }

    return (
        <FilePreview
            file={file}
            files={siblingFiles}
            onNavigate={handleNavigate}
            onClose={handleClose}
            className="h-full"
        />
    )
}
