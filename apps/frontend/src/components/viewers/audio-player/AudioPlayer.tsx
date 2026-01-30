import {
    Play,
    Pause,
    SkipBack,
    SkipForward,
    Volume2,
    VolumeX,
    Repeat,
    Shuffle,
    Music,
    Loader2,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Slider } from '@/components/ui/slider'
import { api } from '@/lib/api'
import { useAudioPlayer } from './useAudioPlayer'
import { formatDuration } from '../video-player/utils'
import type { AudioPlayerProps } from './types'

/**
 * Audio player with album art, track info, and playback controls
 */
export function AudioPlayer({
    file,
    className,
    autoPlay = false,
    onEnded,
}: AudioPlayerProps) {
    const { state, controls, metadata } = useAudioPlayer({
        file,
        autoPlay,
        onEnded,
    })

    const {
        isPlaying,
        isLoading,
        currentTime,
        duration,
        volume,
        isMuted,
        isLooped,
        supportsScrubbing,
        scrubbingMessage,
    } = state

    const hasAlbumArt = metadata?.albumArt

    return (
        <div
            className={cn(
                'flex flex-col items-center gap-6 rounded-lg border border-border bg-card p-6',
                className
            )}
        >
            {/* Album art */}
            <div className="flex h-48 w-48 items-center justify-center overflow-hidden rounded-lg bg-secondary">
                {hasAlbumArt ? (
                    <img
                        src={api.getThumbnailUrl(file.id, 'medium')}
                        alt={metadata?.album ?? file.name}
                        className="h-full w-full object-cover"
                    />
                ) : (
                    <Music className="h-16 w-16 text-muted-foreground" />
                )}
            </div>

            {/* Track info */}
            <div className="text-center">
                <h3 className="text-lg font-medium">
                    {metadata?.title ?? file.name}
                </h3>
                {metadata?.artist && (
                    <p className="text-sm text-muted-foreground">{metadata.artist}</p>
                )}
                {metadata?.album && (
                    <p className="text-xs text-muted-foreground">{metadata.album}</p>
                )}
            </div>

            {/* Progress bar */}
            <div className="w-full space-y-1">
                <Slider
                    value={[currentTime]}
                    min={0}
                    max={duration > 0 ? duration : 100}
                    step={0.1}
                    onValueChange={([value]) => {
                        if (typeof value === 'number') {
                            controls.seek(value)
                        }
                    }}
                    disabled={isLoading || !supportsScrubbing}
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                    <span>{formatDuration(currentTime)}</span>
                    <span>{formatDuration(duration)}</span>
                </div>
                {!supportsScrubbing && scrubbingMessage && (
                    <p className="text-xs text-amber-500">
                        {scrubbingMessage}
                    </p>
                )}
            </div>

            {/* Main controls */}
            <div className="flex items-center gap-4">
                <Button
                    variant="ghost"
                    size="icon"
                    className={cn('h-8 w-8', isLooped && 'text-primary')}
                    onClick={controls.toggleLoop}
                >
                    <Repeat className="h-4 w-4" />
                </Button>

                <Button
                    variant="ghost"
                    size="icon"
                    className="h-10 w-10"
                    onClick={controls.previous}
                >
                    <SkipBack className="h-5 w-5" />
                </Button>

                <Button
                    size="icon"
                    className="h-14 w-14 rounded-full"
                    onClick={controls.togglePlay}
                    disabled={isLoading}
                >
                    {isLoading ? (
                        <Loader2 className="h-6 w-6 animate-spin" />
                    ) : isPlaying ? (
                        <Pause className="h-6 w-6" />
                    ) : (
                        <Play className="h-6 w-6 ml-1" />
                    )}
                </Button>

                <Button
                    variant="ghost"
                    size="icon"
                    className="h-10 w-10"
                    onClick={controls.next}
                >
                    <SkipForward className="h-5 w-5" />
                </Button>

                <Button variant="ghost" size="icon" className="h-8 w-8 opacity-50" disabled>
                    <Shuffle className="h-4 w-4" />
                </Button>
            </div>

            {/* Volume control */}
            <div className="flex w-full max-w-xs items-center gap-2">
                <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 shrink-0"
                    onClick={controls.toggleMute}
                >
                    {isMuted || volume === 0 ? (
                        <VolumeX className="h-4 w-4" />
                    ) : (
                        <Volume2 className="h-4 w-4" />
                    )}
                </Button>
                <Slider
                    value={[isMuted ? 0 : volume * 100]}
                    min={0}
                    max={100}
                    step={1}
                    onValueChange={([value]) => {
                        if (typeof value === 'number') {
                            controls.setVolume(value / 100)
                        }
                    }}
                    className="flex-1"
                />
            </div>
        </div>
    )
}
