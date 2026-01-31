import { useState, useEffect } from 'react'
import { codeToHtml, type BundledLanguage } from 'shiki'
import { Loader2, AlertCircle, Copy, Check, Edit2, Save, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Textarea } from '@/components/ui/textarea'
import { api } from '@/lib/api'
import type { CodeViewerProps } from './types'

// Map file extensions to shiki languages
const EXTENSION_TO_LANGUAGE: Record<string, BundledLanguage> = {
    // Web
    js: 'javascript',
    jsx: 'jsx',
    ts: 'typescript',
    tsx: 'tsx',
    html: 'html',
    css: 'css',
    scss: 'scss',
    less: 'less',
    json: 'json',

    // Backend
    py: 'python',
    rb: 'ruby',
    go: 'go',
    rs: 'rust',
    java: 'java',
    kt: 'kotlin',
    cs: 'csharp',
    php: 'php',

    // Shell
    sh: 'bash',
    bash: 'bash',
    zsh: 'bash',
    ps1: 'powershell',

    // Config
    yaml: 'yaml',
    yml: 'yaml',
    toml: 'toml',
    xml: 'xml',
    ini: 'ini',

    // Data
    sql: 'sql',
    graphql: 'graphql',

    // Markdown
    md: 'markdown',
    mdx: 'mdx',

    // Other
    c: 'c',
    cpp: 'cpp',
    h: 'c',
    hpp: 'cpp',
    swift: 'swift',
    dockerfile: 'dockerfile',
    makefile: 'makefile',
}

function getLanguageFromFilename(filename: string): BundledLanguage {
    const ext = filename.split('.').pop()?.toLowerCase() ?? ''
    const lang = EXTENSION_TO_LANGUAGE[ext]
    return lang ?? ('plaintext' as BundledLanguage)
}

/**
 * Code viewer with syntax highlighting using shiki
 */
export function CodeViewer({ file, className }: CodeViewerProps) {
    const [code, setCode] = useState<string>('')
    const [highlightedHtml, setHighlightedHtml] = useState<string>('')
    const [isLoading, setIsLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [copied, setCopied] = useState(false)
    const [isEditing, setIsEditing] = useState(false)
    const [editContent, setEditContent] = useState('')
    const [isSaving, setIsSaving] = useState(false)

    // Fetch the code content
    useEffect(() => {
        async function fetchCode(): Promise<void> {
            try {
                setIsLoading(true)
                setError(null)

                const response = await fetch(api.getDownloadUrl(file.id))
                if (!response.ok) {
                    throw new Error('Failed to fetch file')
                }

                const text = await response.text()
                setCode(text)
                setEditContent(text)

                // Highlight the code
                const language = getLanguageFromFilename(file.name)
                const html = await codeToHtml(text, {
                    lang: language,
                    theme: 'github-dark-default',
                })
                setHighlightedHtml(html)
            } catch (err) {
                setError('Failed to load file content')
                console.error('Code viewer error:', err)
            } finally {
                setIsLoading(false)
            }
        }

        fetchCode()
    }, [file.id, file.name])

    async function copyToClipboard(): Promise<void> {
        try {
            await navigator.clipboard.writeText(code)
            setCopied(true)
            setTimeout(() => setCopied(false), 2000)
        } catch (err) {
            console.error('Failed to copy:', err)
        }
    }

    async function handleSave(): Promise<void> {
        try {
            setIsSaving(true)
            await api.updateFileContent(file.id, editContent)
            setCode(editContent)
            
            // Re-highlight the code
            const language = getLanguageFromFilename(file.name)
            const html = await codeToHtml(editContent, {
                lang: language,
                theme: 'github-dark-default',
            })
            setHighlightedHtml(html)
            
            setIsEditing(false)
        } catch (err) {
            console.error('Failed to save:', err)
            setError('Failed to save file')
        } finally {
            setIsSaving(false)
        }
    }

    function handleCancel(): void {
        setEditContent(code)
        setIsEditing(false)
    }

    function handleKeyDown(e: React.KeyboardEvent): void {
        if (e.ctrlKey && e.key === 's') {
            e.preventDefault()
            handleSave()
        }
        if (e.key === 'Escape') {
            handleCancel()
        }
    }

    if (isLoading) {
        return (
            <div
                className={cn(
                    'flex h-64 items-center justify-center rounded-lg border border-border bg-card',
                    className
                )}
            >
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        )
    }

    if (error) {
        return (
            <div
                className={cn(
                    'flex flex-col items-center justify-center gap-4 rounded-lg border border-destructive/50 bg-card p-8',
                    className
                )}
            >
                <AlertCircle className="h-12 w-12 text-destructive" />
                <p className="text-muted-foreground">{error}</p>
            </div>
        )
    }

    const lineCount = code.split('\n').length
    const language = getLanguageFromFilename(file.name)

    return (
        <div
            className={cn(
                'flex flex-col overflow-hidden rounded-lg border border-border',
                className
            )}
        >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-border bg-card px-4 py-2">
                <div className="flex items-center gap-3">
                    <span className="text-sm font-medium">{file.name}</span>
                    <span className="rounded bg-secondary px-2 py-0.5 text-xs text-muted-foreground">
                        {language}
                    </span>
                    <span className="text-xs text-muted-foreground">
                        {lineCount} lines
                    </span>
                </div>

                <div className="flex items-center gap-2">
                    {isEditing ? (
                        <>
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={handleCancel}
                                disabled={isSaving}
                                className="gap-2"
                            >
                                <X className="h-4 w-4" />
                                Cancel
                            </Button>
                            <Button
                                variant="default"
                                size="sm"
                                onClick={handleSave}
                                disabled={isSaving}
                                className="gap-2"
                            >
                                {isSaving ? (
                                    <>
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                        Saving...
                                    </>
                                ) : (
                                    <>
                                        <Save className="h-4 w-4" />
                                        Save
                                    </>
                                )}
                            </Button>
                        </>
                    ) : (
                        <>
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={copyToClipboard}
                                className="gap-2"
                            >
                                {copied ? (
                                    <>
                                        <Check className="h-4 w-4" />
                                        Copied
                                    </>
                                ) : (
                                    <>
                                        <Copy className="h-4 w-4" />
                                        Copy
                                    </>
                                )}
                            </Button>
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setIsEditing(true)}
                                className="gap-2"
                            >
                                <Edit2 className="h-4 w-4" />
                                Edit
                            </Button>
                        </>
                    )}
                </div>
            </div>

            {/* Content */}
            {isEditing ? (
                <Textarea
                    value={editContent}
                    onChange={(e) => setEditContent(e.target.value)}
                    onKeyDown={handleKeyDown}
                    className="flex-1 resize-none border-0 p-4 font-mono text-sm focus-visible:ring-0"
                    placeholder="Start typing..."
                />
            ) : (
                <ScrollArea className="flex-1 bg-[#0d1117]">
                    <div
                        className="p-4 text-sm [&_pre]:!bg-transparent [&_code]:font-mono"
                        dangerouslySetInnerHTML={{ __html: highlightedHtml }}
                    />
                </ScrollArea>
            )}
        </div>
    )
}
