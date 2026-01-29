import type { VideoTrack, Subtitle, TranscodeJob } from '@petrel/shared'

export interface VideoPlayerProps {
  src: string
  fileId: number
  poster?: string
  className?: string
  autoPlay?: boolean
  onEnded?: () => void
  onError?: (error: Error) => void
}

export interface VideoPlayerState {
  isPlaying: boolean
  isPaused: boolean
  isBuffering: boolean
  isMuted: boolean
  isFullscreen: boolean
  currentTime: number
  duration: number
  buffered: number
  volume: number
  playbackRate: number
  quality: string
  availableQualities: string[]
  audioTrack: number
  audioTracks: VideoTrack[]
  subtitleTrack: number
  subtitles: Subtitle[]
  transcodeJob?: TranscodeJob
  error: string | null
}

export interface VideoControls {
  play: () => void
  pause: () => void
  togglePlay: () => void
  seek: (time: number) => void
  seekRelative: (delta: number) => void
  setVolume: (volume: number) => void
  toggleMute: () => void
  setPlaybackRate: (rate: number) => void
  setQuality: (quality: string) => void
  setAudioTrack: (index: number) => void
  setSubtitleTrack: (index: number) => void
  toggleFullscreen: () => void
}

export interface UseVideoPlayerReturn {
  state: VideoPlayerState
  controls: VideoControls
  videoRef: React.RefObject<HTMLVideoElement | null>
}
