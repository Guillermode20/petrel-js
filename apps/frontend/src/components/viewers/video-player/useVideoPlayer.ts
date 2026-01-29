import { useState, useRef, useEffect, useCallback } from 'react'
import Hls from 'hls.js'
import type { VideoTrack, Subtitle, TranscodeJob } from '@petrel/shared'
import type { VideoPlayerState, VideoControls, UseVideoPlayerReturn } from './types'

const STORAGE_KEY_PREFIX = 'petrel_video_'

interface UseVideoPlayerOptions {
  src: string
  fileId: number
  audioTracks?: VideoTrack[]
  subtitles?: Subtitle[]
  transcodeJob?: TranscodeJob
  autoPlay?: boolean
}

/**
 * Hook for managing video player state with HLS.js integration
 */
export function useVideoPlayer({
  src,
  fileId,
  audioTracks = [],
  subtitles = [],
  transcodeJob,
  autoPlay = false,
}: UseVideoPlayerOptions): UseVideoPlayerReturn {
  const videoRef = useRef<HTMLVideoElement>(null)
  const hlsRef = useRef<Hls | null>(null)
  const containerRef = useRef<HTMLDivElement | null>(null)

  const [state, setState] = useState<VideoPlayerState>({
    isPlaying: false,
    isPaused: true,
    isBuffering: false,
    isMuted: false,
    isFullscreen: false,
    currentTime: 0,
    duration: 0,
    buffered: 0,
    volume: 1,
    playbackRate: 1,
    quality: 'auto',
    availableQualities: ['auto'],
    audioTrack: 0,
    audioTracks,
    subtitleTrack: -1,
    subtitles,
    transcodeJob,
    error: null,
  })

  // Initialize HLS.js
  useEffect(() => {
    const video = videoRef.current
    if (!video || !src) return

    // Restore saved position
    const savedPosition = localStorage.getItem(`${STORAGE_KEY_PREFIX}${fileId}`)
    const startPosition = savedPosition ? parseFloat(savedPosition) : 0

    if (Hls.isSupported()) {
      const hls = new Hls({
        startPosition,
        enableWorker: true,
        lowLatencyMode: false,
      })

      hls.loadSource(src)
      hls.attachMedia(video)

      hls.on(Hls.Events.MANIFEST_PARSED, (_event, data) => {
        const qualities = ['auto', ...data.levels.map((l) => `${l.height}p`)]
        setState((prev) => ({ ...prev, availableQualities: qualities }))
        if (autoPlay) {
          video.play().catch(() => {
            // Autoplay blocked
          })
        }
      })

      hls.on(Hls.Events.LEVEL_SWITCHED, (_event, data) => {
        const quality = data.level === -1 ? 'auto' : `${hls.levels[data.level].height}p`
        setState((prev) => ({ ...prev, quality }))
      })

      hls.on(Hls.Events.ERROR, (_event, data) => {
        if (data.fatal) {
          setState((prev) => ({ ...prev, error: data.details }))
        }
      })

      hlsRef.current = hls

      return () => {
        hls.destroy()
        hlsRef.current = null
      }
    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
      // Native HLS support (Safari)
      video.src = src
      if (startPosition > 0) {
        video.currentTime = startPosition
      }
      if (autoPlay) {
        video.play().catch(() => {
          // Autoplay blocked
        })
      }
    }
  }, [src, fileId, autoPlay])

  // Update state from video events
  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    const handlers = {
      play: () => setState((prev) => ({ ...prev, isPlaying: true, isPaused: false })),
      pause: () => setState((prev) => ({ ...prev, isPlaying: false, isPaused: true })),
      waiting: () => setState((prev) => ({ ...prev, isBuffering: true })),
      playing: () => setState((prev) => ({ ...prev, isBuffering: false })),
      timeupdate: () => {
        setState((prev) => ({ ...prev, currentTime: video.currentTime }))
        // Save position every 5 seconds
        if (Math.floor(video.currentTime) % 5 === 0) {
          localStorage.setItem(`${STORAGE_KEY_PREFIX}${fileId}`, String(video.currentTime))
        }
      },
      durationchange: () => setState((prev) => ({ ...prev, duration: video.duration })),
      volumechange: () =>
        setState((prev) => ({ ...prev, volume: video.volume, isMuted: video.muted })),
      progress: () => {
        if (video.buffered.length > 0) {
          const buffered = video.buffered.end(video.buffered.length - 1)
          setState((prev) => ({ ...prev, buffered }))
        }
      },
      error: () => setState((prev) => ({ ...prev, error: 'Video playback error' })),
    }

    Object.entries(handlers).forEach(([event, handler]) => {
      video.addEventListener(event, handler)
    })

    return () => {
      Object.entries(handlers).forEach(([event, handler]) => {
        video.removeEventListener(event, handler)
      })
    }
  }, [fileId])

  // Fullscreen change handler
  useEffect(() => {
    const handleFullscreenChange = () => {
      setState((prev) => ({ ...prev, isFullscreen: !!document.fullscreenElement }))
    }
    document.addEventListener('fullscreenchange', handleFullscreenChange)
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange)
  }, [])

  // Controls
  const play = useCallback(() => videoRef.current?.play(), [])
  const pause = useCallback(() => videoRef.current?.pause(), [])
  const togglePlay = useCallback(() => {
    if (videoRef.current?.paused) {
      videoRef.current.play()
    } else {
      videoRef.current?.pause()
    }
  }, [])

  const seek = useCallback((time: number) => {
    if (videoRef.current) {
      videoRef.current.currentTime = Math.max(0, Math.min(time, videoRef.current.duration))
    }
  }, [])

  const seekRelative = useCallback((delta: number) => {
    if (videoRef.current) {
      videoRef.current.currentTime = Math.max(
        0,
        Math.min(videoRef.current.currentTime + delta, videoRef.current.duration)
      )
    }
  }, [])

  const setVolume = useCallback((volume: number) => {
    if (videoRef.current) {
      videoRef.current.volume = Math.max(0, Math.min(1, volume))
      videoRef.current.muted = volume === 0
    }
  }, [])

  const toggleMute = useCallback(() => {
    if (videoRef.current) {
      videoRef.current.muted = !videoRef.current.muted
    }
  }, [])

  const setPlaybackRate = useCallback((rate: number) => {
    if (videoRef.current) {
      videoRef.current.playbackRate = rate
      setState((prev) => ({ ...prev, playbackRate: rate }))
    }
  }, [])

  const setQuality = useCallback((quality: string) => {
    const hls = hlsRef.current
    if (!hls) return

    if (quality === 'auto') {
      hls.currentLevel = -1
    } else {
      const height = parseInt(quality.replace('p', ''), 10)
      const levelIndex = hls.levels.findIndex((l) => l.height === height)
      if (levelIndex !== -1) {
        hls.currentLevel = levelIndex
      }
    }
  }, [])

  const setAudioTrack = useCallback((index: number) => {
    const hls = hlsRef.current
    if (hls && hls.audioTracks.length > index) {
      hls.audioTrack = index
      setState((prev) => ({ ...prev, audioTrack: index }))
    }
  }, [])

  const setSubtitleTrack = useCallback((index: number) => {
    const video = videoRef.current
    if (!video) return

    // Disable all tracks first
    for (let i = 0; i < video.textTracks.length; i++) {
      video.textTracks[i].mode = 'hidden'
    }

    // Enable selected track
    if (index >= 0 && video.textTracks[index]) {
      video.textTracks[index].mode = 'showing'
    }

    setState((prev) => ({ ...prev, subtitleTrack: index }))
  }, [])

  const toggleFullscreen = useCallback(() => {
    const container = containerRef.current ?? videoRef.current?.parentElement
    if (!container) return

    if (document.fullscreenElement) {
      document.exitFullscreen()
    } else {
      container.requestFullscreen()
    }
  }, [])

  const controls: VideoControls = {
    play,
    pause,
    togglePlay,
    seek,
    seekRelative,
    setVolume,
    toggleMute,
    setPlaybackRate,
    setQuality,
    setAudioTrack,
    setSubtitleTrack,
    toggleFullscreen,
  }

  return { state, controls, videoRef }
}
