# Petrel: The Fileserver Made For Sharing

> A fileserver built for simplicity with a focus on effortless sharing of videos and photo albums.

**Stack:** TanStack Start · Elysia.js · SQLite · Tailwind · shadcn/ui · Monospace aesthetic

---

## Phase 1: Project Foundation

### Environment Setup
- [x] Configure Tailwind CSS with monospace font defaults (`font-mono` as base)
- [x] Set up shadcn/ui with custom theme (muted colours, terminal-inspired)
- [x] Configure SQLite with Drizzle ORM (or similar)
- [x] Add development hot-reload for both frontend and backend
- [x] Strip frontend of all default TanStack Start components and replace with basic shadcn components
- [ ] Install approved libraries: hls.js, howler, sharp, exifr, music-metadata, pdf.js, shiki, date-fns
- [ ] Set up `packages/shared` for shared types between frontend and backend

### Database Schema Design
- [x] `users` table (id, username, password_hash, role, created_at)
- [x] `files` table (id, name, path, size, mime_type, hash, uploaded_by, created_at, metadata JSON for ffprobe data)
- [x] `folders` table (id, name, path, parent_id, owner_id)
- [x] `shares` table (id, type, target_id, token, expires_at, password_hash, download_count, view_count, allow_download, allow_zip, show_metadata)
- [x] `albums` table (id, name, description, cover_file_id, owner_id, created_at)
- [x] `album_files` junction table (album_id, file_id, sort_order)
- [ ] `transcode_jobs` table (id, file_id, status, progress, output_path, created_at, completed_at)
- [ ] `video_tracks` table (file_id, track_type, codec, language, index)
- [ ] `subtitles` table (file_id, language, path, format)

---

## Phase 2: Core Backend (Elysia.js)

### Authentication
- [x] JWT-based authentication with refresh tokens (JWT plugin installed)
- [x] Login/logout endpoints
- [ ] Optional: guest/anonymous access mode
- [x] Rate limiting on auth endpoints

### File Operations API
- [x] `GET /api/hello` - basic health check endpoint
- [ ] `GET /api/files` - list files/folders with pagination
- [ ] `GET /api/files/:id` - get file metadata
- [ ] `GET /api/files/:id/download` - stream file download
- [ ] `POST /api/files/upload` - chunked upload support
- [ ] `DELETE /api/files/:id` - delete file
- [ ] `PATCH /api/files/:id` - rename/move file
- [ ] `POST /api/folders` - create folder

### Video Pipeline (Backend) — 2-3 weeks estimated
- [ ] **Metadata extraction service** — ffprobe probes file for:
  - Duration, resolution, codecs
  - Audio tracks (language, codec, channels)
  - Embedded subtitles
  - Video codec detection (h264/h265/vp9/av1)
- [ ] **Thumbnail generation service** — sharp + ffmpeg:
  - Frame at ~10% duration for preview card
  - Sprite sheet generation for scrubbing (video hover previews)
- [ ] **Transcode assessment logic**:
  - Check if web-compatible (h264/h265/vp9 + aac/opus = transmux)
  - Non-compatible = queue transcode job
- [ ] **HLS transmux-on-demand** — for web-compatible MKVs:
  - Segment generation without re-encoding
  - Master playlist with quality variants
- [ ] **Background transcode queue** — for non-compatible files:
  - Queue job with Bull/BullMQ
  - Progress tracking (0-100%)
  - Multiple quality levels (1080p, 720p, 480p)
  - Cache segments to avoid re-processing
- [ ] **Subtitle extraction** — MKV embedded subs → WebVTT
- [ ] `GET /api/stream/:fileId/master.m3u8` — HLS manifest endpoint
- [ ] `GET /api/stream/:fileId/:segment.ts` — HLS segment endpoint
- [ ] `GET /api/files/:id/thumbnail` — thumbnail serving
- [ ] `GET /api/files/:id/sprite` — thumbnail sprite for scrubbing

### Audio Pipeline (Backend)
- [ ] **Audio metadata extraction** — music-metadata for:
  - ID3 tags (title, artist, album)
  - Album art extraction
  - Duration calculation
- [ ] Waveform data generation (optional)

### Image Pipeline (Backend)
- [ ] **Thumbnail generation** — sharp for:
  - Multiple sizes (small, medium, large)
  - Blur-up placeholder generation
- [ ] **EXIF extraction** — exifr for:
  - Camera info (make, model, lens)
  - Location (GPS coordinates)
  - Date taken, exposure settings

### Sharing API
- [ ] `POST /api/shares` — create share link with options:
  - Expiry: 1h, 24h, 7d, 30d, never
  - Password protection (optional)
  - Allow download toggle
  - Quality options (if transcoded)
- [ ] `GET /api/shares/:token` — get shared content (public)
  - Token validation (expiry, password)
  - Increment view counter
- [ ] `DELETE /api/shares/:id` — revoke share
- [ ] `PATCH /api/shares/:id` — update expiry/password
- [ ] View/download analytics per share

### Albums API
- [ ] `POST /api/albums` - create album
- [ ] `GET /api/albums/:id` - get album with files
- [ ] `PATCH /api/albums/:id` - update album metadata
- [ ] `POST /api/albums/:id/files` - add files to album
- [ ] `DELETE /api/albums/:id/files/:fileId` - remove from album
- [ ] `PATCH /api/albums/:id/reorder` - drag-and-drop reordering (sort_order)

---

## Phase 3: Core Frontend (TanStack Start)

### Layout & Navigation
- [x] Root layout with monospace typography
- [x] Header component with navigation
- [ ] Sidebar navigation (Files, Albums, Shares, Settings)
- [ ] Breadcrumb navigation for folder hierarchy
- [ ] Mobile-responsive drawer navigation
- [x] Dark mode by default (terminal aesthetic)

### File Browser
- [ ] Grid view (thumbnails) and list view toggle
- [ ] File/folder icons with mime-type awareness
- [ ] Context menu (right-click actions)
- [ ] Multi-select with shift/ctrl+click
- [ ] Drag-and-drop upload zone
- [ ] Upload progress indicator with cancel option
- [ ] Search/filter bar
- [ ] Sort by name/date/size/type

### Video Player — Custom build on hls.js
**Why hls.js directly (not Video.js/Plyr):**
- Full control over terminal aesthetic
- No fighting external CSS
- Custom features styled your way

- [ ] `VideoPlayer` component with hidden native controls
- [ ] `useVideoPlayer` hook for state management:
  - Play/pause state
  - Current time / duration
  - Volume control
  - Quality switching via hls.js API
  - Audio track switching
  - Subtitle track switching
- [ ] `VideoControls` component:
  - Play/pause button
  - Time display (00:24:51 / 01:42:30)
  - Seek slider with thumbnail preview (from sprite)
  - Volume slider
  - Audio track dropdown (multi-audio MKVs)
  - Subtitle dropdown (WebVTT tracks)
  - Quality selector (auto, 1080p, 720p, 480p)
  - Fullscreen button
- [ ] Keyboard shortcuts:
  - Space: play/pause
  - Arrow keys: seek +/- 5s
  - F: fullscreen
  - M: mute
- [ ] Loading/buffering states
- [ ] Transcode progress overlay (if processing)

### Photo Gallery — Custom lightbox
**Why custom (not off-the-shelf):** No gallery fits monospace aesthetic

- [ ] `AlbumGallery` grid view:
  - Masonry or grid layout toggle
  - Lazy-loaded thumbnails with blur-up
- [ ] `Lightbox` component:
  - Full image display
  - Zoom/pan with CSS transforms
  - EXIF metadata display (camera, lens, location, date)
  - Navigation arrows (← →)
  - Keyboard navigation (arrows, escape)
- [ ] `AlbumInfo` panel:
  - Total size, image count
  - Location map for geotagged photos
  - Date range
- [ ] Slideshow mode with configurable interval
- [ ] Pinch-to-zoom on mobile
- [ ] Download individual or ZIP all

### Audio Player — Howler.js based
**Why Howler.js (not native audio):** Gapless playback, Web Audio abstraction, consistent API

- [ ] `AudioPlayer` component:
  - Album art display
  - Track info (title, artist, album)
  - Play/pause, prev/next controls
  - Seek slider with current time / duration
  - Volume control
- [ ] `Playlist` component:
  - Track list with current indicator
  - Shuffle/repeat toggles
  - Track selection
- [ ] Waveform visualization (optional toggle)
- [ ] Keyboard shortcuts (space, n, p, arrows)
- [ ] Media Session API for lock screen controls

### Document Viewer
- [ ] **PDF viewer** — pdf.js integration
  - Page navigation
  - Zoom controls
- [ ] **Text/Code viewer** — shiki syntax highlighting
- [ ] **Markdown viewer** — rendered preview

### File Preview (Unified)
- [ ] `FilePreview` router component — detects mime type and renders:
  - Video → `VideoPlayer`
  - Audio → `AudioPlayer`
  - Image → `ImageViewer` (single)
  - PDF → `PDFViewer`
  - Text/Code → `CodeViewer`
  - Other → `DownloadPrompt`
- [ ] Keyboard navigation (arrow keys for next/prev in folder)

### Sharing UI
- [x] "Create share" button in UI
- [x] Share management UI with sample data
- [ ] `CreateShareModal` component:
  - Expiry dropdown (1h, 24h, 7d, 30d, never)
  - Password protection toggle + input
  - Allow download toggle
  - Quality options (if transcoded)
- [ ] Copy link button with toast confirmation
- [ ] QR code generation for share links
- [ ] `ShareManagement` table (active shares):
  - Link, expiry countdown, view/download counts
  - Revoke action

### Albums UI
- [x] Album UI with sample data
- [ ] `AlbumGrid` view with cover images
- [ ] `AlbumDetail` view (masonry/grid layout)
- [ ] "Add to album" action from file browser
- [ ] Album slideshow mode
- [ ] Album share (entire album as one link)

---

## Phase 4: Public Share Views

### Shared File View (`/s/:token`)
- [ ] `ShareLayout` — clean, minimal wrapper
- [ ] Password entry form (if protected)
- [ ] `SmartViewer` — detects content type:
  ```typescript
  switch (type) {
    case 'video': return <VideoPlayer />
    case 'audio': return <AudioPlayer />
    case 'image': return <ImageViewer />
    case 'pdf': return <PDFViewer />
    case 'text': return <CodeViewer />
    default: return <DownloadPrompt />
  }
  ```
- [ ] Download button (if permitted)
- [ ] Expiry warning banner
- [ ] "Powered by Petrel" subtle footer

### Shared Album View (`/s/:token` for albums)
- [ ] Gallery grid layout (same as internal)
- [ ] Lightbox viewer for individual images
- [ ] Video playback inline (in gallery)
- [ ] "Download all as ZIP" button (if permitted)
- [ ] Slideshow auto-play option

### Shared Folder View (`/s/:token` for folders)
- [ ] File listing with folder navigation
- [ ] Smart defaults:
  - All images → render as `AlbumGallery`
  - All audio → render as `AudioPlaylist`
  - Mixed → render as `FolderBrowser`
- [ ] Selective download (checkboxes)
- [ ] Bulk ZIP download

---

## Phase 5: Enhanced Features

### Performance
- [ ] Image lazy loading with blur placeholders
- [ ] Virtual scrolling for large directories
- [ ] Service worker for offline file list caching
- [ ] CDN-friendly headers for static assets
- [ ] Database query optimisation (indexes)

### Video Streaming Enhancements
- [ ] Resume playback position (stored in localStorage)
- [ ] External subtitle support (.vtt, .srt, .ass upload)
- [ ] Playback speed control (0.5x - 2x)
- [ ] Picture-in-picture support

### Photo Album Enhancements
- [ ] Map view for geotagged photos (leaflet/maplibre)
- [ ] Date-based auto-organisation
- [ ] Face detection grouping (stretch goal)

### Admin Features
- [ ] User management panel
- [ ] Storage quota per user
- [ ] Activity/audit log
- [ ] Bulk operations (delete, move)
- [ ] Server health dashboard

---

## Phase 6: Polish & Deployment

### Aesthetic Refinements
- [x] Custom monospace font (JetBrains Mono / IBM Plex Mono)
- [ ] Subtle scan-line or CRT effect (optional, toggle)
- [ ] ASCII art logo in terminal style
- [ ] Loading states with terminal-style spinners
- [ ] Toast notifications styled as terminal output

### Accessibility
- [ ] Keyboard navigation throughout
- [ ] ARIA labels on interactive elements
- [ ] Focus indicators
- [ ] Screen reader testing

### Deployment
- [ ] Dockerfile with multi-stage build
- [ ] Docker Compose with volume mounts
- [ ] Environment variable configuration
- [ ] Reverse proxy example configs (nginx, Caddy)
- [ ] Systemd service file
- [x] Health check endpoint (`/api/hello`)

### Documentation
- [ ] README with quickstart
- [ ] Configuration reference
- [x] API documentation (Swagger/OpenAPI via Elysia)
- [ ] Self-hosting guide
- [ ] Contributing guidelines

---

## Why Petrel Beats Alternatives

| Alternative | Problem | Petrel Solution |
|-------------|---------|-----------------|
| Google Drive/Dropbox | Transcode to garbage quality, strip subtitles | Preserve quality, keep all tracks |
| Raw nginx serving | Force full download, no subtitle/seek | HLS streaming, full media support |
| Plex/Jellyfin | Overkill for sharing, media server focused | Sharing-first, public links |
| copyparty | Minimal player, basic streaming | HLS, subtitle extraction, audio switching, scrubbing |

---

## Timeline Estimates (AI-Assisted)

| Phase | Time | Notes |
|-------|------|-------|
| Project setup, auth, basic CRUD | 1 week | AI excels at boilerplate |
| File browser, upload flow | 1 week | Fiddly state management |
| **Video pipeline** | **2-3 weeks** | **Hardest part - ffmpeg flags, HLS, codec edge cases** |
| Photo albums, gallery | 1 week | Easier than video |
| Audio player, playlists | 1 week | Howler simplifies this |
| Sharing system | 1 week | Mostly CRUD + auth |
| Polish, mobile, a11y | 1-2 weeks | Death by a thousand cuts |

**Total:** 8-12 weeks evenings/weekends, or 4-6 weeks full-time

**Reality check:** AI writes ~60-70% of code. You'll spend time debugging AI mistakes, refactoring slop, handling edge cases. Think: fast but careless junior dev.

---

## Backlog / Future Ideas

- [ ] WebDAV support for native file manager integration
- [ ] S3-compatible backend storage option
- [ ] End-to-end encryption for sensitive shares
- [ ] Collaborative albums (multiple contributors)
- [ ] Comments/reactions on shared content
- [ ] Telegram/Discord bot for upload notifications
- [ ] Plugin/extension system
- [ ] CLI tool for headless uploads

---

## Notes

```
┌─────────────────────────────────────────┐
│  PETREL v0.1.0                          │
│  ─────────────────────────────────────  │
│  > files loaded: 2,847                  │
│  > shares active: 12                    │
│  > storage used: 48.2 GB                │
│                                         │
│  [browse] [upload] [share] [settings]   │
└─────────────────────────────────────────┘
```

*Design inspiration: copyparty's simplicity, terminal aesthetics, no-nonsense file serving*
