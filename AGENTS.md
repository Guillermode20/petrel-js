# Petrel AI Coding Guidelines

> Rules and conventions for AI coding assistants working on the Petrel project.

---

## Core Philosophy

Petrel is a **sharing-first media fileserver** with a sleek darkmatter aesthetic. Every feature should serve the goal of effortless media sharing while maintaining visual consistency.

**Key Principles:**
- Sharing is the primary use case — not just storage, not just viewing
- Darkmatter aesthetic: deep dark backgrounds with purple tint, orange/teal accents, sharp corners
- Performance matters for large files (streaming > downloading)
- Web-compatible formats are handled gracefully, others are transcoded

---

## Development Environment

This project runs on **Windows** with **PowerShell** as the default shell.

**Important Notes:**
- All shell commands should use PowerShell syntax (e.g., `$env:VAR_NAME` for environment variables)
- Path separators use backslashes (`\`) in configuration files, forward slashes (`/`) are acceptable in code
- Use semicolons (`;`) to chain commands in PowerShell
- Script execution policies may require `Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass`

---

## Project Structure

This is a **Bun-based monorepo** using workspaces:

```
petrel-js/
├── apps/
│   ├── backend/         # Elysia API server
│   └── frontend/        # React + TanStack Router SPA
├── packages/
│   └── shared/          # Shared TypeScript types
├── package.json         # Root workspace config
├── biome.json          # Linting/formatting config
└── tsconfig.base.json  # Shared TypeScript config
```

**Scripts (run from root):**
- `bun run dev` - Start both backend and frontend
- `bun run test` - Run all tests (backend + frontend + shared)
- `bun run test:watch` - Run all tests in watch mode
- `bun run format` - Format with Biome
- `bun run lint` - Lint with Biome
- `bun run check` - Run Biome check (format + lint)

---

## Code Style Rules

### TypeScript

**Explicit Types Required**
```typescript
// ✅ GOOD
function calculateDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600)
  return `${hours}h`
}

// ❌ BAD - implicit return, no parameter type
function calculateDuration(seconds) {
  return `${Math.floor(seconds / 3600)}h`
}
```

**No `any` — Ever**
```typescript
// ❌ NEVER
function processFile(file: any): any

// ✅ Use proper types from shared package
import type { File } from '@petrel/shared'
function processFile(file: File): ProcessedFile
```

**Named Exports Only**
```typescript
// ✅ GOOD
export function VideoPlayer() { }
export { VideoPlayer }

// ❌ BAD - default exports
export default function VideoPlayer() { }
```

**Function Length Limit**
- Maximum 50 lines per function
- Extract helpers for complex logic
- Use early returns to reduce nesting

```typescript
// ✅ GOOD - extracted helpers
export async function uploadFile(file: File) {
  const validated = await validateFile(file)
  if (!validated.valid) return { error: validated.error }
  
  const processed = await processUpload(validated)
  return await saveToDatabase(processed)
}

// ❌ BAD - 100+ line god function
export async function uploadFile(file: File) {
  // validation logic...
  // processing logic...
  // database logic...
  // response formatting...
  // error handling...
}
```

---

## File Organization

### Frontend (`apps/frontend/src`)

```
components/
  ui/                    # shadcn primitives only
    button.tsx
    input.tsx
  file-browser/          # Domain-specific components
    FileCard.tsx
    FileGrid.tsx
    FileList.tsx
    UploadZone.tsx
    FileDialogs.tsx
    types.ts             # Component-specific types
    utils.ts             # File browser utilities
    utils/selection.ts   # Selection logic
  viewers/               # Media viewers
    video-player/
      VideoPlayer.tsx
      VideoControls.tsx
      useVideoPlayer.ts
      types.ts
    audio-player/
    image-viewer/
    document-viewer/
    file-preview/
  sharing/               # Share-related components
    ShareModal.tsx
    ShareTable.tsx
  auth/                  # Authentication components
    LoginForm.tsx
    CreateAdminForm.tsx
  navigation/            # Navigation components
    Sidebar.tsx
    FolderBreadcrumb.tsx
    PageBar.tsx
  settings/              # Settings components
    accounts/
      UserList.tsx
      CreateUserForm.tsx
  global-context-menu/   # Global right-click context menu
    ContextMenuProvider.tsx
    GlobalContextMenu.tsx
    useContextMenu.ts
    action-handlers.ts

routes/                  # TanStack file routes (file-based routing)
  __root.tsx             # Root layout with providers
  index.tsx              # Home redirect
  files/                 # File browser routes
    index.tsx            # /files - file browser
  s/                     # Public share routes
    $token.tsx           # /s/:token - public share view
  settings.tsx           # /settings - user settings
  shares.tsx             # /shares - manage shares

hooks/                   # Global hooks (TanStack Query patterns)
  useAuth.ts             # Authentication state
  useFiles.ts            # File operations (queries + mutations)
  useShares.ts           # Share operations
  useStream.ts           # Streaming/HLS hooks
  useZipDownload.ts      # ZIP download hook
  useSettings.ts         # User settings hooks

lib/                     # Utilities
  utils.ts               # cn() and general utilities
  api.ts                 # API client class with token handling
  logger.ts              # Client-side logging
```

### Backend (`apps/backend/src`)

```
modules/                 # Feature-based modules
  auth/                  # Authentication
    index.ts
    routes.ts
  files/                 # File management
    index.ts
    guards.ts
    types.ts
    routes/              # Split routes by functionality
      index.ts           # Route aggregator
      list.routes.ts     # File listing endpoints
      upload.routes.ts   # Upload endpoints
      download.routes.ts # Download endpoints
      mutate.routes.ts   # CRUD operations
      folder.routes.ts   # Folder operations
      media.routes.ts    # Media metadata/endpoints
      zip.routes.ts      # ZIP generation
  shares/                # Share management
  stream/                # HLS streaming
  users/                 # User management
  admin/                 # Admin endpoints
  audio/                 # Audio-specific endpoints
  settings/              # User settings
  server-settings/       # Server configuration
  setup/                 # Initial setup
  logs/                  # Audit logging

services/                # Business logic (class-based)
  file.service.ts        # File CRUD operations
  folder.service.ts      # Folder operations
  share.service.ts       # Share management
  upload.service.ts      # File upload handling
  stream.service.ts      # HLS streaming logic
  transcode.service.ts   # Video transcoding
  video.service.ts       # Video processing
  audio.service.ts       # Audio processing
  metadata.service.ts    # File metadata extraction
  thumbnail.service.ts   # Thumbnail generation
  storage-sync.service.ts # Storage synchronization
  token.service.ts       # JWT/PAT token management
  user.service.ts        # User management
  zip.service.ts         # ZIP archive generation

cache/                   # Caching infrastructure
  cache.manager.ts       # Cache manager with decorators
  cache.interface.ts     # Cache interface
  decorators/
    cacheable.ts         # @Cacheable decorator
    cache-evict.ts       # @CacheEvict decorator
  keys.ts                # Cache key generators
  storage/
    memory.cache.ts      # In-memory cache
    redis.cache.ts       # Redis cache implementation

events/                  # Event system
  bus.ts                 # Event bus
  types.ts               # Event type definitions
  handlers/              # Event handlers
    file-events.ts
    share-events.ts

queues/                  # BullMQ job queues
workers/                 # Background job workers

lib/                     # Utilities
  ffmpeg.ts              # FFmpeg wrappers
  storage.ts             # Storage path utilities
  logger.ts              # Pino logger
  thumbnails.ts          # Thumbnail generation utilities
  waveform.ts            # Audio waveform generation
  http-range.ts          # HTTP range request handling
  rate-limit.ts          # Rate limiting
  share-validation.ts    # Share token validation

config/                  # Configuration
  index.ts               # Config loader
  schema.ts              # Zod config validation

db/                      # Database
  schema.ts              # Drizzle table definitions
  index.ts               # Database connection

constants/               # Constants
  mime-types.ts          # MIME type definitions

types/                   # Backend-specific types
```

**Critical Rules:**
- Components go in `components/`, never inline in routes
- Business logic goes in `services/`, never in route handlers
- Database queries go in `services/`, never in routes directly
- Shared types go in `packages/shared`, import from there

### Shared Package (`packages/shared`)

```
src/
  types/
    index.ts             # All shared TypeScript types
    permissions.ts       # Permission system types
  index.ts               # Main exports
```

**Usage:** Import types using `@petrel/shared`:
```typescript
import type { File, Folder, User } from "@petrel/shared";
```

---

## Naming Conventions

| Type | Convention | Example |
|------|------------|---------|
| Files | kebab-case | `video-player.tsx`, `file.service.ts` |
| Components | PascalCase | `VideoPlayer`, `FileCard` |
| Functions/Variables | camelCase | `getDuration`, `isPlaying` |
| Database tables/columns | snake_case | `file_id`, `created_at` |
| Constants | UPPER_SNAKE_CASE | `MAX_FILE_SIZE` |
| Types/Interfaces | PascalCase | `VideoPlayerProps` |
| Hooks | camelCase with `use` prefix | `useVideoPlayer` |

**No Abbreviations** (except common ones)
```typescript
// ✅ GOOD
function getFileMetadata(fileId: string)
const downloadCount = 0

// ❌ BAD
function getFileMeta(fid: string)
const dlCnt = 0
```

---

## React Patterns

### State Management

```typescript
// ✅ useState for LOCAL UI state only
const [isOpen, setIsOpen] = useState(false)
const [currentTime, setCurrentTime] = useState(0)

// ✅ TanStack Query for ALL server state
const { data: files, isLoading } = useQuery({
  queryKey: ['files'],
  queryFn: fetchFiles
})

// ❌ NEVER useEffect for fetching
useEffect(() => {
  fetch('/api/files').then(r => r.json()).then(setFiles)
}, [])
```

### Custom Hooks

```typescript
// ✅ Hooks go in hooks/ and start with 'use'
// hooks/useVideoPlayer.ts
export function useVideoPlayer(videoRef: RefObject<HTMLVideoElement>, src: string) {
  const [isPlaying, setIsPlaying] = useState(false)
  // ... hook logic
  return { isPlaying, play, pause }
}

// ✅ Component uses the hook
// components/viewers/video-player/VideoPlayer.tsx
export function VideoPlayer({ src }: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const { isPlaying, play } = useVideoPlayer(videoRef, src)
  // ...
}
```

### Props & Composition

```typescript
// ✅ No prop drilling beyond 2 levels
// Use composition or context

// ✅ Composition pattern
<VideoPlayer>
  <VideoControls>
    <PlayButton />
    <SeekBar />
  </VideoControls>
</VideoPlayer>

// ❌ Prop drilling through 3+ components
<VideoPlayer onPlay={handlePlay} onSeek={handleSeek} onVolumeChange={handleVolume} />
```

### Styling

```typescript
// ✅ Tailwind classes inline (no CSS modules)
<div className="flex items-center gap-2 p-4 font-mono text-sm">

// ✅ cn() utility for conditional classes
import { cn } from '@/lib/utils'
<div className={cn('base-classes', isActive && 'active-classes')}>

// ❌ No inline styles
<div style={{ display: 'flex', gap: '8px' }}>

// ❌ No CSS-in-JS libraries
```

---

## API Patterns

### Elysia Routes

```typescript
// ✅ Consistent response shape: { data, error }
app.get('/api/files', async () => {
  try {
    const files = await fileService.list()
    return { data: files, error: null }
  } catch (err) {
    return { data: null, error: err.message }
  }
}, {
  // ✅ Use Elysia's validation
  query: t.Object({
    limit: t.Optional(t.Number({ default: 20 }))
  }),
  response: {
    200: t.Object({
      data: t.Array(FileSchema),
      error: t.Union([t.String(), t.Null()])
    })
  }
})
```

### Authentication Middleware - CRITICAL JWT Plugin Pattern

**⚠️ NEVER create duplicate JWT plugin instances in Elysia**

Elysia plugins (like `@elysiajs/jwt`) must be registered only once per route chain. The `authMiddleware` already includes the JWT plugin, so:

```typescript
// ✅ CORRECT - Single JWT instance via authMiddleware
export const myRoutes = new Elysia({ prefix: "/api" })
  .use(authMiddleware)                    // Adds JWT + user to context
  .use(requirePermission("upload"))       // Only checks permission
  .post("/files", async ({ user }) => {
    // user is available from authMiddleware
  })

// ✅ CORRECT - Auth routes that already have JWT
export const authRoutes = new Elysia({ prefix: "/api/auth" })
  .use(jwt({ secret: config.JWT_SECRET }))  // JWT plugin here
  .post("/login", ...)
  .use(authMiddleware)                       // Uses existing JWT instance
  .get("/me", async ({ user }) => { ... })

// ❌ WRONG - Creates duplicate JWT instances, auth will fail
export const myRoutes = new Elysia({ prefix: "/api" })
  .use(requireAuth)  // If this internally used authMiddleware
  .post("/files", async ({ user }) => {
    // user will be null due to plugin conflict
  })

// ❌ WRONG - Inline JWT verification when parent already has JWT
export const authRoutes = new Elysia()
  .use(jwt({ ... }))  // Already has JWT
  .derive(async ({ jwt, headers }) => {  // Duplicate logic!
    const token = headers.authorization?.slice(7)
    const payload = await jwt.verify(token)
    return { user: payload }
  })
```

**Rules:**
- `authMiddleware` provides JWT plugin + user context derivation
- `requireAuth` / `requireAdmin` / `requirePermission` only check authorization, they expect `user` in context
- Routes using `requireAuth/Admin/Permission` must first `.use(authMiddleware)`
- Auth routes that define their own JWT plugins should use `authMiddleware` for protected endpoints, not duplicate the verification logic

### Services

```typescript
// ✅ Services are classes or objects with methods
// services/file.service.ts
export class FileService {
  async list(options: ListOptions): Promise<File[]> {
    return db.query.files.findMany({ ... })
  }
  
  async create(data: CreateFileInput): Promise<File> {
    // ...
  }
}

// Export singleton instance
export const fileService = new FileService()

// ❌ Not loose functions
export async function listFiles() { }
export async function createFile() { }
```

---

## Error Handling

```typescript
// ✅ Never swallow errors silently
// Backend - let errors bubble, handle at route level
try {
  await fileService.process(file)
} catch (err) {
  logger.error('File processing failed', { fileId: file.id, error: err })
  return { data: null, error: 'Processing failed' }
}

// ✅ Frontend - use error boundaries + toast
function FileUpload() {
  const mutation = useMutation({
    mutationFn: uploadFile,
    onError: (err) => {
      toast.error(`Upload failed: ${err.message}`)
    }
  })
}

// ❌ Never swallow errors
.catch(err => console.log(err))  // No!
.catch(() => {})                  // Never!
```

---

## Testing

### Testing Infrastructure

**Backend (Bun test runner):**
- Framework: Bun's built-in test runner
- Database: In-memory SQLite for isolated tests
- Location: `apps/backend/tests/`
- Scripts: `bun test`, `bun test --watch`, `bun test --coverage`

**Frontend (Vitest):**
- Framework: Vitest with jsdom environment
- Tests: React Testing Library + jest-dom
- Location: `apps/frontend/src/**/*.test.tsx`
- Scripts: `bunx vitest run`, `bunx vitest` (watch)

**Shared Package (Bun test runner):**
- Framework: Bun's built-in test runner
- Location: `packages/shared/tests/`
- Scripts: `bun test`, `bun test --watch`

**Root-level:**
- `bun run test` - Run all tests (backend + frontend + shared)
- `bun run test:watch` - Run all tests in watch mode

### Backend Testing Patterns

**Unit Tests (services, utils):**
```typescript
import { describe, expect, it, beforeAll, afterAll } from "bun:test";

describe("FileService", () => {
  beforeAll(async () => {
    // Setup: create test database
  });

  afterAll(async () => {
    // Teardown: clean up
  });

  it("should create file with valid input", async () => {
    const result = await fileService.createFile({
      name: "test.txt",
      path: "/",
      size: 1024,
      mimeType: "text/plain",
      hash: "abc123",
      uploadedBy: 1,
      parentId: null,
      metadata: null,
    });

    expect(result.id).toBeDefined();
    expect(result.name).toBe("test.txt");
  });
});
```

**Integration Tests (API routes):**
```typescript
import { beforeAll, describe, expect, it } from "bun:test";
import { Elysia } from "elysia";

describe("Files API", () => {
  let app: Elysia;

  beforeAll(() => {
    app = createTestApp(); // Minimal app with auth/setup
  });

  it("should list files for authenticated user", async () => {
    const response = await app.handle(
      new Request("http://localhost/api/files", {
        headers: { authorization: "Bearer valid-token" },
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data).toBeDefined();
  });
});
```

### Frontend Testing Patterns

**Component Tests:**
```typescript
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { Badge } from "./badge";

describe("Badge", () => {
  it("should render with default variant", () => {
    render(<Badge>Test Badge</Badge>);
    const badge = screen.getByText("Test Badge");
    expect(badge).toBeInTheDocument();
    expect(badge).toHaveClass("bg-primary");
  });

  it("should handle different variants", () => {
    render(<Badge variant="destructive">Delete</Badge>);
    const badge = screen.getByText("Delete");
    expect(badge).toHaveClass("bg-destructive");
  });
});
```

**Tests with Providers:**
```typescript
import { render, screen } from "@testing-library/react";
import { renderWithProviders } from "@/test/utils";
import { FileCard } from "./FileCard";

describe("FileCard", () => {
  it("should render file card with TanStack Query", () => {
    renderWithProviders(<FileCard file={mockFile} />);
    expect(screen.getByText(mockFile.name)).toBeInTheDocument();
  });
});
```

### Testing Best Practices

1. **Test Descriptions:** Use clear, descriptive it() statements
   - ✅ `it("should create file with valid input")`
   - ❌ `it("works")`

2. **Test Isolation:** Each test should be independent
   - Clean up before/after using beforeAll/afterAll/beforeEach/afterEach

3. **Test Coverage:** 
   - Aim for 70%+ coverage on new code
   - Focus on critical paths and complex logic
   - Don't obsess over simple getters/setters

4. **Test Data:** 
   - Use realistic test data (not "asdf", "123")
   - Reuse test helpers where possible (createTestUser, createTestFile)

5. **Async Tests:**
   - Always use async/await
   - Don't forget to await promises in beforeAll/afterAll

6. **Mocking:**
   - Prefer test doubles over mocking libraries
   - Only mock external services (API calls, file system)
   - Don't mock code you own (makes tests brittle)

---

## What NOT To Do

### Anti-Patterns

```typescript
// ❌ Don't create abstraction layers "for flexibility" before needed
// Just write the code, abstract when you have 3+ use cases

// ❌ Don't add comments explaining obvious code
// Write clearer code instead
const isActive = status === 'active'  // ✅ Clear variable name
// const isActive = status === 'active' // Check if status is active ❌

// ❌ Don't create utils files that become junk drawers
// Be specific: date-formatting.ts > utils.ts

// ❌ Don't use // TODO without a linked issue or immediate plan
// Use GitHub issues for actual TODOs

// ❌ Don't commit console.logs
// Use a proper logger in production code

// ❌ Don't install packages for trivial functionality
// 10 lines of custom code > new dependency

// ❌ Don't refactor unrelated code while implementing a feature
// Keep PRs focused: one feature or fix per change

// ❌ Don't add features that weren't requested
// Ask first, then implement
```

---

## Dependencies

### Before Adding a Package

1. **Check if it's truly needed** — Can you write this in <50 lines?
2. **Check maintenance status** — Last commit within 2 years?
3. **Check TypeScript support** — Native types or @types available?
4. **Check bundle size** — How much does it add?

### Approved Libraries

| Purpose | Library | Reason |
|---------|---------|--------|
| Video streaming | hls.js | Industry standard, no UI imposed |
| Audio playback | howler | Gapless playback, Web Audio abstraction |
| Thumbnails | sharp | Fast, comprehensive format support |
| EXIF extraction | exifr | Lightweight, browser + Node |
| Audio metadata | music-metadata | Comprehensive format support |
| PDF rendering | pdf.js | Mozilla's official library |
| Syntax highlighting | shiki | Fast, VS Code themes |
| Date formatting | date-fns | Tree-shakeable, no moment.js bloat |

### Libraries to Avoid

- **Video.js / Plyr** — Too opinionated about UI, painful to customize for darkmatter aesthetic
- **Moment.js** — Deprecated, bloated
- **Lodash (all)** — Use native ES2023+ or specific utils

---

## AI-Specific Rules

### When Generating Code

1. **Match existing patterns** — Look at 3+ similar files before writing
2. **Use shared types** — Import from `@petrel/shared`, never redefine
3. **Follow component template** — See reference below
4. **One feature per change** — Don't refactor while implementing
5. **Ask, don't guess** — If unsure about a pattern, ask

### Component Template

```typescript
// components/viewers/video-player/VideoPlayer.tsx
import { useState, useRef } from 'react'
import Hls from 'hls.js'
import { cn } from '@/lib/utils'
import { useVideoPlayer } from './use-video-player'
import { VideoControls } from './video-controls'
import type { VideoPlayerProps } from './types'

/**
 * VideoPlayer - Custom video player with HLS support
 * 
 * Uses hls.js for streaming and custom controls for darkmatter aesthetic.
 * Supports multiple audio tracks, subtitles, and quality selection.
 */
export function VideoPlayer({ src, subtitles, className }: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const { state, controls } = useVideoPlayer(videoRef, src)

  return (
    <div className={cn('relative font-mono', className)}>
      <video 
        ref={videoRef} 
        className="w-full"
        playsInline
      />
      <VideoControls state={state} controls={controls} />
    </div>
  )
}
```

### Required File Structure Per Component

```
ComponentName/
  ComponentName.tsx      # Main component
  ComponentName.test.tsx # Tests (required)
  useComponentName.ts    # Hook (if stateful)
  types.ts               # Component-specific types
  index.ts               # Re-exports
```

---

## Review Checklist

Before submitting generated code:

- [ ] All types are explicit, no `any`
- [ ] Named exports only
- [ ] Functions under 50 lines
- [ ] No prop drilling beyond 2 levels
- [ ] Uses TanStack Query for server state
- [ ] Uses `cn()` for conditional classes
- [ ] Error handling in place, no silent catches
- [ ] Matches existing file organization
- [ ] Uses shared types from `@petrel/shared`
- [ ] No `console.log` — use proper logger
- [ ] Component has accompanying types.ts
- [ ] No TODO comments without issue link
- [ ] Tests written for new features (aim for 70% coverage)
- [ ] Tests follow project conventions (patterns from existing tests)

---

## Darkmatter Aesthetic Guidelines

### Colors

```css
/* Primary palette - darkmatter theme (sharper corners variant) */
:root {
  --background: hsl(0 0% 100%);           /* Light theme */
  --foreground: hsl(220.9091 39.2857% 10.9804%);
  --card: hsl(0 0% 100%);
  --card-foreground: hsl(220.9091 39.2857% 10.9804%);
  --popover: hsl(0 0% 100%);
  --popover-foreground: hsl(220.9091 39.2857% 10.9804%);
  --primary: hsl(21.7450 65.6388% 55.4902%);     /* Orange accent */
  --primary-foreground: hsl(0 0% 100%);
  --secondary: hsl(180 17.5879% 39.0196%);      /* Teal */
  --secondary-foreground: hsl(0 0% 100%);
  --muted: hsl(220.0000 14.2857% 95.8824%);
  --muted-foreground: hsl(220 8.9362% 46.0784%);
  --accent: hsl(0 0% 93.3333%);
  --accent-foreground: hsl(220.9091 39.2857% 10.9804%);
  --destructive: hsl(0 84.2365% 60.1961%);
  --destructive-foreground: hsl(0 0% 98.0392%);
  --border: hsl(220 13.0435% 90.9804%);
  --input: hsl(220 13.0435% 90.9804%);
  --ring: hsl(21.7450 65.6388% 55.4902%);
}

.dark {
  --background: hsl(270 5.5556% 7.0588%);        /* #121213 - deep dark with purple tint */
  --foreground: hsl(0 0% 75.6863%);              /* #c1c1c3 */
  --card: hsl(0 0% 7.0588%);                     /* #121213 */
  --card-foreground: hsl(0 0% 75.6863%);
  --popover: hsl(270 5.5556% 7.0588%);
  --popover-foreground: hsl(0 0% 75.6863%);
  --primary: hsl(22.2973 75.5102% 61.5686%);     /* #d97706 - orange accent */
  --primary-foreground: hsl(270 5.5556% 7.0588%);
  --secondary: hsl(180 17.3913% 45.0980%);       /* #2dd4bf - teal */
  --secondary-foreground: hsl(270 5.5556% 7.0588%);
  --muted: hsl(0 0% 13.3333%);                   /* #222222 */
  --muted-foreground: hsl(0 0% 53.3333%);        /* #888888 */
  --accent: hsl(0 0% 20%);                       /* #333333 */
  --accent-foreground: hsl(0 0% 75.6863%);
  --destructive: hsl(180 17.3913% 45.0980%);     /* Uses teal for destructive in dark */
  --destructive-foreground: hsl(270 5.5556% 7.0588%);
  --border: hsl(0 0% 13.3333%);
  --input: hsl(0 0% 13.3333%);
  --ring: hsl(22.2973 75.5102% 61.5686%);
}

### Typography

```css
/* Monospace-focused fonts for developer aesthetic */
--font-sans: Geist Mono, ui-monospace, monospace;
--font-serif: serif;
--font-mono: JetBrains Mono, "IBM Plex Mono", Menlo, Monaco, Consolas, "Courier New", monospace;

/* Standard size scale */
--text-xs: 0.75rem;    /* 12px */
--text-sm: 0.875rem;   /* 14px */
--text-base: 1rem;     /* 16px */
--text-lg: 1.125rem;   /* 18px */
--text-xl: 1.25rem;    /* 20px */
--text-2xl: 1.5rem;    /* 24px */
```

### Spacing

```css
/* Standard comfortable spacing */
--spacing-1: 0.25rem;  /* 4px */
--spacing-2: 0.5rem;   /* 8px */
--spacing-3: 0.75rem;  /* 12px */
--spacing-4: 1rem;     /* 16px */
--spacing-6: 1.5rem;   /* 24px */
--spacing-8: 2rem;     /* 32px */
```

### Borders & Effects

```css
/* Sharp corners for minimal aesthetic */
--radius: 0.25rem;      /* 4px - sharp corners */
--radius-sm: calc(var(--radius) - 4px);
--radius-md: calc(var(--radius) - 2px);
--radius-lg: var(--radius);
--radius-xl: calc(var(--radius) + 4px);
border: 1px solid hsl(var(--border));

/* Subtle shadows system */
--shadow-x: 0px;
--shadow-y: 1px;
--shadow-blur: 4px;
--shadow-spread: 0px;
--shadow-opacity: 0.05;
--shadow-color: #000000;
--shadow-2xs: 0px 1px 4px 0px hsl(0 0% 0% / 0.03);
--shadow-xs: 0px 1px 4px 0px hsl(0 0% 0% / 0.03);
--shadow-sm: 0px 1px 4px 0px hsl(0 0% 0% / 0.05), 0px 1px 2px -1px hsl(0 0% 0% / 0.05);
--shadow: 0px 1px 4px 0px hsl(0 0% 0% / 0.05), 0px 1px 2px -1px hsl(0 0% 0% / 0.05);
--shadow-md: 0px 1px 4px 0px hsl(0 0% 0% / 0.05), 0px 2px 4px -1px hsl(0 0% 0% / 0.05);
--shadow-lg: 0px 1px 4px 0px hsl(0 0% 0% / 0.05), 0px 4px 6px -1px hsl(0 0% 0% / 0.05);
--shadow-xl: 0px 1px 4px 0px hsl(0 0% 0% / 0.05), 0px 8px 10px -1px hsl(0 0% 0% / 0.05);
--shadow-2xl: 0px 1px 4px 0px hsl(0 0% 0% / 0.13);
```

---

## Summary

Petrel is **sharing-first**, **darkmatter-aesthetic**, **performance-focused**.

Every line of code should:
1. Serve the sharing use case
2. Match the darkmatter aesthetic (deep dark backgrounds with purple tint, orange/teal accents, sharp corners)
3. Handle large files efficiently
4. Be maintainable by humans

When in doubt, ask. When confident, keep it simple.

---

*Last updated: 2026-02-04*
