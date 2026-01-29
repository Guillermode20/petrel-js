# Petrel: The Fileserver Made For Sharing

> A fileserver built for simplicity with a focus on effortless sharing of videos and photos.

**Stack:** TanStack Start · Elysia.js · SQLite · Tailwind · shadcn/ui · Monospace aesthetic

---

## Phase 1: Project Foundation

### Environment Setup
- [x] Configure Tailwind CSS with monospace font defaults (`font-mono` as base)
- [x] Set up shadcn/ui with custom theme (muted colours, terminal-inspired)
- [x] Configure SQLite with Drizzle ORM (or similar)
- [x] Add development hot-reload for both frontend and backend
- [x] Strip frontend of all default TanStack Start components and replace with basic shadcn components
- [x] Install approved libraries: hls.js, howler, sharp, exifr, music-metadata, pdf.js, shiki, date-fns
- [x] Set up `packages/shared` for shared types between frontend and backend

### Database Schema Design
- [x] `users` table (id, username, password_hash, role, created_at)
- [x] `files` table (id, name, path, size, mime_type, hash, uploaded_by, created_at, metadata JSON for ffprobe data)
- [x] `folders` table (id, name, path, parent_id, owner_id)
- [x] `shares` table (id, type, target_id, token, expires_at, password_hash, download_count, view_count, allow_download, allow_zip, show_metadata)
- [x] `transcode_jobs` table (id, file_id, status, progress, output_path, created_at, completed_at)
- [x] `video_tracks` table (file_id, track_type, codec, language, index)
- [x] `subtitles` table (file_id, language, path, format)

---

## Phase 2: Core Backend (Elysia.js)

### Authentication
- [x] JWT-based authentication with refresh tokens (JWT plugin installed)
- [x] Login/logout endpoints
- [x] Optional: guest/anonymous access mode
- [x] Rate limiting on auth endpoints

### File Operations API
- [x] `GET /api/hello` - basic health check endpoint
- [x] `GET /api/files` - list files/folders with pagination
- [x] `GET /api/files/:id` - get file metadata
- [x] `GET /api/files/:id/download` - stream file download
- [x] `POST /api/files/upload` - chunked upload support
- [x] `DELETE /api/files/:id` - delete file
- [x] `PATCH /api/files/:id` - rename/move file
- [x] `POST /api/folders` - create folder

### Video Pipeline (Backend) — 2-3 weeks estimated
- [x] **Metadata extraction service** — ffprobe probes file for:
  - Duration, resolution, codecs
  - Audio tracks (language, codec, channels)
  - Embedded subtitles
  - Video codec detection (h264/h265/vp9/av1)
- [x] **Thumbnail generation service** — sharp + ffmpeg:
  - Frame at ~10% duration for preview card
  - Sprite sheet generation for scrubbing (video hover previews)
- [x] **Transcode assessment logic**:
  - Check if web-compatible (h264/h265/vp9 + aac/opus = transmux)
  - Non-compatible = queue transcode job
- [x] **HLS transmux-on-demand** — for web-compatible MKVs:
  - Segment generation without re-encoding
  - Master playlist with quality variants
- [x] **Background transcode queue** — for non-compatible files:
  - Queue job with Bull/BullMQ
  - Progress tracking (0-100%)
  - Multiple quality levels (1080p, 720p, 480p)
  - Cache segments to avoid re-processing
- [x] **Subtitle extraction** — MKV embedded subs → WebVTT
- [x] `GET /api/stream/:fileId/master.m3u8` — HLS manifest endpoint
- [x] `GET /api/stream/:fileId/:segment.ts` — HLS segment endpoint
- [x] `GET /api/files/:id/thumbnail` — thumbnail serving
- [x] `GET /api/files/:id/sprite` — thumbnail sprite for scrubbing

### Audio Pipeline (Backend)
- [x] **Audio metadata extraction** — music-metadata for:
  - ID3 tags (title, artist, album)
  - Album art extraction
  - Duration calculation
- [x] Waveform data generation (optional)

### Image Pipeline (Backend)
- [x] **Thumbnail generation** — sharp for:
  - Multiple sizes (small, medium, large)
  - Blur-up placeholder generation
- [x] **EXIF extraction** — exifr for:
  - Camera info (make, model, lens)
  - Location (GPS coordinates)
  - Date taken, exposure settings

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

### Phase 2 Review Recommendations

#### High Priority
- [x] **JWT Secret Management** - Move hardcoded JWT secrets to environment variables
- [x] **Refresh Token Persistence** - Replace in-memory blacklist with Redis or database storage
- [x] **Structured Logging** - Add proper logging library (Winston or Pino) for debugging and monitoring
- [x] **Test Coverage** - Implement unit tests for services and integration tests for API routes

#### Medium Priority
- [x] **Concurrency Control** - Add parallel processing support to transcode queue
- [x] **Caching Layer** - Implement Redis for frequently accessed data
- [x] **Documentation** - Add JSDoc comments for complex functions
- [x] **Extended Rate Limiting** - Apply rate limiting to additional endpoints beyond auth

#### Low Priority
- [x] **Code Refactoring** - Split functions exceeding 50-line limit into smaller helpers
- [x] **Configuration Validation** - Add schema validation for environment variables
- [x] **API Documentation** - Generate OpenAPI/Swagger documentation

---

## Phase 2 Review Recommendations - Implementation Plans

### High Priority

#### JWT Secret Management
- [x] Audit codebase for all hardcoded secrets in auth middleware and routes
- [x] Create `.env.example` file documenting required environment variables
- [x] Install and configure `dotenv` package if not present
- [x] Update `apps/backend/src/modules/auth/utils.ts` to read JWT_SECRET from env
- [x] Update `apps/backend/src/modules/auth/middleware.ts` to use env-based secret
- [x] Add validation that JWT_SECRET is set at application startup
- [x] Update deployment documentation with environment variable requirements

#### Refresh Token Persistence
- [x] Add `refresh_tokens` table to database schema with fields: id, user_id, token_hash, expires_at, created_at, revoked_at
- [x] Create migration file for the new table
- [x] Create `apps/backend/src/services/token.service.ts` with methods: storeRefreshToken, validateRefreshToken, revokeRefreshToken, cleanupExpiredTokens
- [x] Update auth routes to use database storage instead of memory for token blacklist
- [x] Add scheduled job to cleanup expired refresh tokens periodically
- [x] Update logout endpoint to properly revoke tokens in database

#### Structured Logging
- [x] Evaluate and install Pino as logging library (lightweight, Bun-compatible)
- [x] Create `apps/backend/src/lib/logger.ts` with configured logger instance
- [x] Define log levels: error, warn, info, debug with appropriate use cases
- [x] Replace all console.log/console.error with structured logger calls
- [x] Add request logging middleware for HTTP requests
- [x] Configure log output format for development vs production
- [x] Add correlation IDs for tracing requests across services

#### Test Coverage
- [x] Install test dependencies: vitest, @elysiajs/testing, supertest
- [x] Create `apps/backend/tests/` directory structure: unit/, integration/, fixtures/
- [x] Set up test database configuration using SQLite in-memory
- [x] Write unit tests for auth.service.ts (register, login, token validation)
- [x] Write unit tests for file.service.ts (CRUD operations)
- [x] Write integration tests for auth routes
- [x] Write integration tests for file routes
- [x] Add test script to package.json
- [ ] Configure CI to run tests on pull requests

### Medium Priority

#### Concurrency Control
- [x] Analyze current transcode service for sequential bottlenecks
- [x] Install `p-map` or `p-limit` for controlled parallel processing
- [x] Add MAX_CONCURRENT_TRANSCODES environment variable (default: 2)
- [x] Refactor transcode queue to use worker pool pattern
- [x] Implement progress tracking for parallel transcoding jobs
- [x] Add queue priority system (new uploads vs background processing)
- [x] Test parallel transcoding with different file sizes and formats

#### Caching Layer
- [x] Install Redis client library: ioredis
- [x] Create `apps/backend/src/lib/redis.ts` with connection management
- [x] Add REDIS_URL environment variable support
- [x] Implement cache middleware for frequently accessed endpoints
- [x] Cache file metadata queries for 5 minutes
- [x] Cache stream manifests for 1 minute
- [x] Add cache invalidation on file upload/update/delete
- [x] Implement fallback to database if Redis is unavailable

#### Documentation
- [x] Add JSDoc to all service methods explaining parameters and return values
- [x] Document complex algorithms in transcode.service.ts
- [x] Add inline comments for non-obvious code sections
- [ ] Create API endpoint documentation in docs/api.md
- [ ] Document configuration options in docs/configuration.md
- [ ] Add architecture diagram showing service relationships

#### Extended Rate Limiting
- [x] Install `@elysiajs/rate-limit` package
- [x] Create rate limiting configuration file
- [x] Apply rate limiting to file upload endpoints (10 uploads per minute per user)
- [x] Apply rate limiting to stream endpoints (100 requests per minute per IP)
- [x] Apply rate limiting to share token validation (30 requests per minute)
- [x] Configure rate limit headers (X-RateLimit-Limit, X-RateLimit-Remaining)
- [ ] Add rate limit bypass for admin users

### Low Priority

#### Code Refactoring
- [x] Identify all functions exceeding 50 lines using static analysis
- [x] Refactor `transcode.service.ts` large functions into smaller helpers
- [x] Refactor `file.service.ts` complex methods into focused sub-functions
- [x] Extract validation logic into reusable validators
- [x] Extract database query builders into separate functions
- [x] Run linter and type checker after each refactoring

#### Configuration Validation
- [x] Install Zod or Valibot for schema validation
- [x] Create `apps/backend/src/config/schema.ts` with environment variable schemas
- [x] Define validation for: PORT, DATABASE_URL, JWT_SECRET, REDIS_URL, etc.
- [x] Create `apps/backend/src/config/index.ts` to load and validate config at startup
- [x] Add helpful error messages for missing/invalid configuration
- [x] Add type-safe config object exported for use across application

#### API Documentation
- [x] Install `@elysiajs/swagger` package
- [x] Configure Swagger UI at `/docs` endpoint
- [x] Add Elysia schema definitions to all routes
- [x] Document request/response types for all endpoints
-  - Add example values for complex request bodies
  - Group endpoints by resource (auth, files, shares, stream)
  - Add authentication documentation to Swagger

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
- [ ] Context menu (right-click actions)
- [x] Multi-select with shift/ctrl+click
- [x] Drag-and-drop upload zone
- [ ] Upload progress indicator with cancel option
- [x] Search/filter bar
- [x] Sort by name/date/size/type

### Video Player — Custom build on hls.js
**Why hls.js directly (not Video.js/Plyr):**
- Full control over terminal aesthetic
- No fighting external CSS
- Custom features styled your way

- [x] `VideoPlayer` component with hidden native controls
- [x] `useVideoPlayer` hook for state management:
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
- [x] Keyboard shortcuts:
  - Space: play/pause
  - Arrow keys: seek +/- 5s
  - F: fullscreen
  - M: mute
- [x] Loading/buffering states
- [x] Transcode progress overlay (if processing)

### Photo Gallery — Custom lightbox
**Why custom (not off-the-shelf):** No gallery fits monospace aesthetic

- [x] `PhotoGallery` grid view:
  - Masonry or grid layout toggle
  - Lazy-loaded thumbnails with blur-up
- [x] `Lightbox` component:
  - Full image display
  - Zoom/pan with CSS transforms
  - EXIF metadata display (camera, lens, location, date)
  - Navigation arrows (← →)
  - Keyboard navigation (arrows, escape)
- [x] `PhotoInfo` panel:
  - Total size, image count
  - Location map for geotagged photos
  - Date range
- [ ] Slideshow mode with configurable interval
- [ ] Pinch-to-zoom on mobile
- [ ] Download individual or ZIP all

### Audio Player — Howler.js based
**Why Howler.js (not native audio):** Gapless playback, Web Audio abstraction, consistent API

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

### Document Viewer
- [x] **PDF viewer** — pdf.js integration
  - Page navigation
  - Zoom controls
- [x] **Text/Code viewer** — shiki syntax highlighting
- [x] **Markdown viewer** — rendered preview

### File Preview (Unified)
- [x] `FilePreview` router component — detects mime type and renders:
  - Video → `VideoPlayer`
  - Audio → `AudioPlayer`
  - Image → `ImageViewer` (single)
  - PDF → `PDFViewer`
  - Text/Code → `CodeViewer`
  - Other → `DownloadPrompt`
- [x] Keyboard navigation (arrow keys for next/prev in folder)
- [x] Navigation context preservation — returns to originating folder when closing preview

### Sharing UI
- [x] "Create share" button in UI
- [x] Share management UI with sample data
- [ ] `CreateShareModal` component:
  - Expiry dropdown (1h, 24h, 7d, 30d, never)
  - Password protection toggle + input
  - Allow download toggle
  - Quality options (if transcoded)
- [ ] Copy link button with toast confirmation
- [x] QR code generation for share links
- [ ] `ShareManagement` table (active shares):
  - Link, expiry countdown, view/download counts
  - Revoke action

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

### Shared Folder View (`/s/:token` for folders)
- [ ] File listing with folder navigation
- [ ] Smart defaults:
  - All images → render as `PhotoGallery`
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

### Photo Enhancements
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
| Photo gallery | 1 week | Easier than video |
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
