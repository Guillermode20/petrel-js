# Architecture

Petrel is a full-stack TypeScript application using a modern three-tier architecture with clear separation between frontend, backend, and data layers.

## System Overview

```
┌─────────────────────────────────────────────────────────────┐
│                        Frontend                              │
│  React + TanStack Router + TanStack Query + Tailwind CSS    │
└──────────────────────────┬──────────────────────────────────┘
                           │ HTTP/REST
┌──────────────────────────▼──────────────────────────────────┐
│                        Backend                               │
│     Elysia API + Services + Event Bus + Job Queue           │
│                      (Bun Runtime)                          │
└──────────────────────────┬──────────────────────────────────┘
                           │
          ┌────────────────┼────────────────┐
          ▼                ▼                ▼
    ┌──────────┐    ┌──────────┐    ┌──────────┐
    │  SQLite  │    │ Filesystem│    │  Redis   │
    │   (DB)   │    │ (Storage)│    │ (Cache/  │
    │          │    │          │    │  Queue)  │
    └──────────┘    └──────────┘    └──────────┘
```

## Tech Stack

### Frontend
- **Framework**: React 19 with TypeScript
- **Router**: TanStack Router (file-based routing)
- **State**: TanStack Query for server state, React hooks for UI state
- **Styling**: Tailwind CSS 4 with custom darkmatter theme
- **UI Components**: shadcn/ui primitives (Radix UI + Tailwind)
- **Build**: Vite

### Backend
- **Framework**: Elysia (Bun-native, TypeScript-first)
- **ORM**: Drizzle ORM with type-safe queries
- **Database**: SQLite (Better SQLite 3)
- **Validation**: Zod for runtime type checking
- **Auth**: JWT access + refresh tokens via @elysiajs/jwt
- **Queue**: BullMQ with Redis for background jobs
- **Logging**: Pino with structured logging

### Media Processing
- **Video**: FFmpeg for transcoding, thumbnail extraction, metadata
- **Images**: Sharp for thumbnails and processing
- **Audio**: music-metadata for ID3/tags, FFmpeg for waveforms

## Monorepo Structure

```
petrel-js/
├── apps/
│   ├── backend/           # Elysia API server
│   │   ├── src/
│   │   │   ├── modules/   # Feature modules (auth, files, shares, etc.)
│   │   │   ├── services/  # Business logic classes
│   │   │   ├── cache/     # Caching infrastructure
│   │   │   ├── events/    # Event bus and handlers
│   │   │   ├── workers/   # Background job workers
│   │   │   └── lib/       # Utilities (ffmpeg, storage, etc.)
│   │   └── index.ts       # Entry point
│   └── frontend/          # React SPA
│       ├── src/
│       │   ├── routes/    # TanStack file-based routes
│       │   ├── components/# React components
│       │   ├── hooks/     # Custom TanStack Query hooks
│       │   └── lib/       # Utilities (API client, etc.)
│       └── index.html
├── packages/
│   └── shared/            # Shared TypeScript types
│       └── src/types/
├── package.json           # Workspace root config
└── biome.json            # Linting/formatting config
```

## Request Flow

1. **Frontend**: User action triggers TanStack Query mutation/query
2. **API Client**: Request sent with JWT in Authorization header
3. **Backend**: Elysia receives request, CORS middleware processes
4. **Auth Middleware**: JWT verified, user attached to context
5. **Route Handler**: Validation runs, service method called
6. **Service**: Business logic executes, database queries via Drizzle
7. **Response**: JSON response returned, TanStack Query caches result
8. **UI**: React re-renders with new data

## Key Patterns

### Backend
- **Modules**: Each feature (auth, files, shares) is an Elysia instance with routes
- **Services**: Classes encapsulating business logic (FileService, ShareService)
- **Middleware**: Auth, rate limiting, logging via Elysia plugins
- **Events**: Event bus decouples side effects (thumbnails, metadata extraction)
- **Jobs**: BullMQ workers handle transcoding and ZIP generation

### Frontend
- **File Routes**: Routes defined by files in `routes/` directory
- **Query Hooks**: Custom hooks wrap TanStack Query for each entity
- **Mutations**: Optimistic updates with cache invalidation
- **Context Menu**: Global context menu system with action handlers

## Data Flow

### File Upload
1. Frontend chunks file, POSTs to `/api/files/upload`
2. Upload service stores chunks in temp storage
3. On completion, file moved to permanent storage
4. File service creates database record
5. Event emitted: `file.created`
6. Event handlers trigger thumbnail/metadata extraction

### Video Streaming
1. Frontend requests video via HLS player (hls.js)
2. Stream endpoint checks auth/share permissions
3. If not transcoded, job queued to BullMQ
4. Worker transcodes to HLS segments
5. Playlist manifest served to client
6. Client requests segments as needed

### Share Access
1. Public user visits `/s/:token`
2. Frontend fetches share by token
3. If password protected, prompt displayed
4. Share service validates and returns content
5. Content rendered in appropriate viewer

## Environment

Key environment variables (see `.env.example`):

- `JWT_SECRET` / `JWT_REFRESH_SECRET`: 32+ char secrets for tokens
- `PORT`: Backend port (default: 4000)
- `FRONTEND_URL`: CORS origin (default: http://localhost:3000)
- `DATABASE_PATH`: SQLite file location
- `STORAGE_PATH`: File storage directory
- `REDIS_URL`: Optional Redis connection

## Development Commands

```bash
# Root
bun run dev              # Start backend + frontend
bun run test            # Run all tests
bun run test:backend    # Backend tests only
bun run test:frontend   # Frontend tests only

# Backend (apps/backend)
bun run db:push         # Apply schema changes

# Frontend (apps/frontend)
bun run build           # Production build
bun run preview         # Preview production build
```
