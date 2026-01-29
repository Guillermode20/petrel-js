import { useCallback, useState, useRef } from 'react'
import { Upload, X, CheckCircle, AlertCircle, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { ScrollArea } from '@/components/ui/scroll-area'
import { formatFileSize } from './utils'
import type { UploadProgress } from './types'

interface UploadZoneProps {
    onUpload: (files: FileList) => void
    isUploading?: boolean
    className?: string
}

/**
 * Drag and drop upload zone
 */
export function UploadZone({ onUpload, isUploading, className }: UploadZoneProps) {
    const [isDragOver, setIsDragOver] = useState(false)
    const inputRef = useRef<HTMLInputElement>(null)

    const handleDragOver = useCallback((e: React.DragEvent) => {
        e.preventDefault()
        e.stopPropagation()
        setIsDragOver(true)
    }, [])

    const handleDragLeave = useCallback((e: React.DragEvent) => {
        e.preventDefault()
        e.stopPropagation()
        setIsDragOver(false)
    }, [])

    const handleDrop = useCallback(
        (e: React.DragEvent) => {
            e.preventDefault()
            e.stopPropagation()
            setIsDragOver(false)

            if (e.dataTransfer.files.length > 0) {
                onUpload(e.dataTransfer.files)
            }
        },
        [onUpload]
    )

    const handleClick = useCallback(() => {
        inputRef.current?.click()
    }, [])

    const handleFileChange = useCallback(
        (e: React.ChangeEvent<HTMLInputElement>) => {
            if (e.target.files && e.target.files.length > 0) {
                onUpload(e.target.files)
                e.target.value = ''
            }
        },
        [onUpload]
    )

    return (
        <div
            className={cn(
                'relative flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-border p-8 transition-colors',
                isDragOver && 'border-primary bg-primary/5',
                isUploading && 'pointer-events-none opacity-50',
                className
            )}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={handleClick}
        >
            <input
                ref={inputRef}
                type="file"
                multiple
                className="hidden"
                onChange={handleFileChange}
            />
            <Upload className="mb-4 h-10 w-10 text-muted-foreground" />
            <p className="mb-1 text-sm font-medium">
                {isDragOver ? 'Drop files here' : 'Drag and drop files here'}
            </p>
            <p className="text-xs text-muted-foreground">or click to browse</p>
        </div>
    )
}

/**
 * Smaller horizontal upload bar
 */
export function UploadBar({ onUpload, isUploading, className }: UploadZoneProps) {
    const [isDragOver, setIsDragOver] = useState(false)
    const inputRef = useRef<HTMLInputElement>(null)

    const handleDragOver = useCallback((e: React.DragEvent) => {
        e.preventDefault()
        e.stopPropagation()
        setIsDragOver(true)
    }, [])

    const handleDragLeave = useCallback((e: React.DragEvent) => {
        e.preventDefault()
        e.stopPropagation()
        setIsDragOver(false)
    }, [])

    const handleDrop = useCallback(
        (e: React.DragEvent) => {
            e.preventDefault()
            e.stopPropagation()
            setIsDragOver(false)

            if (e.dataTransfer.files.length > 0) {
                onUpload(e.dataTransfer.files)
            }
        },
        [onUpload]
    )

    const handleClick = useCallback(() => {
        inputRef.current?.click()
    }, [])

    const handleFileChange = useCallback(
        (e: React.ChangeEvent<HTMLInputElement>) => {
            if (e.target.files && e.target.files.length > 0) {
                onUpload(e.target.files)
                e.target.value = ''
            }
        },
        [onUpload]
    )

    return (
        <div
            className={cn(
                'group relative flex h-12 cursor-pointer items-center justify-center gap-3 rounded-lg border-2 border-dashed border-border bg-secondary/20 px-4 transition-all hover:border-primary/50 hover:bg-secondary/40',
                isDragOver && 'border-primary bg-primary/10 scale-[1.01]',
                isUploading && 'pointer-events-none opacity-50',
                className
            )}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={handleClick}
        >
            <input
                ref={inputRef}
                type="file"
                multiple
                className="hidden"
                onChange={handleFileChange}
            />
            <Upload className={cn('h-4 w-4 text-muted-foreground transition-colors group-hover:text-primary', isDragOver && 'text-primary')} />
            <p className="text-sm font-medium">
                {isDragOver ? 'Drop files here' : 'Drag and drop files here or click to browse'}
            </p>
        </div>
    )
}

interface UploadProgressListProps {
    uploads: UploadProgress[]
    onCancel?: (file: globalThis.File) => void
    onDismiss?: (file: globalThis.File) => void
}

/**
 * List of upload progress items
 */
export function UploadProgressList({ uploads, onCancel, onDismiss }: UploadProgressListProps) {
    if (uploads.length === 0) return null

    return (
        <div className="fixed bottom-4 right-4 z-50 w-80 rounded-lg border border-border bg-background shadow-lg">
            <div className="flex items-center justify-between border-b border-border px-4 py-2">
                <span className="text-sm font-medium">Uploads</span>
                <span className="text-xs text-muted-foreground">
                    {uploads.filter((u) => u.status === 'completed').length}/{uploads.length}
                </span>
            </div>
            <ScrollArea className="max-h-64">
                <div className="space-y-2 p-4">
                    {uploads.map((upload) => (
                        <UploadProgressItem
                            key={upload.file.name + upload.file.lastModified}
                            upload={upload}
                            onCancel={onCancel}
                            onDismiss={onDismiss}
                        />
                    ))}
                </div>
            </ScrollArea>
        </div>
    )
}

interface UploadProgressItemProps {
    upload: UploadProgress
    onCancel?: (file: globalThis.File) => void
    onDismiss?: (file: globalThis.File) => void
}

function UploadProgressItem({ upload, onCancel, onDismiss }: UploadProgressItemProps) {
    const { file, progress, status, error } = upload

    return (
        <div className="space-y-1">
            <div className="flex items-center justify-between gap-2">
                <div className="flex min-w-0 flex-1 items-center gap-2">
                    {status === 'completed' && (
                        <CheckCircle className="h-4 w-4 shrink-0 text-green-500" />
                    )}
                    {status === 'error' && (
                        <AlertCircle className="h-4 w-4 shrink-0 text-destructive" />
                    )}
                    {status === 'uploading' && (
                        <Loader2 className="h-4 w-4 shrink-0 animate-spin text-primary" />
                    )}
                    {status === 'pending' && (
                        <div className="h-4 w-4 shrink-0 rounded-full border-2 border-muted" />
                    )}
                    <span className="truncate text-sm" title={file.name}>
                        {file.name}
                    </span>
                </div>
                <div className="flex items-center gap-1">
                    <span className="text-xs text-muted-foreground">{formatFileSize(file.size)}</span>
                    {(status === 'pending' || status === 'uploading') && onCancel && (
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-5 w-5"
                            onClick={() => onCancel(file)}
                        >
                            <X className="h-3 w-3" />
                        </Button>
                    )}
                    {(status === 'completed' || status === 'error') && onDismiss && (
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-5 w-5"
                            onClick={() => onDismiss(file)}
                        >
                            <X className="h-3 w-3" />
                        </Button>
                    )}
                </div>
            </div>
            {status === 'uploading' && (
                <Progress value={progress} className="h-1" />
            )}
            {status === 'error' && error && (
                <p className="text-xs text-destructive">{error}</p>
            )}
        </div>
    )
}
