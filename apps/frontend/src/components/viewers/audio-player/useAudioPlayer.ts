import { useState, useEffect, useCallback, useRef } from 'react'
import { Howl } from 'howler'
import type { File, AudioMetadata } from '@petrel/shared'
import { api } from '@/lib/api'
import type { AudioPlayerState, AudioControls, UseAudioPlayerReturn } from './types'

interface UseAudioPlayerOptions {
  file: File
  autoPlay?: boolean
  onEnded?: () => void
  onNext?: () => void
  onPrevious?: () => void
}

/**
 * Hook for managing audio player state with Howler.js
 */
export function useAudioPlayer({
  file,
  autoPlay = false,
  onEnded,
  onNext,
  onPrevious,
}: UseAudioPlayerOptions): UseAudioPlayerReturn {
  const howlRef = useRef<Howl | null>(null)
  const animationRef = useRef<number | null>(null)
  const scrubbingSupportedRef = useRef(true)

  const [streamUrl, setStreamUrl] = useState<string | null>(null)

  const [state, setState] = useState<AudioPlayerState>({
    isPlaying: false,
    isLoading: true,
    currentTime: 0,
    duration: 0,
    volume: 1,
    isMuted: false,
    isLooped: false,
    isShuffled: false,
    supportsScrubbing: true,
    scrubbingMessage: null,
  })

  const volumeRef = useRef(state.volume)
  const loopRef = useRef(state.isLooped)

  const metadata = file.metadata as AudioMetadata | undefined

  useEffect(() => {
    volumeRef.current = state.volume
  }, [state.volume])

  // Initialize Howl instance
  useEffect(() => {
    let isMounted = true
    const url = api.getAudioStreamUrl(file.id)

    setStreamUrl(null)
    setState((prev) => ({
      ...prev,
      isLoading: true,
      currentTime: 0,
      duration: 0,
      supportsScrubbing: true,
      scrubbingMessage: null,
    }))

    const probeRangeSupport = async (): Promise<void> => {
      try {
        const response = await fetch(url, { method: 'HEAD' })
        if (!isMounted) {
          return
        }
        const acceptRanges = response.headers.get('accept-ranges')?.toLowerCase() ?? ''
        const supportsRange = response.ok && acceptRanges.includes('bytes')
        setState((prev) => ({
          ...prev,
          supportsScrubbing: supportsRange,
          scrubbingMessage: supportsRange
            ? null
            : 'Scrubbing unavailable: server did not advertise byte-range support.',
        }))
      } catch (error) {
        if (!isMounted) {
          return
        }
        setState((prev) => ({
          ...prev,
          supportsScrubbing: false,
          scrubbingMessage: 'Scrubbing unavailable right now. Download for precise seeking.',
        }))
      } finally {
        if (isMounted) {
          setStreamUrl(url)
        }
      }
    }

    void probeRangeSupport()

    return () => {
      isMounted = false
    }
  }, [file.id])

  useEffect(() => {
    scrubbingSupportedRef.current = state.supportsScrubbing
  }, [state.supportsScrubbing])

  useEffect(() => {
    loopRef.current = state.isLooped
    howlRef.current?.loop(state.isLooped)
  }, [state.isLooped])

  useEffect(() => {
    if (!streamUrl) {
      return
    }

    const format = file.mimeType.split('/')[1] || 'mp3'

    const howl = new Howl({
      src: [streamUrl],
      format: [format],
      html5: true,
      autoplay: autoPlay,
      volume: volumeRef.current,
      loop: loopRef.current,
      onload: () => {
        setState((prev) => ({
          ...prev,
          isLoading: false,
          duration: howl.duration(),
        }))
      },
      onplay: () => {
        setState((prev) => ({ ...prev, isPlaying: true }))
        updateProgress()
      },
      onpause: () => {
        setState((prev) => ({ ...prev, isPlaying: false }))
        if (animationRef.current) {
          cancelAnimationFrame(animationRef.current)
        }
      },
      onstop: () => {
        setState((prev) => ({ ...prev, isPlaying: false, currentTime: 0 }))
        if (animationRef.current) {
          cancelAnimationFrame(animationRef.current)
        }
      },
      onend: () => {
        setState((prev) => ({ ...prev, isPlaying: false }))
        if (animationRef.current) {
          cancelAnimationFrame(animationRef.current)
        }
        onEnded?.()
      },
      onloaderror: () => {
        setState((prev) => ({ ...prev, isLoading: false }))
      },
    })

    howlRef.current = howl

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
      howl.unload()
      howlRef.current = null
    }
  }, [streamUrl, autoPlay])

  // Progress update animation
  const updateProgress = useCallback(() => {
    const howl = howlRef.current
    if (!howl) return

    setState((prev) => ({
      ...prev,
      currentTime: howl.seek() as number,
    }))

    animationRef.current = requestAnimationFrame(updateProgress)
  }, [])

  // Controls
  const play = useCallback(() => {
    howlRef.current?.play()
  }, [])

  const pause = useCallback(() => {
    howlRef.current?.pause()
  }, [])

  const togglePlay = useCallback(() => {
    const howl = howlRef.current
    if (!howl) return
    if (howl.playing()) {
      howl.pause()
    } else {
      howl.play()
    }
  }, [])

  const seek = useCallback((time: number) => {
    const howl = howlRef.current
    if (!howl) {
      return
    }
    if (!scrubbingSupportedRef.current && time !== 0) {
      return
    }
    howl.seek(time)
    setState((prev) => ({ ...prev, currentTime: time }))
  }, [])

  const setVolume = useCallback((volume: number) => {
    const clampedVolume = Math.max(0, Math.min(1, volume))
    howlRef.current?.volume(clampedVolume)
    setState((prev) => ({
      ...prev,
      volume: clampedVolume,
      isMuted: clampedVolume === 0,
    }))
  }, [])

  const toggleMute = useCallback(() => {
    const howl = howlRef.current
    if (!howl) return
    const newMuted = !state.isMuted
    howl.mute(newMuted)
    setState((prev) => ({ ...prev, isMuted: newMuted }))
  }, [state.isMuted])

  const toggleLoop = useCallback(() => {
    setState((prev) => ({ ...prev, isLooped: !prev.isLooped }))
  }, [])

  const toggleShuffle = useCallback(() => {
    setState((prev) => ({ ...prev, isShuffled: !prev.isShuffled }))
  }, [])

  const next = useCallback(() => {
    onNext?.()
  }, [onNext])

  const previous = useCallback(() => {
    // If more than 3 seconds in, restart; otherwise go to previous
    if (state.currentTime > 3) {
      seek(0)
    } else {
      onPrevious?.()
    }
  }, [state.currentTime, seek, onPrevious])

  // Media Session API for lock screen controls
  useEffect(() => {
    if (!('mediaSession' in navigator)) return

    const updateMediaSession = () => {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: metadata?.title ?? file.name,
        artist: metadata?.artist ?? 'Unknown',
        album: metadata?.album ?? undefined,
        artwork: metadata?.albumArt ? [{ src: api.getThumbnailUrl(file.id, 'medium'), sizes: '300x300', type: 'image/jpeg' }] : undefined,
      })

      navigator.mediaSession.setActionHandler('play', () => {
        howlRef.current?.play()
      })

      navigator.mediaSession.setActionHandler('pause', () => {
        howlRef.current?.pause()
      })

      navigator.mediaSession.setActionHandler('previoustrack', () => {
        onPrevious?.()
      })

      navigator.mediaSession.setActionHandler('nexttrack', () => {
        onNext?.()
      })

      navigator.mediaSession.setActionHandler('seekto', (details) => {
        if (details.seekTime !== undefined && details.seekTime >= 0) {
          if (!scrubbingSupportedRef.current) {
            return
          }
          howlRef.current?.seek(details.seekTime)
          setState((prev) => ({ ...prev, currentTime: details.seekTime ?? 0 }))
        }
      })
    }

    updateMediaSession()
  }, [file, metadata, onPrevious, onNext])

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Only handle if not typing in an input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return
      }

      switch (e.key.toLowerCase()) {
        case ' ':
        case 'k':
          e.preventDefault()
          togglePlay()
          break
        case 'n':
          e.preventDefault()
          onNext?.()
          break
        case 'p':
          e.preventDefault()
          onPrevious?.()
          break
        case 'arrowleft':
          e.preventDefault()
          seek(state.currentTime - 5)
          break
        case 'arrowright':
          e.preventDefault()
          seek(state.currentTime + 5)
          break
        case 'm':
          e.preventDefault()
          toggleMute()
          break
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [state.currentTime, togglePlay, onNext, onPrevious, seek, toggleMute])

  const controls: AudioControls = {
    play,
    pause,
    togglePlay,
    seek,
    setVolume,
    toggleMute,
    toggleLoop,
    toggleShuffle,
    next,
    previous,
  }

  return { state, controls, metadata }
}
