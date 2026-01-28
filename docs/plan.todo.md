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

### Database Schema Design
- [x] `users` table (id, username, password_hash, role, created_at)
- [x] `files` table (id, name, path, size, mime_type, hash, uploaded_by, created_at)
- [x] `folders` table (id, name, path, parent_id, owner_id)
- [x] `shares` table (id, type, target_id, token, expires_at, password_hash, download_count, view_count)
- [x] `albums` table (id, name, description, cover_file_id, owner_id, created_at)
- [x] `album_files` junction table (album_id, file_id, sort_order)
- [x] `share_settings` table (share_id, allow_download, allow_zip, show_metadata)

---

## Phase 2: Core Backend (Elysia.js)

### Authentication
- [x] JWT-based authentication with refresh tokens (JWT plugin installed)
- [ ] Login/logout endpoints
- [ ] Optional: guest/anonymous access mode
- [ ] Rate limiting on auth endpoints

### File Operations API
- [x] `GET /api/hello` - basic health check endpoint
- [ ] `GET /api/files` - list files/folders with pagination
- [ ] `GET /api/files/:id` - get file metadata
- [ ] `GET /api/files/:id/download` - stream file download
- [ ] `POST /api/files/upload` - chunked upload support
- [ ] `DELETE /api/files/:id` - delete file
- [ ] `PATCH /api/files/:id` - rename/move file
- [ ] `POST /api/folders` - create folder
- [ ] Thumbnail generation for images/videos (ffmpeg integration)
- [ ] Video transcoding queue for web-playable formats

### Sharing API
- [ ] `POST /api/shares` - create share link
- [ ] `GET /api/shares/:token` - get shared content (public)
- [ ] `DELETE /api/shares/:id` - revoke share
- [ ] `PATCH /api/shares/:id` - update expiry/password
- [ ] Optional password protection on shares
- [ ] Expiring links (1h, 24h, 7d, 30d, never)
- [ ] View/download analytics per share

### Albums API
- [ ] `POST /api/albums` - create album
- [ ] `GET /api/albums/:id` - get album with files
- [ ] `PATCH /api/albums/:id` - update album metadata
- [ ] `POST /api/albums/:id/files` - add files to album
- [ ] `DELETE /api/albums/:id/files/:fileId` - remove from album
- [ ] Drag-and-drop reordering support (sort_order)

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

### File Preview
- [ ] Image viewer with zoom/pan
- [ ] Video player (HLS support for large files)
- [ ] Audio player with waveform visualisation
- [ ] PDF viewer (embedded)
- [ ] Code/text file preview with syntax highlighting
- [ ] Markdown preview
- [ ] Keyboard navigation (arrow keys for next/prev)

### Sharing UI
- [x] "Create share" button in UI
- [x] Share management UI with sample data
- [ ] "Create share" modal with options
- [ ] Copy link button with toast confirmation
- [ ] QR code generation for share links
- [ ] Share management table (active shares)
- [ ] Expiry countdown display

### Albums UI
- [x] Album UI with sample data
- [ ] Album grid view with cover images
- [ ] Album detail view (masonry/grid layout)
- [ ] "Add to album" action from file browser
- [ ] Album slideshow mode
- [ ] Album share (entire album as one link)

---

## Phase 4: Public Share Views

### Shared File View (`/s/:token`)
- [ ] Clean, minimal single-file view
- [ ] Download button (if permitted)
- [ ] Password entry form (if protected)
- [ ] Expiry warning banner
- [ ] "Powered by Petrel" subtle footer

### Shared Album View (`/s/:token` for albums)
- [ ] Gallery grid layout
- [ ] Lightbox viewer for individual images
- [ ] Video playback inline
- [ ] "Download all as ZIP" button (if permitted)
- [ ] Slideshow auto-play option

### Shared Folder View (`/s/:token` for folders)
- [ ] File listing with folder navigation
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

### Video Streaming & Transcoding
- [ ] ffmpeg integration for on-the-fly transcoding
- [ ] MKV → HLS transmuxing (if codecs are web-compatible)
- [ ] MKV → MP4/WebM transcoding (if codecs need conversion)
- [ ] Codec detection (h264/h265/vp9/av1) to determine transmux vs transcode
- [ ] HLS segment generation with multiple quality levels
- [ ] Transcoding job queue (background worker)
- [ ] Transcode progress tracking in UI
- [ ] Cache transcoded segments to avoid re-processing
- [ ] Fallback to direct download if transcoding unavailable
- [ ] Embedded subtitle extraction (MKV → WebVTT)
- [ ] Audio track selection for multi-audio MKVs
- [ ] Thumbnail sprite generation for video scrubbing
- [ ] Resume playback position (stored locally)
- [ ] External subtitle support (.vtt, .srt, .ass)

### Photo Album Enhancements
- [ ] EXIF metadata extraction and display
- [ ] Map view for geotagged photos
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

## Phase 2: Core Backend (Elysia.js)

### Authentication
- [ ] JWT-based authentication with refresh tokens
- [ ] Login/logout endpoints
- [ ] Optional: guest/anonymous access mode
- [ ] Rate limiting on auth endpoints

### File Operations API
- [ ] `GET /api/files` - list files/folders with pagination
- [ ] `GET /api/files/:id` - get file metadata
- [ ] `GET /api/files/:id/download` - stream file download
- [ ] `POST /api/files/upload` - chunked upload support
- [ ] `DELETE /api/files/:id` - delete file
- [ ] `PATCH /api/files/:id` - rename/move file
- [ ] `POST /api/folders` - create folder
- [ ] Thumbnail generation for images/videos (ffmpeg integration)
- [ ] Video transcoding queue for web-playable formats

### Sharing API
- [ ] `POST /api/shares` - create share link
- [ ] `GET /api/shares/:token` - get shared content (public)
- [ ] `DELETE /api/shares/:id` - revoke share
- [ ] `PATCH /api/shares/:id` - update expiry/password
- [ ] Optional password protection on shares
- [ ] Expiring links (1h, 24h, 7d, 30d, never)
- [ ] View/download analytics per share

### Albums API
- [ ] `POST /api/albums` - create album
- [ ] `GET /api/albums/:id` - get album with files
- [ ] `PATCH /api/albums/:id` - update album metadata
- [ ] `POST /api/albums/:id/files` - add files to album
- [ ] `DELETE /api/albums/:id/files/:fileId` - remove from album
- [ ] Drag-and-drop reordering support (sort_order)

---

## Phase 3: Core Frontend (TanStack Start)

### Layout & Navigation
- [ ] Root layout with monospace typography
- [ ] Sidebar navigation (Files, Albums, Shares, Settings)
- [ ] Breadcrumb navigation for folder hierarchy
- [ ] Mobile-responsive drawer navigation
- [ ] Dark mode by default (terminal aesthetic)

### File Browser
- [ ] Grid view (thumbnails) and list view toggle
- [ ] File/folder icons with mime-type awareness
- [ ] Context menu (right-click actions)
- [ ] Multi-select with shift/ctrl+click
- [ ] Drag-and-drop upload zone
- [ ] Upload progress indicator with cancel option
- [ ] Search/filter bar
- [ ] Sort by name/date/size/type

### File Preview
- [ ] Image viewer with zoom/pan
- [ ] Video player (HLS support for large files)
- [ ] Audio player with waveform visualisation
- [ ] PDF viewer (embedded)
- [ ] Code/text file preview with syntax highlighting
- [ ] Markdown preview
- [ ] Keyboard navigation (arrow keys for next/prev)

### Sharing UI
- [ ] "Create share" modal with options
- [ ] Copy link button with toast confirmation
- [ ] QR code generation for share links
- [ ] Share management table (active shares)
- [ ] Expiry countdown display

### Albums UI
- [ ] Album grid view with cover images
- [ ] Album detail view (masonry/grid layout)
- [ ] "Add to album" action from file browser
- [ ] Album slideshow mode
- [ ] Album share (entire album as one link)

---

## Phase 4: Public Share Views

### Shared File View (`/s/:token`)
- [ ] Clean, minimal single-file view
- [ ] Download button (if permitted)
- [ ] Password entry form (if protected)
- [ ] Expiry warning banner
- [ ] "Powered by Petrel" subtle footer

### Shared Album View (`/s/:token` for albums)
- [ ] Gallery grid layout
- [ ] Lightbox viewer for individual images
- [ ] Video playback inline
- [ ] "Download all as ZIP" button (if permitted)
- [ ] Slideshow auto-play option

### Shared Folder View (`/s/:token` for folders)
- [ ] File listing with folder navigation
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

### Video Streaming & Transcoding
- [ ] ffmpeg integration for on-the-fly transcoding
- [ ] MKV → HLS transmuxing (if codecs are web-compatible)
- [ ] MKV → MP4/WebM transcoding (if codecs need conversion)
- [ ] Codec detection (h264/h265/vp9/av1) to determine transmux vs transcode
- [ ] HLS segment generation with multiple quality levels
- [ ] Transcoding job queue (background worker)
- [ ] Transcode progress tracking in UI
- [ ] Cache transcoded segments to avoid re-processing
- [ ] Fallback to direct download if transcoding unavailable
- [ ] Embedded subtitle extraction (MKV → WebVTT)
- [ ] Audio track selection for multi-audio MKVs
- [ ] Thumbnail sprite generation for video scrubbing
- [ ] Resume playback position (stored locally)
- [ ] External subtitle support (.vtt, .srt, .ass)

### Photo Album Enhancements
- [ ] EXIF metadata extraction and display
- [ ] Map view for geotagged photos
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
- [ ] Custom monospace font (JetBrains Mono / IBM Plex Mono)
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
- [ ] Health check endpoint (`/api/health`)

### Documentation
- [ ] README with quickstart
- [ ] Configuration reference
- [ ] API documentation (Swagger/OpenAPI via Elysia)
- [ ] Self-hosting guide
- [ ] Contributing guidelines

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