import { useState } from 'react'
import { Link } from '@tanstack/react-router'
import { ChevronRight, Home } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
    Breadcrumb,
    BreadcrumbItem,
    BreadcrumbLink,
    BreadcrumbList,
    BreadcrumbPage,
    BreadcrumbSeparator,
} from '@/components/ui/breadcrumb'
import { Fragment } from 'react'

interface BreadcrumbSegment {
    label: string
    href?: string
    id?: number
}

interface FolderBreadcrumbProps {
    segments: BreadcrumbSegment[]
    className?: string
    onMove?: (item: { id: number; type: 'file' | 'folder' }, targetFolderId: number | null) => void
}

/**
 * Breadcrumb navigation for folder hierarchy
 */
export function FolderBreadcrumb({ segments, className, onMove }: FolderBreadcrumbProps) {
    const [dragOverId, setDragOverId] = useState<number | 'root' | null>(null)

    const handleDragOver = (e: React.DragEvent, id: number | 'root') => {
        e.preventDefault()
        setDragOverId(id)
    }

    const handleDrop = (e: React.DragEvent, id: number | 'root') => {
        e.preventDefault()
        setDragOverId(null)
        try {
            const data = JSON.parse(e.dataTransfer.getData('text/plain'))
            const targetId = id === 'root' ? null : id
            if (data.id === targetId && data.type === 'folder') return
            onMove?.(data, targetId)
        } catch (err) {
            console.error('Failed to parse drag data', err)
        }
    }

    return (
        <Breadcrumb className={className}>
            <BreadcrumbList>
                <BreadcrumbItem
                    onDragOver={(e) => handleDragOver(e, 'root')}
                    onDragLeave={() => setDragOverId(null)}
                    onDrop={(e) => handleDrop(e, 'root')}
                    className={cn(
                        'rounded px-1 transition-colors',
                        dragOverId === 'root' && 'bg-primary/20 ring-2 ring-primary ring-inset'
                    )}
                >
                    <BreadcrumbLink asChild>
                        <Link to="/files" className="flex items-center gap-1">
                            <Home className="h-4 w-4" />
                            <span>Files</span>
                        </Link>
                    </BreadcrumbLink>
                </BreadcrumbItem>
                {segments.map((segment, index) => {
                    const isLast = index === segments.length - 1
                    const segmentId = segment.id ?? (segment.href?.split('/').pop() ? Number(segment.href.split('/').pop()) : undefined)

                    return (
                        <Fragment key={segment.href ?? segment.label}>
                            <BreadcrumbSeparator>
                                <ChevronRight className="h-4 w-4" />
                            </BreadcrumbSeparator>
                            <BreadcrumbItem
                                onDragOver={(e) => segmentId !== undefined && handleDragOver(e, segmentId)}
                                onDragLeave={() => setDragOverId(null)}
                                onDrop={(e) => segmentId !== undefined && handleDrop(e, segmentId)}
                                className={cn(
                                    'rounded px-1 transition-colors',
                                    segmentId !== undefined && dragOverId === segmentId && 'bg-primary/20 ring-2 ring-primary ring-inset'
                                )}
                            >
                                {isLast || !segment.href ? (
                                    <BreadcrumbPage>{segment.label}</BreadcrumbPage>
                                ) : (
                                    <BreadcrumbLink asChild>
                                        <Link to={segment.href}>{segment.label}</Link>
                                    </BreadcrumbLink>
                                )}
                            </BreadcrumbItem>
                        </Fragment>
                    )
                })}
            </BreadcrumbList>
        </Breadcrumb>
    )
}

/**
 * Build breadcrumb segments from a folder path
 */
export function buildBreadcrumbSegments(
    path: string,
    folderNames?: Map<string, string>
): BreadcrumbSegment[] {
    if (!path || path === '/') {
        return []
    }

    const parts = path.split('/').filter(Boolean)
    const segments: BreadcrumbSegment[] = []
    let currentPath = ''

    for (const part of parts) {
        currentPath += `/${part}`
        const label = folderNames?.get(currentPath) ?? part
        segments.push({
            label,
            href: `/files${currentPath}`,
        })
    }

    return segments
}
