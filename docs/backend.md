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

## Service Layer Patterns

### Singleton Pattern

All services use the singleton pattern for consistent state and resource management:

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

### Service Dependencies

Services are used in route handlers:

```typescript
.get("/", async () => {
  const files = await fileService.list();
  return { data: files, error: null };
});
```

### Inter-Service Communication

Services should communicate through:
1. **Direct calls** for synchronous operations
2. **Event bus** for asynchronous side effects
3. **Job queues** for background processing

```typescript
// Good: Using event bus for side effects
async createFile(data: CreateFileInput) {
  const file = await this.dbInsert(data);
  eventBus.emit('file:created', { file }); // Decoupled side effects
  return file;
}

// Avoid: Direct service calls in transaction
async createFile(data: CreateFileInput) {
  const file = await this.dbInsert(data);
  await thumbnailService.generate(file); // Tight coupling
  await metadataService.extract(file);   // Tight coupling
  return file;
}
```

## Coupling Analysis

### Service Dependency Matrix

The following shows service-to-service dependencies and coupling scores:

| Service | Dependencies | Coupling Score | Risk Level |
|---------|-------------|----------------|------------|
| file.service.ts | metadata, thumbnail, upload | 0.6 | Medium |
| share.service.ts | file, folder | 0.4 | Low |
| stream.service.ts | file, transcode, video | 0.7 | Medium |
| upload.service.ts | file, metadata | 0.5 | Low |
| video.service.ts | transcode, thumbnail | 0.5 | Low |
| audio.service.ts | metadata | 0.3 | Low |
| folder.service.ts | file | 0.4 | Low |
| transcode.service.ts | video | 0.4 | Low |

**Interpretation**:
- **0.0-0.3**: Low coupling - well isolated
- **0.3-0.5**: Moderate coupling - acceptable
- **0.5-0.7**: High coupling - consider refactoring
- **0.7+**: Very high coupling - refactor urgently

### Coupling Reduction Strategies

#### 1. Dependency Inversion

```typescript
// Before: Direct dependency
class FileService {
  constructor(
    private thumbnailService: ThumbnailService,
    private metadataService: MetadataService
  ) {}
}

// After: Dependency inversion via interfaces
interface ThumbnailGenerator {
  generate(file: File): Promise<void>;
}

interface MetadataExtractor {
  extract(file: File): Promise<void>;
}

class FileService {
  constructor(
    private thumbnailGenerator: ThumbnailGenerator,
    private metadataExtractor: MetadataExtractor
  ) {}
}
```

#### 2. Event-Driven Decoupling

```typescript
// Use events instead of direct calls
class FileService {
  async create(data: CreateFileInput) {
    const file = await db.insert(files).values(data).returning();
    
    // Emit event instead of calling services directly
    eventBus.emit('file:created', { file });
    
    return file;
  }
}

// Handlers subscribe to events
eventBus.on('file:created', async ({ file }) => {
  await thumbnailService.generate(file);
});

eventBus.on('file:created', async ({ file }) => {
  await metadataService.extract(file);
});
```

#### 3. Mediator Pattern

For complex service interactions, use a mediator:

```typescript
class FileProcessingMediator {
  async processFile(file: File) {
    await this.extractMetadata(file);
    await this.generateThumbnails(file);
    await this.transcodeIfNeeded(file);
    await this.updateSearchIndex(file);
  }
}
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

## Caching Architecture

### Cache Manager

The caching layer uses a decorator-based approach with pluggable storage:

```typescript
// cache/cache.manager.ts
export class CacheManager {
  constructor(private storage: CacheStorage) {}
  
  async get<T>(key: string): Promise<T | null> {
    return this.storage.get(key);
  }
  
  async set<T>(key: string, value: T, ttl?: number): Promise<void> {
    await this.storage.set(key, value, ttl);
  }
  
  async delete(key: string): Promise<void> {
    await this.storage.delete(key);
  }
}
```

### Storage Implementations

1. **In-Memory Cache** (default, development)
2. **Redis Cache** (production, multi-instance)

```typescript
// cache/storage/memory.cache.ts
export class MemoryCache implements CacheStorage {
  private cache = new Map<string, CacheEntry>();
  
  async get<T>(key: string): Promise<T | null> {
    const entry = this.cache.get(key);
    if (!entry || entry.expires < Date.now()) {
      return null;
    }
    return entry.value as T;
  }
  // ...
}

// cache/storage/redis.cache.ts
export class RedisCache implements CacheStorage {
  constructor(private redis: Redis) {}
  
  async get<T>(key: string): Promise<T | null> {
    const value = await this.redis.get(key);
    return value ? JSON.parse(value) : null;
  }
  // ...
}
```

### Decorator-Based Caching

Use decorators for method-level caching:

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

### Cache Key Patterns

Standard cache key formats:

```typescript
// cache/keys.ts
export const cacheKeys = {
  file: (id: number) => `file:${id}`,
  fileList: (folderId: number | null, userId: number) => 
    `files:${folderId ?? 'root'}:${userId}`,
  share: (token: string) => `share:${token}`,
  user: (id: number) => `user:${id}`,
  folder: (id: number) => `folder:${id}`,
  thumbnail: (fileId: number, size: string) => 
    `thumbnail:${fileId}:${size}`,
};
```

### Cache Invalidation Strategies

1. **TTL-based**: Automatic expiration
2. **Event-driven**: Invalidate on data changes
3. **Tag-based**: Group related keys for bulk invalidation

```typescript
// Tag-based invalidation (recommended approach)
@Cacheable({ 
  key: (id) => cacheKeys.file(id),
  tags: ['files', 'user-files']
})
async getFile(id: number) { }

// Invalidate all 'user-files' tagged entries
await cacheManager.invalidateTag('user-files');
```

## Event System

### Event Bus Architecture

The event system uses a publish-subscribe pattern for decoupled communication:

```typescript
// events/bus.ts
class EventBus {
  private handlers = new Map<string, Set<EventHandler>>();
  
  emit(event: string, payload: unknown): void {
    const handlers = this.handlers.get(event);
    if (handlers) {
      handlers.forEach(handler => {
        // Async handlers run in background
        Promise.resolve().then(() => handler(payload));
      });
    }
  }
  
  on(event: string, handler: EventHandler): () => void {
    if (!this.handlers.has(event)) {
      this.handlers.set(event, new Set());
    }
    this.handlers.get(event)!.add(handler);
    
    // Return unsubscribe function
    return () => this.handlers.get(event)?.delete(handler);
  }
}

export const eventBus = new EventBus();
```

### Event Types

```typescript
// events/types.ts
export interface FileCreatedEvent {
  file: File;
  uploadedBy: number;
}

export interface FileDeletedEvent {
  fileId: number;
  path: string;
}

export interface ShareCreatedEvent {
  share: Share;
  createdBy: number;
}

export interface TranscodeCompletedEvent {
  fileId: number;
  quality: string;
  manifestPath: string;
}
```

### Event Handlers

Organize handlers by domain:

```typescript
// events/handlers/file-events.ts
export function registerFileEventHandlers() {
  eventBus.on('file:created', async ({ file }) => {
    // Generate thumbnails
    await thumbnailService.generate(file, 'small');
    await thumbnailService.generate(file, 'medium');
    await thumbnailService.generate(file, 'large');
    
    // Extract metadata
    await metadataService.extract(file);
    
    // Queue transcoding if video
    if (isVideoFile(file.mimeType)) {
      await transcodeService.queue(file);
    }
  });
  
  eventBus.on('file:deleted', async ({ fileId, path }) => {
    // Clean up thumbnails
    await thumbnailService.delete(fileId);
    
    // Clean up transcodes
    await transcodeService.delete(fileId);
    
    // Invalidate caches
    await cacheManager.delete(cacheKeys.file(fileId));
  });
}

// events/handlers/share-events.ts
export function registerShareEventHandlers() {
  eventBus.on('share:created', async ({ share }) => {
    // Send notification
    // Log audit event
  });
}
```

### Event Registration

Register handlers at application startup:

```typescript
// index.ts
import { registerFileEventHandlers } from './events/handlers/file-events';
import { registerShareEventHandlers } from './events/handlers/share-events';

// Register all event handlers
registerFileEventHandlers();
registerShareEventHandlers();
```

### Error Handling in Events

Event handlers should handle errors gracefully:

```typescript
eventBus.on('file:created', async ({ file }) => {
  try {
    await thumbnailService.generate(file);
  } catch (error) {
    // Log but don't throw - don't break other handlers
    logger.error('Thumbnail generation failed', { fileId: file.id, error });
  }
});
```

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

### Job Processing Pattern

```typescript
// workers/transcode.worker.ts
import { Worker } from 'bullmq';

export const transcodeWorker = new Worker(
  'transcode',
  async (job) => {
    const { fileId, quality } = job.data;
    
    // Update progress
    await job.updateProgress(10);
    
    // Process
    await transcodeService.transcode(fileId, quality);
    
    await job.updateProgress(100);
    
    // Emit completion event
    eventBus.emit('transcode:completed', { fileId, quality });
  },
  { connection: redis }
);
```

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

### Structured Error Types

```typescript
// types/errors.ts
export class ValidationError extends Error {
  constructor(message: string, public fields: string[]) {
    super(message);
    this.name = 'ValidationError';
  }
}

export class NotFoundError extends Error {
  constructor(resource: string, id: string | number) {
    super(`${resource} not found: ${id}`);
    this.name = 'NotFoundError';
  }
}

export class PermissionError extends Error {
  constructor(action: string) {
    super(`Permission denied: ${action}`);
    this.name = 'PermissionError';
  }
}
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

### Rate Limiting

```typescript
// lib/rate-limit.ts
import { rateLimit } from 'elysia-rate-limit';

app.use(rateLimit({
  max: 100,        // requests
  duration: 60000, // per minute
  key: (ctx) => ctx.user?.id ?? ctx.ip
}));
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

### Transaction Handling

```typescript
async transferFile(fileId: number, targetFolderId: number) {
  return await db.transaction(async (tx) => {
    // All operations in transaction
    const [file] = await tx
      .update(files)
      .set({ parentId: targetFolderId })
      .where(eq(files.id, fileId))
      .returning();
    
    await tx.insert(auditLogs).values({
      action: 'file:moved',
      targetId: fileId,
      details: { from: file.parentId, to: targetFolderId }
    });
    
    return file;
  });
}
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

### Integration Testing

```typescript
import { beforeAll, describe, expect, it } from "bun:test";

describe("Files API", () => {
  let app: Elysia;
  
  beforeAll(() => {
    app = createTestApp();
  });
  
  it("should list files", async () => {
    const response = await app.handle(
      new Request("http://localhost/api/files", {
        headers: { authorization: "Bearer token" }
      })
    );
    
    expect(response.status).toBe(200);
  });
});
```

## Performance Considerations

### Database Query Optimization

1. **Use indexes**: Foreign keys are already indexed
2. **Limit results**: Always use `limit` for list queries
3. **Eager loading**: Use Drizzle's `with` for relations

```typescript
// Good: Eager loading
const filesWithThumbnails = await db.query.files.findMany({
  with: {
    thumbnails: true,
    uploader: true
  },
  limit: 50
});

// Avoid: N+1 queries
const files = await db.query.files.findMany({ limit: 50 });
for (const file of files) {
  const thumbnails = await db.query.thumbnails.findMany({
    where: eq(thumbnails.fileId, file.id)
  });
}
```

### Memory Management

1. **Stream large files**: Don't buffer entire files
2. **Use generators**: For large result sets
3. **Clean up temp files**: After processing

```typescript
// Good: Streaming response
.get("/download/:id", async ({ params }) => {
  const stream = createReadStream(filePath);
  return new Response(stream);
});
```

## Security Best Practices

### Input Sanitization

```typescript
import sanitize from 'sanitize-filename';

async createFile(data: CreateFileInput) {
  const sanitizedName = sanitize(data.name);
  // ...
}
```

### Path Traversal Prevention

```typescript
import { resolve, normalize } from 'path';

function getSafePath(userPath: string, baseDir: string): string {
  const resolved = resolve(baseDir, normalize(userPath));
  if (!resolved.startsWith(baseDir)) {
    throw new Error('Path traversal detected');
  }
  return resolved;
}
```

### SQL Injection Prevention

Drizzle ORM provides protection, but be careful with raw queries:

```typescript
// Good: Parameterized queries
await db.execute(sql`SELECT * FROM files WHERE id = ${fileId}`);

// NEVER: String concatenation
await db.execute(`SELECT * FROM files WHERE id = ${fileId}`);
```
