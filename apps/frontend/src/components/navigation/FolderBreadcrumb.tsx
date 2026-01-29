import { Link } from '@tanstack/react-router'
import { ChevronRight, Home } from 'lucide-react'
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
}

interface FolderBreadcrumbProps {
    segments: BreadcrumbSegment[]
    className?: string
}

/**
 * Breadcrumb navigation for folder hierarchy
 */
export function FolderBreadcrumb({ segments, className }: FolderBreadcrumbProps) {
    if (segments.length === 0) {
        return null
    }

    return (
        <Breadcrumb className={className}>
            <BreadcrumbList>
                <BreadcrumbItem>
                    <BreadcrumbLink asChild>
                        <Link to="/files" className="flex items-center gap-1">
                            <Home className="h-4 w-4" />
                            <span className="sr-only">Files</span>
                        </Link>
                    </BreadcrumbLink>
                </BreadcrumbItem>
                {segments.map((segment, index) => {
                    const isLast = index === segments.length - 1
                    return (
                        <Fragment key={segment.href ?? segment.label}>
                            <BreadcrumbSeparator>
                                <ChevronRight className="h-4 w-4" />
                            </BreadcrumbSeparator>
                            <BreadcrumbItem>
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
