# Backend Development

## Module Structure

Each feature lives in `src/modules/<feature>/` with this structure:

```
modules/
├── auth/
│   ├── index.ts        # Module exports
│   ├── routes.ts       # Elysia route definitions
│   ├── middleware.ts   # Auth middleware + JWT
│   ├── permissions.ts  # Permission checking
│   └── types.ts        # Auth-specific types
├── files/
│   ├── index.ts        # Aggregates all file routes
│   ├── guards.ts       # Permission guards
│   ├── types.ts        # Request/response types
│   └── routes/         # Split by functionality
│       ├── index.ts
│       ├── list.routes.ts
│       ├── upload.routes.ts
│       ├── download.routes.ts
│       ├── mutate.routes.ts
│       ├── folder.routes.ts
│       ├── media.routes.ts
│       └── zip.routes.ts
```

## Creating a Route Module

Example module pattern:

```typescript
// modules/example/routes.ts
import { Elysia } from "elysia";
import { authMiddleware } from "../auth/middleware";
import { requirePermission } from "../auth/permissions";

export const exampleRoutes = new Elysia({ prefix: "/api/example" })
  .use(authMiddleware)                    // Adds JWT + user to context
  .use(requirePermission("read"))         // Checks permission
  .get("/", async ({ user }) => {         // user from authMiddleware
    return { data: items, error: null };
  });
```

**Critical**: Never duplicate JWT plugin instances. Always use `authMiddleware` which provides the JWT plugin + user derivation.

## Services

Services are classes encapsulating business logic in `src/services/`:

```typescript
// services/file.service.ts
export class FileService {
  async create(data: CreateFileInput): Promise<File> {
    // Business logic here
    return file;
  }
}

// Export singleton
export const fileService = new FileService();
```

Available services: `file.service.ts`, `folder.service.ts`, `upload.service.ts`, `share.service.ts`, `media.service.ts`, `video.service.ts`, `audio.service.ts`, `transcode.service.ts`, `stream.service.ts`, `zip.service.ts`, `metadata.service.ts`, `storage-sync.service.ts`, `token.service.ts`, `user.service.ts`

Services are used in route handlers:

```typescript
.get("/", async () => {
  const files = await fileService.list();
  return { data: files, error: null };
});
```

## Response Format

All API responses use this shape:

```typescript
{
  data: T | null;
  error: string | null;
}
```

Success:
```typescript
return { data: result, error: null };
```

Error:
```typescript
set.status = 400;
return { data: null, error: "Invalid input" };
```

## Validation

Use Elysia's built-in validation with TypeBox:

```typescript
.post("/", async ({ body }) => {
  // body is typed
}, {
  body: t.Object({
    name: t.String(),
    size: t.Number()
  }),
  response: {
    200: ResponseSchema,
    400: ErrorSchema
  }
});
```

## Caching

Use decorators for method-level caching in `src/cache/decorators/`:

```typescript
import { Cacheable } from "../cache/decorators/cacheable";

class FileService {
  @Cacheable({ key: (id) => `file:${id}`, ttl: 300 })
  async getById(id: number): Promise<File | null> {
    // Cached for 5 minutes (300 seconds)
  }
}
```

Evict cache on mutations:

```typescript
import { CacheEvict } from "../cache/decorators/cache-evict";

@CacheEvict({ key: (id) => `file:${id}` })
async deleteFile(id: number): Promise<void> {
  // Cache evicted after deletion
}
```

## Events

Emit events for side effects via `src/events/bus.ts`:

```typescript
import { eventBus } from "../events/bus";

// Emit
eventBus.emit("file:created", { file });

// Handler in events/handlers/file-events.ts
eventBus.on("file:created", async ({ file }) => {
  await mediaService.getThumbnail(file, "medium");
});
```

Available events: `file:created`, `file:deleted`, `file:updated`, `folder:created`, `folder:deleted`, `share:created`, `share:deleted`, `transcode:completed`, `zip:completed`, etc. See `src/events/types.ts` for full list.

## Background Jobs

Queue jobs for heavy processing via BullMQ in `src/queues/connection.ts`:

```typescript
import { getQueue } from "../queues/connection";

// Add job
const transcodeQueue = getQueue("transcode");
await transcodeQueue?.add("transcode", {
  fileId: file.id,
  quality: "1080p"
});

// Workers process in src/workers/transcode.worker.ts and zip.worker.ts
```

Available queues: `transcode`, `thumbnail`, `zip`

## Error Handling

Central error handling in `index.ts`:

```typescript
.onError(({ error, set }) => {
  set.status = error instanceof ValidationError ? 400 : 500;
  return {
    error: error.message,
    correlationId
  };
});
```

## Middleware

Request logging and correlation IDs:

```typescript
.derive(({ headers }) => {
  const correlationId = headers["x-correlation-id"] ?? generateCorrelationId();
  return {
    correlationId,
    log: createChildLogger({ correlationId })
  };
});
```

## Database Access

Use Drizzle ORM:

```typescript
import { db } from "../db";

const files = await db.query.files.findMany({
  where: eq(filesTable.parentId, folderId),
  limit: 50
});
```

## Testing

Backend tests use Bun's built-in test runner:

```typescript
import { describe, expect, it } from "bun:test";

describe("FileService", () => {
  it("should create file with valid input", async () => {
    const result = await fileService.create({
      name: "test.txt",
      // ...
    });
    expect(result.name).toBe("test.txt");
  });
});
```

Run with `bun test`.
