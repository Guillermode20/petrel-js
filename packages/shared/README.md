# @petrel/shared

Shared TypeScript types and interfaces used across the Petrel monorepo.

## Purpose

This package contains:
- Database entity types (User, File, Folder, etc.)
- Metadata types (VideoMetadata, AudioMetadata, ImageMetadata)
- API request/response types
- Shared enums and constants

## Usage

### In Backend (Elysia)

```typescript
import type { User, File, VideoMetadata } from '@petrel/shared'

// Use in route handlers
app.get('/api/files/:id', async ({ params }): Promise<File> => {
  const file = await fileService.getById(params.id)
  return file
})
```

### In Frontend (React)

```typescript
import type { File, VideoMetadata } from '@petrel/shared'

interface FileCardProps {
  file: File
}

export function FileCard({ file }: FileCardProps) {
  const metadata = file.metadata as VideoMetadata
  return <div>{file.name}</div>
}
```

## Type Safety

All types are exported with explicit TypeScript types. No `any` types are permitted in this package per project guidelines.

## Metadata Types

### VideoMetadata
Contains duration, resolution, codec info, audio tracks, and subtitle information.

### AudioMetadata
Contains duration, codec, bitrate, ID3 tags (title, artist, album), and album art flag.

### ImageMetadata
Contains dimensions, format, and comprehensive EXIF data including camera info, GPS coordinates, and exposure settings.

## Adding New Types

1. Add type definition to `src/types/index.ts`
2. Export from `src/index.ts` (already done via wildcard export)
3. Run `bun run type-check` to validate
4. Types are automatically available in frontend and backend
