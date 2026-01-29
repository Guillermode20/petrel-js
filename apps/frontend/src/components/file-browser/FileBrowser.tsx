import { useState, useCallback, useMemo, useEffect } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { toast } from 'sonner'
import type { File, Folder } from '@petrel/shared'
import { useFiles, useDeleteFile, useUpdateFile, useCreateFolder, useUpdateFolder, useUploadFile, isFile, isFolder } from '@/hooks'
import { FolderBreadcrumb, buildBreadcrumbSegments } from '@/components/navigation'
import { FileGrid } from './FileGrid'
import { FileList } from './FileList'
import { ViewToggle } from './ViewToggle'
import { SortDropdown } from './SortDropdown'
import { SearchBar } from './SearchBar'
import { UploadZone, UploadBar, UploadProgressList } from './UploadZone'
import { CreateFolderDialog, RenameDialog, DeleteConfirmDialog } from './FileDialogs'
import { CreateShareModal } from '@/components/sharing'
import type { ViewMode, SortField, UploadProgress } from './types'

interface FileBrowserProps {
    folderId?: number
    folderPath?: string
}

/**
 * Main file browser component with grid/list views, search, sort, and upload
 */
export function FileBrowser({ folderId, folderPath }: FileBrowserProps) {
    const navigate = useNavigate()

    // View state
    const [viewMode, setViewMode] = useState<ViewMode>('grid')
    const [sortBy, setSortBy] = useState<SortField>('name')
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc')
    const [searchQuery, setSearchQuery] = useState('')
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

    // Dialog state
    const [renameItem, setRenameItem] = useState<File | Folder | null>(null)
    const [deleteItem, setDeleteItem] = useState<File | Folder | null>(null)
    const [shareItem, setShareItem] = useState<File | Folder | null>(null)
    const [moveItem, setMoveItem] = useState<File | Folder | null>(null)

    // Upload state
    const [uploads, setUploads] = useState<UploadProgress[]>([])

    // Helper to get selection key
    const getSelectionKey = (item: File | Folder) =>
        `${isFolder(item) ? 'folder' : 'file'}-${item.id}`

    // Queries
    const { data, isLoading } = useFiles({
        folderId,
        sort: sortBy,
        order: sortOrder,
        search: searchQuery || undefined,
    })

    // Clear selection when folder changes
    useEffect(() => {
        setSelectedIds(new Set())
    }, [folderId])
    const deleteMutation = useDeleteFile()
    const updateMutation = useUpdateFile()
    const updateFolderMutation = useUpdateFolder()
    const createFolderMutation = useCreateFolder()
    const uploadMutation = useUploadFile()

    // Sort items - folders first, then files
    const sortedItems = useMemo(() => {
        if (!data?.items) return []
        const folders = data.items.filter(isFolder)
        const files = data.items.filter(isFile)
        return [...folders, ...files]
    }, [data?.items])

    // Breadcrumb segments
    const breadcrumbSegments = useMemo(
        () => buildBreadcrumbSegments(folderPath ?? data?.currentFolder?.path ?? ''),
        [folderPath, data?.currentFolder]
    )

    // Handlers
    const handleSelect = useCallback((item: File | Folder, event: React.MouseEvent) => {
        const key = getSelectionKey(item)
        if (event.shiftKey || event.ctrlKey || event.metaKey) {
            setSelectedIds((prev) => {
                const next = new Set(prev)
                if (next.has(key)) {
                    next.delete(key)
                } else {
                    next.add(key)
                }
                return next
            })
        } else {
            setSelectedIds(new Set([key]))
        }
    }, [])

    const handleOpen = useCallback(
        (item: File | Folder) => {
            if (isFolder(item)) {
                navigate({ to: '/files/$folderId', params: { folderId: String(item.id) } })
            } else {
                navigate({ to: '/files/preview/$fileId', params: { fileId: String(item.id) } })
            }
        },
        [navigate]
    )

    const handleDownload = useCallback((item: File | Folder) => {
        if (isFolder(item)) {
            // Folders cannot be downloaded directly currently
            toast.error('Folder download is not supported yet')
            return
        }
        const url = `/api/files/download/${item.id}?token=${localStorage.getItem('token')}`
        window.open(url, '_blank')
    }, [])

    const handleCopyLink = useCallback((item: File | Folder) => {
        const url = `${window.location.origin}/files/${isFolder(item) ? item.id : `preview/${item.id}`}`
        navigator.clipboard.writeText(url)
        toast.success('Link copied to clipboard')
    }, [])

    const handleContextMenu = useCallback((_item: File | Folder, _event: React.MouseEvent) => {
        // Context menu is handled by the ContextMenu component
    }, [])

    const handleSortChange = useCallback((newSortBy: SortField, newSortOrder: 'asc' | 'desc') => {
        setSortBy(newSortBy)
        setSortOrder(newSortOrder)
    }, [])

    const handleSort = useCallback((field: SortField) => {
        if (sortBy === field) {
            setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'))
        } else {
            setSortBy(field)
            setSortOrder('asc')
        }
    }, [sortBy])

    const handleCreateFolder = useCallback(
        async (name: string) => {
            await createFolderMutation.mutateAsync({ name, parentId: folderId })
            toast.success(`Folder "${name}" created`)
        },
        [createFolderMutation, folderId]
    )

    const handleRename = useCallback(
        async (newName: string) => {
            if (!renameItem) return
            await updateMutation.mutateAsync({ id: renameItem.id, data: { name: newName } })
            toast.success(`Renamed to "${newName}"`)
            setRenameItem(null)
        },
        [updateMutation, renameItem]
    )

    const handleMove = useCallback(
        async (item: { id: number; type: 'file' | 'folder' }, targetFolderId: number | null) => {
            try {
                if (item.type === 'folder') {
                    await updateFolderMutation.mutateAsync({
                        id: item.id,
                        data: { parentId: targetFolderId }
                    })
                } else {
                    await updateMutation.mutateAsync({
                        id: item.id,
                        data: { folderId: targetFolderId }
                    })
                }
                toast.success('Item moved successfully')
            } catch (error) {
                toast.error('Failed to move item')
            }
        },
        [updateMutation, updateFolderMutation]
    )

    const handleDelete = useCallback(async () => {
        if (!deleteItem) return
        await deleteMutation.mutateAsync(deleteItem.id)
        toast.success(`"${deleteItem.name}" deleted`)
        setDeleteItem(null)
        setSelectedIds((prev) => {
            const next = new Set(prev)
            next.delete(getSelectionKey(deleteItem))
            return next
        })
    }, [deleteMutation, deleteItem])

    const handleUpload = useCallback(
        async (files: FileList) => {
            const fileArray = Array.from(files)
            const newUploads: UploadProgress[] = fileArray.map((file) => ({
                file,
                progress: 0,
                status: 'pending' as const,
            }))
            setUploads((prev) => [...prev, ...newUploads])

            for (const file of fileArray) {
                setUploads((prev) =>
                    prev.map((u) =>
                        u.file === file ? { ...u, status: 'uploading' as const } : u
                    )
                )

                try {
                    await uploadMutation.mutateAsync({
                        file,
                        folderId,
                        onProgress: (progress) => {
                            setUploads((prev) =>
                                prev.map((u) => (u.file === file ? { ...u, progress } : u))
                            )
                        },
                    })
                    setUploads((prev) =>
                        prev.map((u) =>
                            u.file === file ? { ...u, status: 'completed' as const, progress: 100 } : u
                        )
                    )
                } catch (error) {
                    setUploads((prev) =>
                        prev.map((u) =>
                            u.file === file
                                ? { ...u, status: 'error' as const, error: (error as Error).message }
                                : u
                        )
                    )
                }
            }
        },
        [uploadMutation, folderId]
    )

    const handleDismissUpload = useCallback((file: globalThis.File) => {
        setUploads((prev) => prev.filter((u) => u.file !== file))
    }, [])

    return (
        <div className="space-y-4">
            {/* Breadcrumb */}
            <FolderBreadcrumb segments={breadcrumbSegments} onMove={handleMove} />

            {/* Toolbar */}
            <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                    <SearchBar
                        value={searchQuery}
                        onChange={setSearchQuery}
                        className="w-48 sm:w-64"
                    />
                </div>
                <div className="flex items-center gap-2">
                    <CreateFolderDialog
                        onCreateFolder={handleCreateFolder}
                        isCreating={createFolderMutation.isPending}
                    />
                    <SortDropdown sortBy={sortBy} sortOrder={sortOrder} onSortChange={handleSortChange} />
                    <ViewToggle viewMode={viewMode} onViewModeChange={setViewMode} />
                </div>
            </div>

            {/* Upload bar (persistent) */}
            <UploadBar onUpload={handleUpload} />

            {/* File list/grid */}
            {viewMode === 'grid' ? (
                <FileGrid
                    items={sortedItems}
                    selectedIds={selectedIds}
                    onSelect={handleSelect}
                    onOpen={handleOpen}
                    onContextMenu={handleContextMenu}
                    onMove={handleMove}
                    onRename={setRenameItem}
                    onDelete={setDeleteItem}
                    onShare={setShareItem}
                    onDownload={handleDownload}
                    onCopyLink={handleCopyLink}
                    isLoading={isLoading}
                />
            ) : (
                <FileList
                    items={sortedItems}
                    selectedIds={selectedIds}
                    onSelect={handleSelect}
                    onOpen={handleOpen}
                    onContextMenu={handleContextMenu}
                    onMove={handleMove}
                    onRename={setRenameItem}
                    onDelete={setDeleteItem}
                    onShare={setShareItem}
                    onDownload={handleDownload}
                    onCopyLink={handleCopyLink}
                    sortBy={sortBy}
                    sortOrder={sortOrder}
                    onSort={handleSort}
                    isLoading={isLoading}
                />
            )}

            {/* Upload progress */}
            <UploadProgressList uploads={uploads} onDismiss={handleDismissUpload} />

            {/* Dialogs */}
            <RenameDialog
                open={!!renameItem}
                onOpenChange={(open) => !open && setRenameItem(null)}
                currentName={renameItem?.name ?? ''}
                onRename={handleRename}
                isRenaming={updateMutation.isPending}
            />

            <DeleteConfirmDialog
                open={!!deleteItem}
                onOpenChange={(open) => !open && setDeleteItem(null)}
                itemName={deleteItem?.name ?? ''}
                itemType={deleteItem && isFile(deleteItem) ? 'file' : 'folder'}
                onConfirm={handleDelete}
                isDeleting={deleteMutation.isPending}
            />

            {shareItem && (
                <CreateShareModal
                    type={isFolder(shareItem) ? 'folder' : 'file'}
                    targetId={shareItem.id}
                    targetName={shareItem.name}
                    isOpen={!!shareItem}
                    onClose={() => setShareItem(null)}
                />
            )}
        </div>
    )
}
