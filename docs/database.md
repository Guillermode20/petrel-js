# Database & Models

## Schema Overview

Petrel uses SQLite with Drizzle ORM. The schema is defined in the backend.

## Entities

### Users
```typescript
{
  id: number;
  username: string;
  passwordHash: string;
  role: "admin" | "manager" | "editor" | "user" | "viewer" | "guest";
  createdAt: Date;
}
```

### Files
```typescript
{
  id: number;
  name: string;
  path: string;           // Full path in storage
  size: number;           // Bytes
  mimeType: string;
  hash: string;           // SHA-256 for deduplication
  uploadedBy: number | null;
  parentId: number | null; // Folder ID
  thumbnailPath: string | null;
  createdAt: Date;
}
```

### Folders
```typescript
{
  id: number;
  name: string;
  path: string;
  parentId: number | null;
  ownerId: number | null;
}
```

### Shares
```typescript
{
  id: number;
  type: "file" | "folder";
  targetId: number;       // File or folder ID
  token: string;          // Unique share token
  createdBy: number | null;
  expiresAt: Date | null;
  passwordHash: string | null;
  downloadCount: number;
  viewCount: number;
  createdAt: Date;
}
```

### Supporting Tables

- **refresh_tokens**: JWT refresh token storage with expiry and revocation
- **video_tracks**: Video/audio/subtitle track info
- **subtitles**: Extracted subtitle files
- **transcode_jobs**: Video transcoding queue status
- **zip_jobs**: ZIP archive generation job tracking
- **user_settings**: JSON user preferences
- **share_settings**: Per-share permission settings (allowDownload, allowZip, etc.)

## Query Patterns

### Basic Queries

```typescript
import { db } from "../db";
import { files, folders } from "../db/schema";
import { eq, and, like } from "drizzle-orm";

// Single item
const file = await db.query.files.findFirst({
  where: eq(files.id, fileId)
});

// List with filter
const files = await db.query.files.findMany({
  where: and(
    eq(files.parentId, folderId),
    like(files.name, "%search%")
  ),
  limit: 50,
  offset: 0
});

// Join
const filesWithThumbnails = await db
  .select()
  .from(files)
  .leftJoin(folders, eq(files.parentId, folders.id))
  .where(eq(files.uploadedBy, userId));
```

### Insert

```typescript
const [newFile] = await db
  .insert(files)
  .values({
    name: "document.pdf",
    path: "/storage/document.pdf",
    size: 1024,
    mimeType: "application/pdf",
    hash: "abc123...",
    uploadedBy: 1,
    parentId: null
  })
  .returning();
```

### Update

```typescript
await db
  .update(files)
  .set({ name: "new-name.pdf" })
  .where(eq(files.id, fileId));
```

### Delete

```typescript
await db
  .delete(files)
  .where(eq(files.id, fileId));
```

## Migrations

Generate migrations after schema changes:

```bash
cd apps/backend
bun run db:generate
```

Apply migrations:

```bash
bun run db:push
```

## Relationships

### File Hierarchy
- Files have `parentId` → Folders
- Folders have `parentId` → Folders (self-referential)

### Ownership
- Files have `uploadedBy` → Users
- Folders have `ownerId` → Users
- Shares have `createdBy` → Users

## Shared Types

Types are shared in `packages/shared`:

```typescript
// packages/shared/src/types/index.ts
export interface File {
  id: number;
  name: string;
  // ...
}
```

Import in both frontend and backend:

```typescript
import type { File, Folder } from "@petrel/shared";
```

## JSON Fields

User settings stored as JSON:

```typescript
// Schema
userSettings: text("settings", { mode: "json" })

// Usage
const settings: UserSettings = {
  theme: "dark",
  playback: { autoplay: true }
};

await db
  .update(users)
  .set({ settings })
  .where(eq(users.id, userId));
```

## Best Practices

1. **Always use typed queries**: Drizzle provides type safety
2. **Use transactions** for multi-step operations
3. **Index foreign keys**: Already in schema for `parentId`, `uploadedBy`
4. **Limit large queries**: Use pagination (limit/offset)
5. **Check for nulls**: SQLite is strict about null handling
