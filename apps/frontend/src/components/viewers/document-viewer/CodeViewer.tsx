import { useState, useEffect } from 'react'
import { codeToHtml, type BundledLanguage } from 'shiki'
import { Loader2, AlertCircle, Copy, Check } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
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
    return EXTENSION_TO_LANGUAGE[ext] ?? 'text'
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
            </div>

            {/* Code content */}
            <ScrollArea className="flex-1 bg-[#0d1117]">
                <div
                    className="p-4 text-sm [&_pre]:!bg-transparent [&_code]:font-mono"
                    dangerouslySetInnerHTML={{ __html: highlightedHtml }}
                />
            </ScrollArea>
        </div>
    )
}
