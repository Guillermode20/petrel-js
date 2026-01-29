import { useState, useEffect } from 'react'
import { Loader2, AlertCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { ScrollArea } from '@/components/ui/scroll-area'
import { api } from '@/lib/api'
import type { MarkdownViewerProps } from './types'

/**
 * Simple markdown viewer with basic rendering
 * Uses a simple parser for common markdown patterns
 */
export function MarkdownViewer({ file, className }: MarkdownViewerProps) {
    const [content, setContent] = useState<string>('')
    const [isLoading, setIsLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        async function fetchMarkdown(): Promise<void> {
            try {
                setIsLoading(true)
                setError(null)

                const response = await fetch(api.getDownloadUrl(file.id))
                if (!response.ok) {
                    throw new Error('Failed to fetch file')
                }

                const text = await response.text()
                setContent(text)
            } catch (err) {
                setError('Failed to load markdown')
                console.error('Markdown viewer error:', err)
            } finally {
                setIsLoading(false)
            }
        }

        fetchMarkdown()
    }, [file.id])

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

    return (
        <div
            className={cn(
                'rounded-lg border border-border bg-card',
                className
            )}
        >
            <div className="border-b border-border px-4 py-2">
                <span className="text-sm font-medium">{file.name}</span>
            </div>

            <ScrollArea className="flex-1">
                <div className="prose prose-invert max-w-none p-6">
                    <MarkdownContent content={content} />
                </div>
            </ScrollArea>
        </div>
    )
}

interface MarkdownContentProps {
    content: string
}

/**
 * Simple markdown renderer
 * Handles basic patterns: headings, bold, italic, code, links, lists
 */
function MarkdownContent({ content }: MarkdownContentProps) {
    const lines = content.split('\n')
    const elements: React.ReactNode[] = []
    let inCodeBlock = false
    let codeBlockContent: string[] = []
    let listItems: string[] = []
    let listType: 'ul' | 'ol' | null = null

    function flushList(): void {
        if (listItems.length > 0 && listType) {
            const ListTag = listType
            elements.push(
                <ListTag key={elements.length} className="my-2">
                    {listItems.map((item, i) => (
                        <li key={i}>{parseInline(item)}</li>
                    ))}
                </ListTag>
            )
            listItems = []
            listType = null
        }
    }

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i]

        // Code blocks
        if (line.startsWith('```')) {
            if (inCodeBlock) {
                elements.push(
                    <pre key={elements.length} className="rounded-lg bg-secondary p-4 overflow-x-auto">
                        <code className="text-sm font-mono">{codeBlockContent.join('\n')}</code>
                    </pre>
                )
                codeBlockContent = []
                inCodeBlock = false
            } else {
                flushList()
                inCodeBlock = true
            }
            continue
        }

        if (inCodeBlock) {
            codeBlockContent.push(line)
            continue
        }

        // Empty line
        if (line.trim() === '') {
            flushList()
            continue
        }

        // Headings
        const headingMatch = line.match(/^(#{1,6})\s+(.+)$/)
        if (headingMatch) {
            flushList()
            const level = headingMatch[1].length
            const text = headingMatch[2]
            const headingClass = "mt-4 first:mt-0"
            switch (level) {
                case 1:
                    elements.push(<h1 key={elements.length} className={headingClass}>{parseInline(text)}</h1>)
                    break
                case 2:
                    elements.push(<h2 key={elements.length} className={headingClass}>{parseInline(text)}</h2>)
                    break
                case 3:
                    elements.push(<h3 key={elements.length} className={headingClass}>{parseInline(text)}</h3>)
                    break
                case 4:
                    elements.push(<h4 key={elements.length} className={headingClass}>{parseInline(text)}</h4>)
                    break
                case 5:
                    elements.push(<h5 key={elements.length} className={headingClass}>{parseInline(text)}</h5>)
                    break
                case 6:
                    elements.push(<h6 key={elements.length} className={headingClass}>{parseInline(text)}</h6>)
                    break
            }
            continue
        }

        // Unordered list
        if (line.match(/^[-*+]\s+/)) {
            if (listType !== 'ul') {
                flushList()
                listType = 'ul'
            }
            listItems.push(line.replace(/^[-*+]\s+/, ''))
            continue
        }

        // Ordered list
        if (line.match(/^\d+\.\s+/)) {
            if (listType !== 'ol') {
                flushList()
                listType = 'ol'
            }
            listItems.push(line.replace(/^\d+\.\s+/, ''))
            continue
        }

        // Horizontal rule
        if (line.match(/^[-*_]{3,}$/)) {
            flushList()
            elements.push(<hr key={elements.length} className="my-4 border-border" />)
            continue
        }

        // Blockquote
        if (line.startsWith('> ')) {
            flushList()
            elements.push(
                <blockquote
                    key={elements.length}
                    className="border-l-4 border-primary pl-4 italic text-muted-foreground"
                >
                    {parseInline(line.slice(2))}
                </blockquote>
            )
            continue
        }

        // Regular paragraph
        flushList()
        elements.push(
            <p key={elements.length} className="my-2">
                {parseInline(line)}
            </p>
        )
    }

    flushList()

    return <>{elements}</>
}

/**
 * Parse inline markdown: bold, italic, code, links
 */
function parseInline(text: string): React.ReactNode {
    const parts: React.ReactNode[] = []
    let remaining = text
    let keyIndex = 0

    while (remaining.length > 0) {
        // Inline code
        const codeMatch = remaining.match(/^`([^`]+)`/)
        if (codeMatch) {
            parts.push(
                <code key={keyIndex++} className="rounded bg-secondary px-1.5 py-0.5 text-sm">
                    {codeMatch[1]}
                </code>
            )
            remaining = remaining.slice(codeMatch[0].length)
            continue
        }

        // Bold
        const boldMatch = remaining.match(/^\*\*([^*]+)\*\*/) || remaining.match(/^__([^_]+)__/)
        if (boldMatch) {
            parts.push(<strong key={keyIndex++}>{boldMatch[1]}</strong>)
            remaining = remaining.slice(boldMatch[0].length)
            continue
        }

        // Italic
        const italicMatch = remaining.match(/^\*([^*]+)\*/) || remaining.match(/^_([^_]+)_/)
        if (italicMatch) {
            parts.push(<em key={keyIndex++}>{italicMatch[1]}</em>)
            remaining = remaining.slice(italicMatch[0].length)
            continue
        }

        // Links
        const linkMatch = remaining.match(/^\[([^\]]+)\]\(([^)]+)\)/)
        if (linkMatch) {
            parts.push(
                <a
                    key={keyIndex++}
                    href={linkMatch[2]}
                    className="text-primary underline hover:no-underline"
                    target="_blank"
                    rel="noopener noreferrer"
                >
                    {linkMatch[1]}
                </a>
            )
            remaining = remaining.slice(linkMatch[0].length)
            continue
        }

        // Plain text (consume until next special character)
        const plainMatch = remaining.match(/^[^`*_\[]+/)
        if (plainMatch) {
            parts.push(plainMatch[0])
            remaining = remaining.slice(plainMatch[0].length)
            continue
        }

        // Single special character that doesn't match a pattern
        parts.push(remaining[0])
        remaining = remaining.slice(1)
    }

    return parts.length === 1 ? parts[0] : parts
}
