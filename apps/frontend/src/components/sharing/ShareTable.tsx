import { format } from 'date-fns'
import { Link, Lock, Trash2, ExternalLink, MoreHorizontal } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { CopyLinkButton, getShareUrl } from './CopyLinkButton'
import type { ShareTableProps } from './types'

/**
 * Table displaying all shares with management options
 */
export function ShareTable({ shares, isLoading, onDelete, className }: ShareTableProps) {
    if (isLoading) {
        return (
            <div className={cn('space-y-2', className)}>
                {Array.from({ length: 3 }).map((_, i) => (
                    <Skeleton key={i} className="h-16 w-full" />
                ))}
            </div>
        )
    }

    if (shares.length === 0) {
        return (
            <div className={cn('flex flex-col items-center justify-center py-12', className)}>
                <Link className="h-12 w-12 text-muted-foreground" />
                <p className="mt-4 text-lg font-medium">No shares yet</p>
                <p className="text-sm text-muted-foreground">
                    Create share links from the file browser
                </p>
            </div>
        )
    }

    function isExpired(expiresAt: Date | null): boolean {
        if (!expiresAt) return false
        return new Date(expiresAt) < new Date()
    }

    return (
        <div className={cn('rounded-lg border border-border', className)}>
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>File</TableHead>
                        <TableHead>Created</TableHead>
                        <TableHead>Expires</TableHead>
                        <TableHead>Views</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="w-[100px]"></TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {shares.map((share) => {
                        const expired = isExpired(share.expiresAt)

                        return (
                            <TableRow key={share.id}>
                                <TableCell>
                                    <div className="flex items-center gap-2">
                                        <Link className="h-4 w-4 text-muted-foreground" />
                                        <span className="font-medium truncate max-w-[200px]">
                                            {share.type}: {share.targetId}
                                        </span>
                                        {share.passwordHash && (
                                            <Lock className="h-3 w-3 text-muted-foreground" />
                                        )}
                                    </div>
                                </TableCell>

                                <TableCell className="text-muted-foreground">
                                    {format(new Date(share.createdAt), 'MMM d, yyyy')}
                                </TableCell>

                                <TableCell className="text-muted-foreground">
                                    {share.expiresAt ? (
                                        <span className={cn(expired && 'text-destructive')}>
                                            {format(new Date(share.expiresAt), 'MMM d, yyyy')}
                                        </span>
                                    ) : (
                                        'Never'
                                    )}
                                </TableCell>

                                <TableCell className="text-muted-foreground">
                                    {share.viewCount ?? 0}
                                </TableCell>

                                <TableCell>
                                    {expired ? (
                                        <Badge variant="destructive">Expired</Badge>
                                    ) : (
                                        <Badge variant="default">Active</Badge>
                                    )}
                                </TableCell>

                                <TableCell>
                                    <div className="flex items-center gap-1">
                                        <CopyLinkButton shareToken={share.token} />

                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button variant="ghost" size="icon" className="h-8 w-8">
                                                    <MoreHorizontal className="h-4 w-4" />
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end">
                                                <DropdownMenuItem asChild>
                                                    <a
                                                        href={getShareUrl(share.token)}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                    >
                                                        <ExternalLink className="mr-2 h-4 w-4" />
                                                        Open Link
                                                    </a>
                                                </DropdownMenuItem>
                                                {onDelete && (
                                                    <DropdownMenuItem
                                                        onClick={() => onDelete(share.id)}
                                                        className="text-destructive focus:text-destructive"
                                                    >
                                                        <Trash2 className="mr-2 h-4 w-4" />
                                                        Delete
                                                    </DropdownMenuItem>
                                                )}
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </div>
                                </TableCell>
                            </TableRow>
                        )
                    })}
                </TableBody>
            </Table>
        </div>
    )
}
