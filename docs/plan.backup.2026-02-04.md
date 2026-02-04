# Petrel: The Fileserver Made For Sharing

> A fileserver built for simplicity with a focus on effortless sharing of videos and photos.

**Stack:** TanStack Start · Elysia.js · SQLite · Tailwind · shadcn/ui · Monospace aesthetic

---

## Phase 1: Project Foundation

### Environment Setup
- [x] Configure Tailwind CSS with monospace font defaults (`font-mono` as base)
- [x] Set up shadcn/ui with custom theme (muted colours, terminal-inspired)
- [x] Configure SQLite with Drizzle ORM
- [x] Add development hot-reload for both frontend and backend
- [x] Strip frontend of default TanStack Start components and replace with shadcn components
- [x] Install approved libraries: hls.js, howler, sharp, exifr, music-metadata, pdf.js, shiki, date-fns
- [x] Set up `packages/shared` for shared types between frontend and backend

### Database Schema Design (11 Tables)
- [x] `users` table (id, username, passwordHash, role, createdAt)
- [x] `refreshTokens` table (id, userId, tokenHash, expiresAt, createdAt, revokedAt)
- [x] `files` table (id, name, path, size, mimeType, hash, uploadedBy, parentId, thumbnailPath, metadata, createdAt)
- [x] `folders` table (id, name, path, parentId, ownerId)
- [x] `shares` table (id, type, targetId, token, createdBy, expiresAt, passwordHash, downloadCount, viewCount, createdAt)
- [x] `shareSettings` table (shareId, allowDownload, allowZip, showMetadata)
- [x] `transcodeJobs` table (id, fileId, status, progress, outputPath, createdAt, completedAt, error)
- [x] `videoTracks` table (id, fileId, trackType, codec, language, index, title)
- [x] `subtitles` table (id, fileId, language, path, format, title)
- [x] `zipJobs` table (id, jobId, status, progress, tempPath, error, fileIds, folderIds, shareToken, userId, totalSize, fileCount, createdAt, completedAt, downloadedAt)
- [x] `userSettings` table (id, userId, settings JSON, updatedAt)

---

## Phase 2: Core Backend (Elysia.js)

### Authentication
- [x] JWT-based authentication with refresh tokens
- [x] Login/logout endpoints (`/api/auth/login`, `/api/auth/logout`)
- [x] Token refresh endpoint (`/api/auth/refresh`)
- [x] Rate limiting on auth endpoints (5 attempts per 15 min per IP)
- [ ] ~~Optional: guest/anonymous access mode~~ **NOT IMPLEMENTED** - Only share tokens provide public access

### File Operations API
- [x] `GET /api/hello` - basic health check endpoint
- [x] `GET /api/files` - list files/folders with pagination
- [x] `GET /api/files/:id` - get file metadata
- [x] `GET /api/files/:id/download` - stream file download
- [x] `POST /api/files/upload` - chunked upload support
- [x] `DELETE /api/files/:id` - delete file
- [x] `PATCH /api/files/:id` - rename/move file
- [x] `POST /api/folders` - create folder

### Video Pipeline (Backend)
- [x] **Metadata extraction service** — ffprobe probes file for:
  - Duration, resolution, codecs
  - Audio tracks (language, codec, channels)
  - Embedded subtitles
  - Video codec detection (h264/h265/vp9/av1)
- [x] **Thumbnail generation service** — sharp + ffmpeg:
  - Frame at ~10% duration for preview card
  - Sprite sheet generation for scrubbing
- [x] **Transcode assessment logic**:
  - Check if web-compatible (h264/h265/vp9 + aac = transmux)
  - Non-compatible = queue transcode job
- [x] **HLS transmux-on-demand** — for web-compatible MKVs:
  - Segment generation without re-encoding
  - Master playlist with quality variants
- [x] **Background transcode queue** — BullMQ-based:
  - Queue job with progress tracking (0-100%)
  - Multiple quality levels (1080p, 720p, 480p)
  - Parallel processing with configurable concurrency
  - Cache segments to avoid re-processing
- [x] **Subtitle extraction** — MKV embedded subs → WebVTT
- [x] `GET /api/stream/:fileId/master.m3u8` — HLS manifest endpoint
- [x] `GET /api/stream/:fileId/:playlist` — HLS quality playlist or segment
- [x] `GET /api/files/:id/thumbnail` — thumbnail serving
- [x] `GET /api/files/:id/sprite` — thumbnail sprite for scrubbing

### Audio Pipeline (Backend)
- [x] **Audio metadata extraction** — music-metadata for:
  - ID3 tags (title, artist, album)
  - Album art extraction
  - Duration calculation
- [x] **Waveform data generation** — FFmpeg-based (PNG + JSON data)
- [x] **Range-aware audio streaming** — `/api/audio/:id/stream`:
  - HEAD endpoint returns Accept-Ranges, Content-Length
  - GET with Range header support (206 Partial Content)
  - Authenticated + share-token flows supported
- [ ] ~~FLAC → Opus transcoding~~ **NOT IMPLEMENTED** - Only video transcoding exists

### Image Pipeline (Backend)
- [x] **Thumbnail generation** — sharp for multiple sizes
- [x] **EXIF extraction** — exifr for camera info, GPS, exposure settings

### Sharing API
- [x] `POST /api/shares` — create share link with options:
  - Expiry: 1h, 24h, 7d, 30d, never
  - Password protection (optional)
  - Allow download toggle
  - Quality options (if transcoded)
- [x] `GET /api/shares/:token` — get shared content (public)
  - Token validation (expiry, password)
  - Increment view counter
- [x] `DELETE /api/shares/:id` — revoke share
- [x] `PATCH /api/shares/:id` — update expiry/password
- [x] View/download analytics per share
- [x] ZIP download for folders (`/api/shares/:token/download-zip`)

### Phase 2 Review Recommendations - Implementation Status

#### High Priority
- [x] **JWT Secret Management** - Environment-based configuration
- [x] **Refresh Token Persistence** - Database storage via `refreshTokens` table
- [x] **Structured Logging** - Pino logger implemented
- [ ] **Test Coverage** - Infrastructure exists (`tests/` directory) but **NO ACTUAL TESTS WRITTEN**

#### Medium Priority
- [x] **Concurrency Control** - Parallel transcode processing with BullMQ workers
- [x] **Caching Layer** - Redis integration with cache decorators
- [x] **Documentation** - JSDoc comments on services
- [ ] ~~Extended Rate Limiting~~ **PARTIAL** - Only auth login has rate limiting; upload/stream/share endpoints not rate limited

#### Low Priority
- [x] **Code Refactoring** - Functions under 50 lines
- [x] **Configuration Validation** - Zod schema validation
- [x] **API Documentation** - Swagger/OpenAPI via `@elysiajs/swagger` at `/docs`

---

## Phase 3: Core Frontend (TanStack Start)

### Layout & Navigation
- [x] Root layout with monospace typography
- [x] Header component with navigation
- [x] Sidebar navigation (Files, Shares, Settings)
- [x] Breadcrumb navigation for folder hierarchy
- [x] Mobile-responsive drawer navigation
- [x] Dark mode by default (terminal aesthetic)

### File Browser
- [x] Grid view (thumbnails) and list view toggle
- [x] File/folder icons with mime-type awareness
- [x] Context menu (right-click actions)
- [x] Multi-select with shift/ctrl+click
- [x] Drag-and-drop upload zone
- [x] Upload progress indicator with cancel option
- [x] Search/filter bar
- [x] Sort by name/date/size/type

### Current Worklog
- **2026-01-29:** Frontend TLC pass – fixed Header export policy, aligned file download auth with backend, refreshed Phase 3 checklist.
- **2026-01-30:** Backend share routes refactor – schema + shared types now track `createdBy`/`hasPassword`; `/api/shares` list + public download/content endpoints.
- **2026-02-04:** Audit pass – corrected plan.todo.md to reflect actual implementation status

### Video Player — Custom build on hls.js
- [x] `VideoPlayer` component with hidden native controls
- [x] `useVideoPlayer` hook for state management:
  - Play/pause state
  - Current time / duration
  - Volume control
  - Quality switching via hls.js API
  - Audio track switching
  - Subtitle track switching
- [x] `VideoControls` component:
  - Play/pause button
  - Time display (00:24:51 / 01:42:30)
  - Seek slider with buffered progress
  - Volume slider with mute toggle
  - Audio track dropdown (multi-audio MKVs)
  - Subtitle dropdown (WebVTT tracks)
  - Quality selector (auto, 1080p, 720p, 480p)
  - Fullscreen button
  - Playback speed control (0.5x-2x)
- [x] Keyboard shortcuts:
  - Space: play/pause
  - Arrow keys: seek +/- 5s
  - F: fullscreen
  - M: mute
- [x] Loading/buffering states
- [x] Transcode progress overlay (if processing)

### Photo Gallery — Custom lightbox
- [x] `PhotoGallery` grid view with lazy-loaded thumbnails
- [x] `Lightbox` component:
  - Full image display
  - Zoom/pan with CSS transforms (0.5x - 3x via buttons)
  - EXIF metadata display
  - Navigation arrows (← →)
  - Keyboard navigation (arrows, escape)
- [x] Individual download button in lightbox
- [ ] ~~Slideshow mode~~ **NOT IMPLEMENTED**
- [ ] ~~Pinch-to-zoom on mobile~~ **NOT IMPLEMENTED** - Only button zoom
- [ ] ~~ZIP all download~~ **NOT IMPLEMENTED**

### Audio Player — Howler.js based
- [x] `AudioPlayer` component:
  - Album art display
  - Track info (title, artist, album)
  - Play/pause, prev/next controls
  - Seek slider with current time / duration
  - Volume control
- [x] `Playlist` component:
  - Track list with current indicator
  - Shuffle/repeat toggles
  - Track selection
- [x] Keyboard shortcuts (space, n, p, arrows)
- [x] Media Session API for lock screen controls
- [x] **Range-aware streaming** - Detects Accept-Ranges, shows fallback if unavailable

### Document Viewer
- [x] **PDF viewer** — pdf.js integration with page navigation, zoom (50%-300%), rotation
- [x] **Code viewer** — shiki syntax highlighting with in-place editing
- [x] **Markdown viewer** — react-markdown with GFM, syntax highlighting, in-place editing

### File Preview (Unified)
- [x] `FilePreview` router component — detects mime type and renders appropriate viewer
- [x] Keyboard navigation (arrow keys for next/prev in folder)
- [x] Navigation context preservation

### Sharing UI
- [x] "Create share" button in UI
- [x] Share management UI
- [x] `CreateShareModal` component:
  - Expiry dropdown (1h, 24h, 7d, 30d, never)
  - Password protection toggle + input
  - Allow download toggle
  - Quality options (if transcoded)
- [x] Copy link button with toast confirmation
- [x] QR code generation for share links
- [x] `ShareManagement` table (active shares):
  - Link, expiry countdown, view/download counts
  - Revoke action

---

## Phase 4: Public Share Views

### Shared File View (`/s/:token`)
- [x] `ShareLayout` — clean, minimal wrapper
- [x] Password entry form (if protected)
- [x] `SmartViewer` — detects content type and renders appropriate player
- [x] Download button (if permitted)
- [x] Expiry warning banner
- [x] "Powered by Petrel" subtle footer

### Shared Folder View (`/s/:token` for folders)
- [x] File listing with folder navigation
- [x] Smart defaults:
  - All images → render as `PhotoGallery`
  - All audio → render as `AudioPlaylist`
  - Mixed → render as `FolderBrowser`
- [ ] ~~Selective download (checkboxes)~~ **NOT IMPLEMENTED**
- [x] Bulk ZIP download (via `/api/shares/:token/download-zip`)

---

## Phase 5: Settings Page

### User Settings
- [x] **Profile Management** (partial):
  - [x] Change username/display name
  - [ ] ~~Update password with confirmation~~ **NOT IMPLEMENTED**
  - [ ] ~~Avatar/profile picture upload~~ **NOT IMPLEMENTED**
  - [ ] ~~Default language selection~~ **NOT IMPLEMENTED**
- [ ] ~~Session Management~~ **NOT IMPLEMENTED**:
  - View active sessions/devices
  - Revoke specific sessions
  - "Log out everywhere"

### Playback Preferences
- [ ] ~~Video Settings~~ **NOT IMPLEMENTED**:
  - Default quality preference
  - Autoplay next file toggle
  - Default volume level
  - Subtitle language priority list
  - Audio track language priority list
  - Remember playback position
  - Default playback speed
- [ ] ~~Audio Settings~~ **NOT IMPLEMENTED**:
  - Default volume normalization
  - Gapless playback toggle
  - Visualizer style selection

### Display & Interface
- [ ] ~~Theme Settings~~ **NOT IMPLEMENTED**:
  - Dark/light mode toggle
  - Accent color picker
  - Font size scaling
  - Sharp vs rounded corners preference
  - Terminal effects toggle
- [ ] ~~File Browser Preferences~~ **NOT IMPLEMENTED**:
  - Default view mode
  - Items per page
  - Show hidden files toggle
  - Thumbnail size preference
  - Default sort order
  - Folder thumbnail preview toggle

### Sharing Defaults
- [x] **Share Link Settings** (partial):
  - [x] Default expiry duration
  - [x] Default password protection toggle
  - [x] Default download permission toggle
  - [x] Default quality for shared videos
  - [x] Analytics opt-out for personal shares
  - [x] Auto-expire old shares threshold
  - [ ] ~~Custom share URL prefix~~ **NOT IMPLEMENTED**

### Storage & Upload
- [ ] ~~Upload Settings~~ **NOT IMPLEMENTED**:
  - Default upload folder
  - Parallel upload count limit
  - Auto-transcode preference
  - Duplicate file handling
- [ ] ~~Storage Management~~ **NOT IMPLEMENTED**:
  - View storage usage by file type
  - Cache management
  - Storage cleanup rules

### Notification Settings
- [ ] ~~In-App Notifications~~ **NOT IMPLEMENTED**
- [ ] ~~Email Notifications~~ **NOT IMPLEMENTED**

### API & Integrations
- [ ] ~~Personal Access Tokens~~ **NOT IMPLEMENTED**
- [ ] ~~Third-Party Integrations~~ **NOT IMPLEMENTED**

### Admin Settings (Admin-only)
- [x] **User Management** (partial):
  - [x] Create new users
  - [x] Edit user permissions
  - [x] Disable/enable user accounts
  - [ ] ~~Edit user quotas~~ **NOT IMPLEMENTED**
  - [ ] ~~View user activity logs~~ **NOT IMPLEMENTED**
- [ ] ~~Server Configuration~~ **NOT IMPLEMENTED** (managed via environment variables only)
- [ ] ~~Security Settings~~ **NOT IMPLEMENTED**

### Settings Backend
- [x] `GET /api/settings` — fetch user settings
- [x] `PATCH /api/settings` — update settings
- [x] Settings stored in database (`userSettings` table)

---

## Phase 6: Enhanced Features

### Performance
- [ ] ~~Image lazy loading with blur placeholders~~ **NOT IMPLEMENTED**
- [x] Virtual scrolling for large directories — uses `@tanstack/react-virtual`
- [ ] ~~Service worker for offline file list caching~~ **NOT IMPLEMENTED**
- [ ] ~~CDN-friendly headers for static assets~~ **NOT IMPLEMENTED**
- [ ] ~~Database query optimisation~~ **NOT IMPLEMENTED**

### Video Streaming Enhancements
- [ ] ~~Resume playback position~~ **NOT IMPLEMENTED**
- [ ] ~~External subtitle upload (.vtt, .srt, .ass)~~ **NOT IMPLEMENTED**
- [x] Playback speed control (0.5x - 2x)
- [x] Picture-in-picture support (via VideoContextMenu)

### Photo Enhancements
- [ ] ~~Map view for geotagged photos~~ **NOT IMPLEMENTED**
- [ ] ~~Date-based auto-organisation~~ **NOT IMPLEMENTED**
- [ ] ~~Face detection grouping~~ **NOT IMPLEMENTED**

### Admin Features
- [x] User management panel (basic)
- [ ] ~~Storage quota per user~~ **NOT IMPLEMENTED**
- [ ] ~~Activity/audit log~~ **NOT IMPLEMENTED**
- [x] Bulk operations (delete) — via multi-select context menu
- [ ] ~~Server health dashboard~~ **NOT IMPLEMENTED**

---

## Phase 7: Global Context Menus

### Core Context Menu System
- [x] `ContextMenu` primitive component — floating menu with darkmatter styling
- [x] Keyboard navigation via Radix DropdownMenu
- [x] Click-outside to dismiss
- [x] Nested submenu support
- [x] Position-aware rendering
- [x] `ContextMenuProvider` — global state
- [x] `useContextMenu` hook

### File Browser Context Menus
- [x] **Single file/folder menu:** Open, Download, Share, Rename, Move, Copy, Delete, Properties
- [x] **Multi-selection menu:** Download as ZIP, Move selected, Delete selected, Share selected, Clear selection
- [x] **Empty space menu:** Upload files, New folder, Paste, Refresh, View options

### Viewer Context Menus
- [x] **Video player:** Playback speed, Audio track, Subtitle, Picture-in-picture, Download, Copy timestamp
- [x] **Image viewer:** Open in new tab, Download, Copy image, View EXIF, Navigate
- [x] **Audio player:** Add to playlist, Download track

### Share View Context Menus
- [x] **Public share menu:** Copy link, Download (if permitted)
- [x] **Folder share items:** Preview, Download individual, Add to bulk selection

### Integration
- [x] Keyboard shortcut integration
- [x] Mobile long-press to trigger context menu (`useLongPress` hook)
- [x] Right-click on sidebar items
- [x] Consistent darkmatter styling

---

## Phase 8: Polish & Deployment

### Aesthetic Refinements
- [x] Custom monospace font (JetBrains Mono / IBM Plex Mono via Geist Mono)
- [ ] ~~Subtle scan-line or CRT effect~~ **NOT IMPLEMENTED**
- [ ] ~~ASCII art logo~~ **NOT IMPLEMENTED**
- [x] Loading states with terminal-style aesthetics
- [x] Toast notifications (sonner library with dark theme)

### Accessibility
- [ ] ~~Keyboard navigation throughout~~ **PARTIAL** - Some areas have keyboard shortcuts
- [ ] ~~ARIA labels on interactive elements~~ **NOT IMPLEMENTED**
- [ ] ~~Focus indicators~~ **NOT IMPLEMENTED**
- [ ] ~~Screen reader testing~~ **NOT IMPLEMENTED**

### Deployment
- [ ] ~~Dockerfile with multi-stage build~~ **NOT IMPLEMENTED**
- [ ] ~~Docker Compose with volume mounts~~ **NOT IMPLEMENTED**
- [x] Environment variable configuration (`.env.example` exists)
- [ ] ~~Reverse proxy example configs~~ **NOT IMPLEMENTED**
- [ ] ~~Systemd service file~~ **NOT IMPLEMENTED**
- [x] Health check endpoint (`/api/hello`)

### Documentation
- [ ] ~~README with quickstart~~ **NOT IMPLEMENTED**
- [ ] ~~Configuration reference~~ **NOT IMPLEMENTED**
- [x] API documentation (Swagger/OpenAPI via Elysia at `/docs`)
- [ ] ~~Self-hosting guide~~ **NOT IMPLEMENTED**
- [ ] ~~Contributing guidelines~~ **NOT IMPLEMENTED**

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

| Phase | Time | Status |
|-------|------|--------|
| Project setup, auth, basic CRUD | 1 week | ✅ Complete |
| File browser, upload flow | 1 week | ✅ Complete |
| **Video pipeline** | **2-3 weeks** | ✅ Complete |
| Photo gallery | 1 week | ✅ Complete (minus slideshow/pinch-to-zoom) |
| Audio player, playlists | 1 week | ✅ Complete |
| Sharing system | 1 week | ✅ Complete |
| Settings page | 1 week | ⚠️ Partial |
| Polish, mobile, a11y | 1-2 weeks | ⚠️ Partial |
| Deployment docs | 0.5 week | ❌ Not started |

**Current Status:** Core functionality complete. Settings partially implemented. Deployment docs needed.

---

## Backlog / Future Ideas

- [ ] WebDAV support for native file manager integration
- [ ] S3-compatible backend storage option
- [ ] End-to-end encryption for sensitive shares
- [ ] Comments/reactions on shared content
- [ ] Telegram/Discord bot for upload notifications
- [ ] Plugin/extension system
- [ ] CLI tool for headless uploads
- [ ] FLAC → Opus audio transcoding
- [ ] Guest/anonymous access mode
- [ ] Complete test coverage (unit + integration)

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

---

## Audit Log

**2026-02-04:** Comprehensive audit completed. Key findings:
- **Corrected [x] → [ ]:** Guest/anonymous access (not implemented), Test coverage (infrastructure only), Extended rate limiting (auth only)
- **Corrected [ ] → [x]:** Audio range streaming (fully implemented), Frontend scrubbing support, VideoControls (all features present), Upload progress with cancel
- **Removed hallucinations:** Video sprite for scrubbing (not implemented), PhotoGallery slideshow/pinch-to-zoom
- **Added missing tables:** `refreshTokens`, `shareSettings`, `zipJobs`, `userSettings` to schema documentation
- **Settings reality check:** Many settings UI items marked as NOT IMPLEMENTED vs original claims
