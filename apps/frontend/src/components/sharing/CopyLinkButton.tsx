import { useState } from 'react'
import { Copy, Check } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import type { CopyLinkButtonProps } from './types'

/**
 * Get the full share URL for a token
 */
export function getShareUrl(token: string): string {
    return `${window.location.origin}/s/${token}`
}

/**
 * Button that copies a share link to clipboard
 */
export function CopyLinkButton({ shareToken, className }: CopyLinkButtonProps) {
    const [copied, setCopied] = useState(false)

    async function handleCopy(): Promise<void> {
        try {
            await navigator.clipboard.writeText(getShareUrl(shareToken))
            setCopied(true)
            setTimeout(() => setCopied(false), 2000)
        } catch (err) {
            console.error('Failed to copy:', err)
        }
    }

    return (
        <Button
            variant="outline"
            size="sm"
            onClick={handleCopy}
            className={cn('gap-2', className)}
        >
            {copied ? (
                <>
                    <Check className="h-4 w-4" />
                    Copied!
                </>
            ) : (
                <>
                    <Copy className="h-4 w-4" />
                    Copy Link
                </>
            )}
        </Button>
    )
}
