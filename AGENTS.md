# Petrel AI Coding Guidelines

> Rules and conventions for AI coding assistants working on the Petrel project.

---

## Core Philosophy

Petrel is a **sharing-first media fileserver** with a sleek darkmatter aesthetic. Every feature should serve the goal of effortless media sharing while maintaining visual consistency.

**Key Principles:**
- Sharing is the primary use case — not just storage, not just viewing
- Darkmatter aesthetic: deep dark backgrounds, purple/violet accents, modern rounded components
- Performance matters for large files (streaming > downloading)
- Web-compatible formats are handled gracefully, others are transcoded

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

### Frontend (`apps/web/src`)

```
components/
  ui/                    # shadcn primitives only
    button.tsx
    input.tsx
  file-browser/          # Domain-specific components
    FileCard.tsx
    FileGrid.tsx
  viewers/               # Media viewers
    video-player/
      VideoPlayer.tsx    # Main component
      useVideoPlayer.ts  # Hook
      VideoControls.tsx  # Sub-component
      types.ts           # Component types
    audio-player/
    image-viewer/
  sharing/
    ShareModal.tsx
    ShareTable.tsx

routes/                  # TanStack file routes
  files/
    index.tsx
    $fileId.tsx
  s/
    $token.tsx           # Public share view

hooks/                   # Global hooks
  useAuth.ts
  useFiles.ts

lib/                     # Utilities
  utils.ts
  api.ts
```

### Backend (`apps/api/src`)

```
routes/                  # API route handlers
  auth.ts                # One file per resource
  files.ts
  shares.ts
  stream.ts              # HLS endpoints

services/                # Business logic
  file.service.ts        # Classes or objects with methods
  transcode.service.ts
  thumbnail.service.ts

jobs/                    # Background job handlers
  queue.ts
  transcode.job.ts
  thumbnail.job.ts

db/
  schema.ts              # Drizzle schema
  index.ts

lib/                     # Utilities
  ffmpeg.ts
  storage.ts
```

**Critical Rules:**
- Components go in `components/`, never inline in routes
- Business logic goes in `services/`, never in route handlers
- Database queries go in `services/`, never in routes directly
- Shared types go in `packages/shared`, import from there

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

```typescript
// ✅ Services testable in isolation
class TranscodeService {
  constructor(private ffmpeg: FFmpeg, private storage: Storage) { }
  // Inject dependencies for testing
}

// ✅ No database mocking - use test SQLite instance
// tests/file.service.test.ts
const testDb = createTestDatabase()
const service = new FileService(testDb)

// ✅ Integration tests for API routes
// tests/files.routes.test.ts
const response = await app.handle(new Request('/api/files'))
expect(await response.json()).toEqual({ data: [], error: null })
```

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

## Project Status

Phase 1 is complete: the shared package is online, all approved media libraries are installed, and the schema now includes metadata-aware files, transcode jobs, video tracks, and subtitles. Continue with Phase 2 per docs/plan.todo.md.

## AI-Specific Rules

### When Generating Code

1. **Match existing patterns** — Look at 3+ similar files before writing
2. **Use shared types** — Import from `@petrel/shared`, never redefine, and keep the shared README in sync when you add new interfaces
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
  useComponentName.ts    # Hook (if stateful)
  ComponentName.test.tsx # Tests
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

---

## Darkmatter Aesthetic Guidelines

### Colors

```css
/* Primary palette - darkmatter theme from tweakcn.com */
--background: 240 6% 6%;           /* #0f0f10 - deep dark */
--foreground: 0 0% 97%;            /* #f7f7f8 - off-white */
--card: 240 6% 6%;                 /* #0f0f10 */
--card-foreground: 0 0% 97%;       /* #f7f7f8 */
--popover: 240 6% 6%;              /* #0f0f10 */
--popover-foreground: 0 0% 97%;    /* #f7f7f8 */
--primary: 263 70% 66%;            /* #a668fc - purple/violet accent */
--primary-foreground: 0 0% 100%;   /* #ffffff */
--secondary: 240 4% 16%;           /* #27272a - elevated surfaces */
--secondary-foreground: 0 0% 97%;  /* #f7f7f8 */
--muted: 240 4% 16%;               /* #27272a */
--muted-foreground: 240 4% 46%;    /* #71717a - zinc-500 */
--accent: 263 70% 66%;             /* #a668fc */
--accent-foreground: 0 0% 100%;    /* #ffffff */
--destructive: 0 84% 60%;          /* #ef4444 - red-500 */
--destructive-foreground: 0 0% 100%;
--border: 240 4% 16%;              /* #27272a */
--input: 240 4% 16%;               /* #27272a */
--ring: 263 70% 66%;               /* #a668fc */
```

### Typography

```css
/* Clean sans-serif system fonts */
font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;

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
/* Rounded corners - modern feel */
--radius: 0.75rem;      /* 12px for large components */
--radius-sm: 0.5rem;    /* 8px for buttons/inputs */
--radius-lg: 1rem;      /* 16px for cards/modals */
border: 1px solid hsl(var(--border));

/* Subtle shadows for elevation */
--shadow-sm: 0 1px 2px 0 rgb(0 0 0 / 0.3);
--shadow: 0 4px 6px -1px rgb(0 0 0 / 0.4);
--shadow-lg: 0 10px 15px -3px rgb(0 0 0 / 0.5);
```

---

## Summary

Petrel is **sharing-first**, **darkmatter-aesthetic**, **performance-focused**.

Every line of code should:
1. Serve the sharing use case
2. Match the darkmatter aesthetic (deep darks, purple accents, modern rounded corners)
3. Handle large files efficiently
4. Be maintainable by humans

When in doubt, ask. When confident, keep it simple.

---

*Last updated: 2026-01-28*
