import type { File, AudioMetadata } from '@petrel/shared'

export interface AudioPlayerProps {
  file: File
  className?: string
  autoPlay?: boolean
  onEnded?: () => void
}

export interface PlaylistProps {
  files: File[]
  currentIndex: number
  isPlaying: boolean
  onTrackSelect: (index: number) => void
  className?: string
}

export interface AudioPlayerState {
  isPlaying: boolean
  isLoading: boolean
  currentTime: number
  duration: number
  volume: number
  isMuted: boolean
  isLooped: boolean
  isShuffled: boolean
  supportsScrubbing: boolean
  scrubbingMessage: string | null
}

export interface AudioControls {
  play: () => void
  pause: () => void
  togglePlay: () => void
  seek: (time: number) => void
  setVolume: (volume: number) => void
  toggleMute: () => void
  toggleLoop: () => void
  toggleShuffle: () => void
  next: () => void
  previous: () => void
}

export interface UseAudioPlayerReturn {
  state: AudioPlayerState
  controls: AudioControls
  metadata: AudioMetadata | undefined
}
