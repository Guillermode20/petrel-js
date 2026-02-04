# Petrel: The Fileserver Made For Sharing

> A fileserver built for simplicity with a focus on effortless sharing of videos and photos.

**Stack:** TanStack Start · Elysia.js · SQLite · Tailwind · shadcn/ui · Monospace aesthetic

---

## Existing Features Overview

### Core Infrastructure
- **Monospace UI theme** — Darkmatter aesthetic with JetBrains Mono, terminal-inspired design
- **JWT-based authentication** with refresh tokens and rate limiting
- **SQLite database** with Drizzle ORM (11 tables: users, files, folders, shares, transcode jobs, etc.)
- **Redis caching layer** with cache decorators
- **BullMQ background job queue** for transcodes and ZIP generation
- **Swagger/OpenAPI docs** at `/docs`

### File Management
- **File browser** — Grid/list views, breadcrumbs, multi-select, drag-and-drop upload
- **Folder operations** — Create, rename, move, delete with full hierarchy support
- **Context menus** — Right-click actions for files/folders (download, share, rename, delete, properties)
- **Bulk operations** — Download as ZIP, move/delete multiple items
- **Virtual scrolling** for large directories
- **Search, sort, and filter** capabilities

### Media Viewers
- **Video player** — HLS streaming via hls.js, quality switching, audio/subtitle tracks, playback speed (0.5x-2x), picture-in-picture, keyboard shortcuts
- **Photo gallery** — Lightbox with zoom/pan, EXIF display, keyboard navigation
- **Audio player** — Howler.js based with playlists, shuffle/repeat, Media Session API, waveform visualization
- **Document viewer** — PDF (pdf.js), code (shiki syntax highlighting), Markdown (GFM + editing)
- **Unified preview router** — Auto-detects content type

### Sharing System
- **Share links** — Create with expiry (1h to never), password protection, download permissions
- **Public share views** — Smart rendering (gallery for images, playlist for audio, browser for mixed)
- **QR code generation** for share links
- **Share analytics** — View/download counts per share
- **ZIP downloads** for folders via share links

### Backend Pipelines
- **Video pipeline** — ffprobe metadata extraction, thumbnail + sprite generation, HLS transmux-on-demand, subtitle extraction (MKV→WebVTT)
- **Audio pipeline** — music-metadata extraction, waveform generation, range-aware streaming (206 Partial Content)
- **Image pipeline** — sharp thumbnails, exifr EXIF extraction

### Admin & Settings
- **User management** — Create users, edit permissions, disable/enable accounts
- **Share link defaults** — Expiry, password, download permissions
- **Settings backend** — JSON storage in `userSettings` table

---

## New Features Needed

### User Experience
- [ ] **External subtitle upload** — Support .vtt, .srt, .ass files
- [ ] **Slideshow mode** — Auto-advance photos with configurable delay
- [ ] **Pinch-to-zoom** on mobile for photos

### User Settings
- [ ] **Update password** with current password confirmation
- [ ] **Session management** — View active sessions, revoke specific, "log out everywhere"
- [ ] **Playback preferences** — Autoplay, volume level, subtitle/audio language priority
- [ ] **File browser preferences** — Default view mode, items per page, hidden files toggle, thumbnail size, default sort order

### Storage & Upload
- [ ] **Default upload folder selection**
- [ ] **Parallel upload count limit**
- [ ] **Duplicate file handling** — Skip, rename, or replace
- [ ] **Storage usage dashboard** — View usage by file type
- [ ] **Cache management** — Clear transcode cache, thumbnails

### Admin Features
- [ ] **Activity/audit log** — Track user actions, file operations
- [ ] **Server health dashboard** — CPU, memory, disk usage, active jobs

### Accessibility
- [ ] **Keyboard navigation throughout** — Full ARIA support
- [ ] **Focus indicators** on all interactive elements
- [ ] **Screen reader testing and optimization**

### Performance & Offline
- [ ] **Image lazy loading** with blur placeholders
- [ ] **Service worker** for offline file list caching
- [ ] **CDN-friendly headers** for static assets
- [ ] **Database query optimization** — Add indexes, N+1 fixes

### Deployment
- [ ] **Dockerfile** with multi-stage build
- [ ] **Docker Compose** with volume mounts for data/cache
- [ ] **Reverse proxy configs** — Nginx, Caddy examples
- [ ] **Systemd service file**
- [ ] **README with quickstart**
- [ ] **Self-hosting guide**
- [ ] **Contributing guidelines**

### Future Enhancements
- [ ] **CLI tool** for headless uploads
- [ ] **Test coverage** — Unit and integration tests

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
