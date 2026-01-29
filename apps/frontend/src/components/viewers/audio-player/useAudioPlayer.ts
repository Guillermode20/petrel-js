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

  const [state, setState] = useState<AudioPlayerState>({
    isPlaying: false,
    isLoading: true,
    currentTime: 0,
    duration: 0,
    volume: 1,
    isMuted: false,
    isLooped: false,
    isShuffled: false,
  })

  const metadata = file.metadata as AudioMetadata | undefined

  // Initialize Howl instance
  useEffect(() => {
    const src = api.getDownloadUrl(file.id)

    const howl = new Howl({
      src: [src],
      html5: true, // Streaming for large files
      autoplay: autoPlay,
      volume: state.volume,
      loop: state.isLooped,
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
  }, [file.id, autoPlay])

  // Update loop state when it changes
  useEffect(() => {
    howlRef.current?.loop(state.isLooped)
  }, [state.isLooped])

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
    howlRef.current?.seek(time)
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
