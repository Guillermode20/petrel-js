import { FileCard } from './FileCard'
import { Skeleton } from '@/components/ui/skeleton'
import type { FileGridProps } from './types'

/**
 * Grid view for files and folders
 */
export function FileGrid({
    items,
    selectedIds,
    onSelect,
    onOpen,
    onContextMenu,
    isLoading,
}: FileGridProps) {
    if (isLoading) {
        return (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
                {Array.from({ length: 12 }).map((_, i) => (
                    <div key={i} className="flex flex-col items-center gap-2 p-3">
                        <Skeleton className="h-20 w-20 rounded-md" />
                        <Skeleton className="h-4 w-16" />
                        <Skeleton className="h-3 w-12" />
                    </div>
                ))}
            </div>
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
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
            {items.map((item) => (
                <FileCard
                    key={`${'mimeType' in item ? 'file' : 'folder'}-${item.id}`}
                    item={item}
                    isSelected={selectedIds.has(item.id)}
                    onSelect={onSelect}
                    onDoubleClick={onOpen}
                    onContextMenu={onContextMenu}
                />
            ))}
        </div>
    )
}
