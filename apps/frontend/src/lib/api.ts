import type {
  File,
  Folder,
  Share,
  ShareSettings,
  Album,
  AlbumFile,
  User,
  TranscodeJob,
  VideoTrack,
  Subtitle,
} from '@petrel/shared'

const API_BASE = import.meta.env.VITE_API_BASE ?? '/api'

/**
 * Standard API response shape from Petrel backend
 */
export interface ApiResponse<T> {
  data: T | null
  error: string | null
}

/**
 * Pagination metadata returned by list endpoints
 */
export interface PaginatedResponse<T> {
  data: {
    items: T[]
    total: number
    page: number
    limit: number
    hasMore: boolean
  } | null
  error: string | null
}

/**
 * API client for Petrel backend
 */
class ApiClient {
  private accessToken: string | null = null

  setAccessToken(token: string | null): void {
    this.accessToken = token
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...options.headers,
    }

    if (this.accessToken) {
      ;(headers as Record<string, string>)['Authorization'] = `Bearer ${this.accessToken}`
    }

    const response = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers,
    })

    const result = await response.json()

    if (result.error) {
      throw new Error(result.error)
    }

    return result.data
  }

  // Auth endpoints - these don't use the standard { data, error } wrapper
  async login(username: string, password: string): Promise<{ accessToken: string; refreshToken: string; user: User }> {
    const response = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    })

    // Handle non-JSON responses (e.g., rate limit)
    const contentType = response.headers.get('content-type')
    if (!contentType?.includes('application/json')) {
      const text = await response.text()
      throw new Error(text || `HTTP ${response.status}`)
    }

    const result = await response.json()

    // Backend returns { success: false, message: '...' } on failure
    if (!result?.accessToken || !result?.refreshToken || !result?.user) {
      throw new Error(result?.message || 'Login failed')
    }

    return result
  }

  async logout(refreshToken: string): Promise<void> {
    await fetch(`${API_BASE}/auth/logout`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(this.accessToken && { Authorization: `Bearer ${this.accessToken}` }),
      },
      body: JSON.stringify({ refreshToken }),
    })
  }

  async refreshToken(refreshToken: string): Promise<{ accessToken: string; refreshToken: string }> {
    const response = await fetch(`${API_BASE}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    })

    // Handle non-JSON responses (e.g., rate limit)
    const contentType = response.headers.get('content-type')
    if (!contentType?.includes('application/json')) {
      const text = await response.text()
      throw new Error(text || `HTTP ${response.status}`)
    }

    const result = await response.json()

    // Backend returns { success: false, message: '...' } on failure
    if (!result?.accessToken || !result?.refreshToken) {
      throw new Error(result?.message || 'Token refresh failed')
    }

    return result
  }

  async getCurrentUser(): Promise<User> {
    return this.request('/auth/me')
  }

  // Files endpoints
  async getFiles(params?: {
    folderId?: number
    page?: number
    limit?: number
    sort?: 'name' | 'date' | 'size' | 'type'
    order?: 'asc' | 'desc'
    search?: string
  }): Promise<{ items: Array<File | Folder>; total: number; page: number; limit: number; hasMore: boolean }> {
    const searchParams = new URLSearchParams()
    if (params?.folderId) searchParams.set('folderId', String(params.folderId))
    if (params?.page) searchParams.set('page', String(params.page))
    if (params?.limit) searchParams.set('limit', String(params.limit))
    if (params?.sort) searchParams.set('sort', params.sort)
    if (params?.order) searchParams.set('order', params.order)
    if (params?.search) searchParams.set('search', params.search)

    const query = searchParams.toString()
    return this.request(`/files${query ? `?${query}` : ''}`)
  }

  async getFile(id: number): Promise<File> {
    return this.request(`/files/${id}`)
  }

  async uploadFile(
    file: globalThis.File,
    folderId?: number,
    onProgress?: (progress: number) => void
  ): Promise<File> {
    // Generate a unique upload ID
    const uploadId = `${Date.now()}-${Math.random().toString(36).substring(7)}`
    
    // For now, send as single chunk (totalChunks = 1, chunkIndex = 0)
    const formData = new FormData()
    formData.append('uploadId', uploadId)
    formData.append('chunkIndex', '0')
    formData.append('totalChunks', '1')
    formData.append('fileName', file.name)
    formData.append('mimeType', file.type)
    formData.append('size', String(file.size))
    formData.append('chunk', file)
    if (folderId) formData.append('path', String(folderId))

    // Use XHR for progress tracking
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest()
      xhr.open('POST', `${API_BASE}/files/upload`)
      
      if (this.accessToken) {
        xhr.setRequestHeader('Authorization', `Bearer ${this.accessToken}`)
      }

      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable && onProgress) {
          onProgress((event.loaded / event.total) * 100)
        }
      }

      xhr.onload = () => {
        try {
          const result = JSON.parse(xhr.responseText)
          if (result.error) {
            reject(new Error(result.error))
          } else {
            resolve(result.data)
          }
        } catch {
          reject(new Error('Failed to parse upload response'))
        }
      }

      xhr.onerror = () => reject(new Error('Upload failed'))
      xhr.send(formData)
    })
  }

  async deleteFile(id: number): Promise<void> {
    return this.request(`/files/${id}`, { method: 'DELETE' })
  }

  async updateFile(id: number, data: { name?: string; folderId?: number }): Promise<File> {
    return this.request(`/files/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    })
  }

  async createFolder(name: string, parentId?: number): Promise<Folder> {
    return this.request('/folders', {
      method: 'POST',
      body: JSON.stringify({ name, parentId }),
    })
  }

  getDownloadUrl(id: number): string {
    return `${API_BASE}/files/${id}/download`
  }

  getThumbnailUrl(id: number, size: 'small' | 'medium' | 'large' = 'medium'): string {
    return `${API_BASE}/files/${id}/thumbnail?size=${size}`
  }

  getSpriteUrl(id: number): string {
    return `${API_BASE}/files/${id}/sprite`
  }

  // Shares endpoints
  async createShare(data: {
    type: 'file' | 'folder' | 'album'
    targetId: number
    expiresAt?: string
    password?: string
    allowDownload?: boolean
    allowZip?: boolean
    showMetadata?: boolean
  }): Promise<Share & ShareSettings> {
    return this.request('/shares', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  async getShare(token: string, password?: string): Promise<{
    share: Share & ShareSettings
    content: File | Folder | Album
    files?: File[]
  }> {
    const params = password ? `?password=${encodeURIComponent(password)}` : ''
    return this.request(`/shares/${token}${params}`)
  }

  async updateShare(
    id: number,
    data: { expiresAt?: string; password?: string; allowDownload?: boolean; allowZip?: boolean }
  ): Promise<Share> {
    return this.request(`/shares/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    })
  }

  async deleteShare(id: number): Promise<void> {
    return this.request(`/shares/${id}`, { method: 'DELETE' })
  }

  async getMyShares(): Promise<Array<Share & ShareSettings & { content: File | Folder | Album }>> {
    return this.request('/shares')
  }

  // Albums endpoints
  async createAlbum(data: { name: string; description?: string }): Promise<Album> {
    return this.request('/albums', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  async getAlbum(id: number): Promise<Album & { files: Array<File & { sortOrder: number }> }> {
    return this.request(`/albums/${id}`)
  }

  async updateAlbum(id: number, data: { name?: string; description?: string; coverFileId?: number }): Promise<Album> {
    return this.request(`/albums/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    })
  }

  async deleteAlbum(id: number): Promise<void> {
    return this.request(`/albums/${id}`, { method: 'DELETE' })
  }

  async addFilesToAlbum(albumId: number, fileIds: number[]): Promise<AlbumFile[]> {
    return this.request(`/albums/${albumId}/files`, {
      method: 'POST',
      body: JSON.stringify({ fileIds }),
    })
  }

  async removeFileFromAlbum(albumId: number, fileId: number): Promise<void> {
    return this.request(`/albums/${albumId}/files/${fileId}`, { method: 'DELETE' })
  }

  async reorderAlbumFiles(albumId: number, fileIds: number[]): Promise<void> {
    return this.request(`/albums/${albumId}/reorder`, {
      method: 'PATCH',
      body: JSON.stringify({ fileIds }),
    })
  }

  async getAlbums(): Promise<Album[]> {
    return this.request('/albums')
  }

  // Stream endpoints
  async getStreamInfo(fileId: number): Promise<{
    ready: boolean
    qualities: string[]
    audioTracks: VideoTrack[]
    subtitles: Subtitle[]
    transcodeJob?: TranscodeJob
  }> {
    return this.request(`/stream/${fileId}`)
  }

  async prepareStream(fileId: number): Promise<{ jobId?: number; ready: boolean }> {
    return this.request(`/stream/${fileId}/prepare`, { method: 'POST' })
  }

  getMasterPlaylistUrl(fileId: number): string {
    return `${API_BASE}/stream/${fileId}/master.m3u8`
  }
}

export const api = new ApiClient()
