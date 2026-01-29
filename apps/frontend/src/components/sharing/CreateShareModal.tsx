import { useState } from 'react'
import { format, addDays, addHours, addWeeks, addMonths } from 'date-fns'
import { Loader2, Link, Lock, Download, Clock } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Input } from '@/components/ui/input'
import { useCreateShare } from '@/hooks'
import { CopyLinkButton, getShareUrl } from './CopyLinkButton'
import { QRCodeDisplay } from './QRCodeDisplay'
import type { CreateShareModalProps } from './types'
import type { Share } from '@petrel/shared'

type ExpiryOption = '1h' | '24h' | '7d' | '30d' | 'never'

const EXPIRY_OPTIONS: { value: ExpiryOption; label: string }[] = [
    { value: '1h', label: '1 hour' },
    { value: '24h', label: '24 hours' },
    { value: '7d', label: '7 days' },
    { value: '30d', label: '30 days' },
    { value: 'never', label: 'Never' },
]

function getExpiryDate(option: ExpiryOption): Date | null {
    const now = new Date()
    switch (option) {
        case '1h': return addHours(now, 1)
        case '24h': return addDays(now, 1)
        case '7d': return addWeeks(now, 1)
        case '30d': return addMonths(now, 1)
        case 'never': return null
    }
}

/**
 * Modal for creating a new share link
 */
export function CreateShareModal({
    type,
    targetId,
    targetName,
    isOpen,
    onClose,
    onSuccess,
}: CreateShareModalProps) {
    const [expiry, setExpiry] = useState<ExpiryOption>('7d')
    const [usePassword, setUsePassword] = useState(false)
    const [password, setPassword] = useState('')
    const [allowDownload, setAllowDownload] = useState(true)
    const [createdShare, setCreatedShare] = useState<Share | null>(null)

    const createShareMutation = useCreateShare()

    async function handleCreate(): Promise<void> {
        try {
            const expiresAt = getExpiryDate(expiry)
            const share = await createShareMutation.mutateAsync({
                type,
                targetId,
                expiresAt: expiresAt?.toISOString(),
                password: usePassword ? password : undefined,
                allowDownload,
            })

            setCreatedShare(share)
            onSuccess?.(share)
            toast.success('Share link created')
        } catch (err) {
            toast.error('Failed to create share link')
        }
    }

    function handleClose(): void {
        setCreatedShare(null)
        setExpiry('7d')
        setUsePassword(false)
        setPassword('')
        setAllowDownload(true)
        onClose()
    }

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Link className="h-5 w-5" />
                        {createdShare ? 'Share Link Created' : 'Create Share Link'}
                    </DialogTitle>
                    <DialogDescription>
                        {createdShare
                            ? 'Your share link is ready to use.'
                            : `Share "${targetName}" with a link.`
                        }
                    </DialogDescription>
                </DialogHeader>

                {createdShare ? (
                    <div className="space-y-6 py-4">
                        {/* QR Code */}
                        <div className="flex justify-center">
                            <QRCodeDisplay shareToken={createdShare.token} size={160} />
                        </div>

                        {/* Link display */}
                        <div className="flex items-center gap-2">
                            <Input
                                readOnly
                                value={getShareUrl(createdShare.token)}
                                className="font-mono text-sm"
                            />
                            <CopyLinkButton shareToken={createdShare.token} />
                        </div>

                        {/* Share info */}
                        <div className="space-y-2 text-sm text-muted-foreground">
                            {createdShare.expiresAt && (
                                <div className="flex items-center gap-2">
                                    <Clock className="h-4 w-4" />
                                    <span>
                                        Expires {format(new Date(createdShare.expiresAt), 'PPp')}
                                    </span>
                                </div>
                            )}
                            {createdShare.passwordHash && (
                                <div className="flex items-center gap-2">
                                    <Lock className="h-4 w-4" />
                                    <span>Password protected</span>
                                </div>
                            )}
                        </div>
                    </div>
                ) : (
                    <div className="space-y-6 py-4">
                        {/* Expiry */}
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <Clock className="h-4 w-4 text-muted-foreground" />
                                <span className="text-sm">Expires after</span>
                            </div>
                            <Select value={expiry} onValueChange={(v) => setExpiry(v as ExpiryOption)}>
                                <SelectTrigger className="w-32">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {EXPIRY_OPTIONS.map((opt) => (
                                        <SelectItem key={opt.value} value={opt.value}>
                                            {opt.label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Password protection */}
                        <div className="space-y-3">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <Lock className="h-4 w-4 text-muted-foreground" />
                                    <span className="text-sm">Password protection</span>
                                </div>
                                <Switch checked={usePassword} onCheckedChange={setUsePassword} />
                            </div>
                            {usePassword && (
                                <Input
                                    type="password"
                                    placeholder="Enter password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                />
                            )}
                        </div>

                        {/* Permissions */}
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <Download className="h-4 w-4 text-muted-foreground" />
                                <span className="text-sm">Allow downloads</span>
                            </div>
                            <Switch checked={allowDownload} onCheckedChange={setAllowDownload} />
                        </div>
                    </div>
                )}

                <DialogFooter>
                    {createdShare ? (
                        <Button onClick={handleClose}>Done</Button>
                    ) : (
                        <>
                            <Button variant="outline" onClick={handleClose}>
                                Cancel
                            </Button>
                            <Button
                                onClick={handleCreate}
                                disabled={createShareMutation.isPending || (usePassword && !password)}
                            >
                                {createShareMutation.isPending && (
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                )}
                                Create Link
                            </Button>
                        </>
                    )}
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
