import { useState } from 'react'
import { format } from 'date-fns'
import { ArrowDown, ArrowUp } from 'lucide-react'
import { cn } from '@/lib/utils'
import { isFile, isFolder } from '@/hooks'
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table'
import { FileContextMenu } from './FileContextMenu'
import { getFileIcon, getFolderIcon, formatFileSize, getFileCategory } from './utils'
import type { FileListProps, SortField } from './types'

/**
 * List view for files and folders
 */
export function FileList({
    items,
    selectedIds,
    onSelect,
    onOpen,
    onMove,
    onRename,
    onDelete,
    onShare,
    onDownload,
    onCopyLink,
    sortBy,
    sortOrder,
    onSort,
    isLoading,
}: FileListProps) {
    const [dragOverId, setDragOverId] = useState<number | null>(null)
    const SortIcon = sortOrder === 'asc' ? ArrowUp : ArrowDown

    const handleDragStart = (item: any, e: React.DragEvent) => {
        e.dataTransfer.setData('text/plain', JSON.stringify({ id: item.id, type: isFile(item) ? 'file' : 'folder' }))
        e.dataTransfer.effectAllowed = 'move'
    }

    const handleDragOver = (item: any, e: React.DragEvent) => {
        if (!isFolder(item)) return
        e.preventDefault()
        setDragOverId(item.id)
    }

    const handleDrop = (target: any, e: React.DragEvent) => {
        if (!isFolder(target)) return
        e.preventDefault()
        setDragOverId(null)
        try {
            const data = JSON.parse(e.dataTransfer.getData('text/plain'))
            if (data.id === target.id && data.type === 'folder') return
            onMove(data, target.id)
        } catch (err) {
            console.error('Failed to parse drag data', err)
        }
    }

    const renderSortableHeader = (field: SortField, label: string) => (
        <button
            className="flex items-center gap-1 hover:text-foreground"
            onClick={() => onSort(field)}
        >
            {label}
            {sortBy === field && <SortIcon className="h-3 w-3" />}
        </button>
    )

    if (!isLoading && items.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-16 text-center">
                <p className="text-lg font-medium text-muted-foreground">No files yet</p>
                <p className="text-sm text-muted-foreground">
                    Upload files or create a folder to get started
                </p>
            </div>
        )
    }

    return (
        <Table>
            <TableHeader>
                <TableRow>
                    <TableHead className="w-[50%]">
                        {renderSortableHeader('name', 'Name')}
                    </TableHead>
                    <TableHead className="hidden md:table-cell">
                        {renderSortableHeader('type', 'Type')}
                    </TableHead>
                    <TableHead className="hidden sm:table-cell">
                        {renderSortableHeader('size', 'Size')}
                    </TableHead>
                    <TableHead className="hidden lg:table-cell">
                        {renderSortableHeader('date', 'Modified')}
                    </TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {items.map((item) => {
                    const isFileItem = isFile(item)
                    const Icon = isFileItem ? getFileIcon(item.mimeType) : getFolderIcon()
                    const selectionKey = `${isFileItem ? 'file' : 'folder'}-${item.id}`
                    const isSelected = selectedIds.has(selectionKey)

                    return (
                        <FileContextMenu
                            key={selectionKey}
                            item={item}
                            onOpen={() => onOpen(item)}
                            onRename={() => onRename?.(item)}
                            onDelete={() => onDelete?.(item)}
                            onShare={() => onShare?.(item)}
                            onDownload={() => onDownload?.(item)}
                            onMove={() => { }}
                            onCopyLink={() => onCopyLink?.(item)}
                        >
                            <TableRow
                                className={cn(
                                    'cursor-pointer group',
                                    isSelected && 'bg-primary/10',
                                    dragOverId === item.id && 'bg-primary/20 ring-2 ring-primary ring-inset'
                                )}
                                onClick={(e) => onSelect(item, e)}
                                onDoubleClick={() => onOpen(item)}
                                draggable
                                onDragStart={(e) => handleDragStart(item, e)}
                                onDragOver={(e) => handleDragOver(item, e)}
                                onDragLeave={() => setDragOverId(null)}
                                onDrop={(e) => handleDrop(item, e)}
                            >
                                <TableCell>
                                    <div className="flex items-center gap-3">
                                        <div className="flex h-8 w-8 items-center justify-center rounded bg-secondary/50 group-hover:bg-primary/20 transition-colors">
                                            <Icon className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                                        </div>
                                        <span className="font-medium">{item.name}</span>
                                    </div>
                                </TableCell>
                                <TableCell className="hidden text-muted-foreground md:table-cell">
                                    {isFileItem ? getFileCategory(item.mimeType) : 'Folder'}
                                </TableCell>
                                <TableCell className="hidden text-muted-foreground sm:table-cell">
                                    {isFileItem ? formatFileSize(item.size) : '—'}
                                </TableCell>
                                <TableCell className="hidden text-muted-foreground lg:table-cell">
                                    {isFileItem ? format(new Date(item.createdAt), 'MMM d, yyyy') : '—'}
                                </TableCell>
                            </TableRow>
                        </FileContextMenu>
                    )
                })}
            </TableBody>
        </Table>
    )
}
