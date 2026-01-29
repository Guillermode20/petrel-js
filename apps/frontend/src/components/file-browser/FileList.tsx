import { format } from 'date-fns'
import { ArrowDown, ArrowUp } from 'lucide-react'
import { cn } from '@/lib/utils'
import { isFile } from '@/hooks'
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table'
import { Skeleton } from '@/components/ui/skeleton'
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
    onContextMenu,
    sortBy,
    sortOrder,
    onSort,
    isLoading,
}: FileListProps) {
    const SortIcon = sortOrder === 'asc' ? ArrowUp : ArrowDown

    const renderSortableHeader = (field: SortField, label: string) => (
        <button
            className="flex items-center gap-1 hover:text-foreground"
            onClick={() => onSort(field)}
        >
            {label}
            {sortBy === field && <SortIcon className="h-3 w-3" />}
        </button>
    )

    if (isLoading) {
        return (
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead className="w-[50%]">Name</TableHead>
                        <TableHead className="hidden md:table-cell">Type</TableHead>
                        <TableHead className="hidden sm:table-cell">Size</TableHead>
                        <TableHead className="hidden lg:table-cell">Modified</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {Array.from({ length: 10 }).map((_, i) => (
                        <TableRow key={i}>
                            <TableCell>
                                <div className="flex items-center gap-3">
                                    <Skeleton className="h-8 w-8 rounded" />
                                    <Skeleton className="h-4 w-48" />
                                </div>
                            </TableCell>
                            <TableCell className="hidden md:table-cell">
                                <Skeleton className="h-4 w-16" />
                            </TableCell>
                            <TableCell className="hidden sm:table-cell">
                                <Skeleton className="h-4 w-12" />
                            </TableCell>
                            <TableCell className="hidden lg:table-cell">
                                <Skeleton className="h-4 w-24" />
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        )
    }

    if (items.length === 0) {
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
                    const isSelected = selectedIds.has(item.id)

                    return (
                        <TableRow
                            key={`${'mimeType' in item ? 'file' : 'folder'}-${item.id}`}
                            className={cn(
                                'cursor-pointer',
                                isSelected && 'bg-primary/10'
                            )}
                            onClick={(e) => onSelect(item, e)}
                            onDoubleClick={() => onOpen(item)}
                            onContextMenu={(e) => {
                                e.preventDefault()
                                onContextMenu(item, e)
                            }}
                        >
                            <TableCell>
                                <div className="flex items-center gap-3">
                                    <div className="flex h-8 w-8 items-center justify-center rounded bg-secondary/50">
                                        <Icon className="h-4 w-4 text-muted-foreground" />
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
                    )
                })}
            </TableBody>
        </Table>
    )
}
