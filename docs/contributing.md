# Contributing

## Development Setup

```bash
git clone <repo-url>
cd petrel-js
bun install
```

Create `.env` file:

```bash
JWT_SECRET=dev-secret-minimum-32-characters-long
JWT_REFRESH_SECRET=dev-refresh-secret-minimum-32-characters
PORT=4000
FRONTEND_URL=http://localhost:3000
```

Start development:

```bash
bun run dev
```

## Code Style

We use Biome for formatting and linting:

```bash
bun run format    # Format code
bun run lint      # Check for issues
bun run check     # Both format and lint
```

## Key Conventions

### TypeScript

**Explicit types required**:
```typescript
// ✅ Good
function processFile(file: File): ProcessedFile {
  return { id: file.id, name: file.name };
}

// ❌ Bad - implicit types
function processFile(file) {
  return file;
}
```

**No `any`**:
```typescript
// ❌ Never
function handle(data: any): any

// ✅ Use proper types
function handle(data: FileData): Result
```

**Named exports only**:
```typescript
// ✅ Good
export function Component() {}
export { Component };

// ❌ Bad
export default function Component() {}
```

### Functions

Maximum 50 lines per function. Extract helpers:

```typescript
// ✅ Good
export async function uploadFile(file: File) {
  const validated = await validateFile(file);
  if (!validated.valid) return { error: validated.error };
  return await saveFile(validated);
}

// ❌ Bad - 100+ line god function
export async function uploadFile(file: File) {
  // validation...
  // processing...
  // saving...
  // 100 lines of code
}
```

### React

**Use TanStack Query for server state**:
```typescript
// ✅ Good
const { data } = useQuery({
  queryKey: ["files"],
  queryFn: fetchFiles
});

// ❌ Never useEffect for fetching
useEffect(() => {
  fetch("/api/files").then(r => r.json()).then(setFiles);
}, []);
```

**Use `cn()` for conditional classes**:
```typescript
<div className={cn("base", isActive && "active")}>
```

## Git Workflow

1. **Create feature branch**:
   ```bash
   git checkout -b feature/my-feature
   ```

2. **Make focused commits**:
   - One feature/fix per commit
   - Clear commit messages: `feat: add drag-drop upload`

3. **Commit message format**:
   - `feat:` new feature
   - `fix:` bug fix
   - `refactor:` code change
   - `test:` adding tests
   - `docs:` documentation
   - `chore:` maintenance

4. **Before pushing**:
   ```bash
   bun run check      # Lint and format
   bun run test       # Run tests
   ```

## Testing

### Backend Tests

```typescript
import { describe, expect, it } from "bun:test";

describe("FileService", () => {
  it("should create file", async () => {
    const result = await fileService.create({
      name: "test.txt",
      size: 1024,
      mimeType: "text/plain"
    });
    expect(result.name).toBe("test.txt");
  });
});
```

Run: `bun run test:backend`

### Frontend Tests

```typescript
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";

describe("Button", () => {
  it("renders label", () => {
    render(<Button>Click</Button>);
    expect(screen.getByText("Click")).toBeInTheDocument();
  });
});
```

Run: `bun run test:frontend`

## Pull Request Guidelines

1. **PR Description**:
   - What changed and why
   - Testing performed
   - Screenshots for UI changes

2. **PR Requirements**:
   - All tests pass
   - No lint errors
   - Type check passes
   - Reviewed by at least one maintainer

3. **PR Size**:
   - Keep PRs focused and small
   - Under 500 lines when possible
   - One feature/fix per PR

## Project Structure Reminders

- **Components** go in `components/`, never inline in routes
- **Business logic** goes in `services/`, never in route handlers
- **Database queries** go in `services/`, never in routes directly
- **Shared types** go in `packages/shared`, never redefine
- **Hooks** go in `hooks/` and start with `use`

## Common Issues

### "Cannot find module"
- Check import path uses `@/` aliases
- Ensure file is in correct location

### Type errors between frontend/backend
- Check types are exported from `packages/shared`
- Run `bun install` to sync workspace

### Database errors
- Run `bun run db:push` to apply migrations
- Check `DATABASE_PATH` in `.env`

## Architectural Guidelines

### Service Layer Responsibilities

Services encapsulate all business logic and data access:

```typescript
// ✅ Good: Service handles data access
export class FileService {
  async list(folderId: number | null): Promise<File[]> {
    return db.query.files.findMany({
      where: eq(files.parentId, folderId),
      limit: 50
    });
  }
}

// ❌ Bad: Data access in route handler
app.get("/files", async () => {
  // Don't do this - business logic should be in services
  return await db.query.files.findMany();
});
```

### Route Handler Responsibilities

Route handlers should only:
1. Validate input
2. Call service methods
3. Format response
4. Handle HTTP-specific concerns (status codes, headers)

```typescript
// ✅ Good: Thin route handler
.post("/files", async ({ body, user }) => {
  const file = await fileService.create({
    ...body,
    uploadedBy: user.id
  });
  return { data: file, error: null };
}, {
  body: CreateFileSchema,
  response: { 200: FileResponseSchema }
});
```

### Event-Driven Architecture

Use the event bus for decoupled side effects:

```typescript
// Service emits events
async createFile(data: CreateFileInput) {
  const file = await this.dbInsert(data);
  eventBus.emit('file:created', { file });
  return file;
}

// Handlers process side effects
// events/handlers/file-events.ts
eventBus.on('file:created', async ({ file }) => {
  await thumbnailService.generate(file);
  await metadataService.extract(file);
});
```

### Caching Strategy

Use decorators for method-level caching:

```typescript
class FileService {
  @Cacheable({ key: (id) => `file:${id}`, ttl: 300 })
  async getById(id: number): Promise<File | null> {
    // Cached for 5 minutes
  }
  
  @CacheEvict({ key: (id) => `file:${id}` })
  async update(id: number, data: UpdateFileInput): Promise<File> {
    // Cache evicted after update
  }
}
```

### Error Handling Patterns

#### Backend

```typescript
// Define custom error types
export class NotFoundError extends Error {
  constructor(resource: string, id: string | number) {
    super(`${resource} not found: ${id}`);
    this.name = 'NotFoundError';
  }
}

// Service throws domain errors
async getFile(id: number): Promise<File> {
  const file = await db.query.files.findFirst({
    where: eq(files.id, id)
  });
  if (!file) throw new NotFoundError('File', id);
  return file;
}

// Route handler maps to HTTP status
.onError(({ error, set }) => {
  if (error instanceof NotFoundError) {
    set.status = 404;
    return { data: null, error: error.message };
  }
  if (error instanceof ValidationError) {
    set.status = 400;
    return { data: null, error: error.message };
  }
  set.status = 500;
  return { data: null, error: 'Internal server error' };
});
```

#### Frontend

```typescript
// Use error boundaries for component errors
<ErrorBoundary fallback={<ErrorMessage />}>
  <FileBrowser />
</ErrorBoundary>

// Use toast notifications for async errors
const mutation = useMutation({
  mutationFn: uploadFile,
  onError: (error) => {
    toast.error(`Upload failed: ${error.message}`);
  }
});
```

## Code Review Checklist

### General

- [ ] Code follows existing patterns and conventions
- [ ] All functions are under 50 lines
- [ ] No `any` types used
- [ ] Named exports only (no default exports)
- [ ] No `console.log` statements (use proper logger)
- [ ] No TODO comments without linked issue

### TypeScript

- [ ] Explicit return types on all functions
- [ ] Proper use of shared types from `@petrel/shared`
- [ ] No type assertions (`as`) without good reason
- [ ] Enums use const assertions where appropriate

### Backend

- [ ] Business logic is in services, not routes
- [ ] Database queries use Drizzle's typed API
- [ ] Input validation uses Zod schemas
- [ ] Response shape follows `{ data, error }` pattern
- [ ] Cache invalidation is handled for mutations
- [ ] Events emitted for side effects
- [ ] Error handling is comprehensive

### Frontend

- [ ] TanStack Query used for server state
- [ ] `useState` only for local UI state
- [ ] Custom hooks extracted for complex logic
- [ ] No prop drilling beyond 2 levels
- [ ] `cn()` utility used for conditional classes
- [ ] Components have accompanying `types.ts`
- [ ] Error boundaries added for error-prone components

### Testing

- [ ] Unit tests for new utilities/services
- [ ] Component tests for new UI components
- [ ] Integration tests for new API endpoints
- [ ] Tests use realistic data
- [ ] Mock external services only

### Performance

- [ ] No N+1 query patterns
- [ ] Pagination used for list queries
- [ ] `React.memo()` used for expensive components
- [ ] Lazy loading used for routes when appropriate
- [ ] Images use lazy loading

### Security

- [ ] Input sanitization for user-provided data
- [ ] Path traversal prevention for file operations
- [ ] SQL injection prevention (use parameterized queries)
- [ ] XSS prevention (no dangerouslySetInnerHTML without sanitization)

## Common Refactoring Patterns

### Extracting a Service

When business logic grows in a route handler:

```typescript
// Before: Logic in route
app.post("/files", async ({ body }) => {
  // Validation
  const validated = FileSchema.parse(body);
  
  // Database insert
  const [file] = await db.insert(files).values(validated).returning();
  
  // Side effects
  await thumbnailService.generate(file);
  await metadataService.extract(file);
  
  return { data: file, error: null };
});

// After: Extracted to service
// services/file.service.ts
export class FileService {
  async create(data: CreateFileInput): Promise<File> {
    const file = await db.transaction(async (tx) => {
      const [created] = await tx.insert(files).values(data).returning();
      return created;
    });
    
    eventBus.emit('file:created', { file });
    return file;
  }
}

// routes.ts
app.post("/files", async ({ body }) => {
  const file = await fileService.create(body);
  return { data: file, error: null };
}, { body: CreateFileSchema });
```

### Breaking Down a Large Component

```typescript
// Before: 550+ line component
export function FileBrowser() {
  // State, effects, handlers all in one component
  // ...
}

// After: Decomposed with custom hooks
// hooks/useFileBrowser.ts
export function useFileBrowser(folderId: number | null) {
  const { data: files } = useFiles(folderId);
  const selection = useFileSelection(files);
  const upload = useFileUpload(folderId);
  // ...
  return { files, selection, upload };
}

// FileBrowser.tsx
export function FileBrowser() {
  const { files, selection, upload } = useFileBrowser(folderId);
  
  return (
    <div>
      <FileBrowserToolbar selection={selection} />
      <FileBrowserContent files={files} selection={selection} />
      <UploadProgress uploads={upload.uploads} />
    </div>
  );
}
```

### Converting to Event-Driven

```typescript
// Before: Direct coupling
class FileService {
  constructor(
    private thumbnailService: ThumbnailService,
    private metadataService: MetadataService
  ) {}
  
  async create(data: CreateFileInput) {
    const file = await this.dbInsert(data);
    await this.thumbnailService.generate(file);
    await this.metadataService.extract(file);
    return file;
  }
}

// After: Event-driven
class FileService {
  async create(data: CreateFileInput) {
    const file = await this.dbInsert(data);
    eventBus.emit('file:created', { file });
    return file;
  }
}

// Register handlers
eventBus.on('file:created', ({ file }) => {
  thumbnailService.generate(file);
});

eventBus.on('file:created', ({ file }) => {
  metadataService.extract(file);
});
```

### Adding Caching

```typescript
// Before: No caching
async getFileById(id: number): Promise<File | null> {
  return db.query.files.findFirst({
    where: eq(files.id, id)
  });
}

// After: With caching
class FileService {
  @Cacheable({ 
    key: (id) => cacheKeys.file(id),
    ttl: 300 // 5 minutes
  })
  async getById(id: number): Promise<File | null> {
    return db.query.files.findFirst({
      where: eq(files.id, id)
    });
  }
  
  @CacheEvict({ key: (id) => cacheKeys.file(id) })
  async update(id: number, data: UpdateFileInput): Promise<File> {
    // Cache automatically cleared
  }
}
```

## Performance Optimization Patterns

### Database Query Optimization

```typescript
// ❌ Bad: N+1 queries
const folders = await db.query.folders.findMany();
for (const folder of folders) {
  folder.files = await db.query.files.findMany({
    where: eq(files.parentId, folder.id)
  });
}

// ✅ Good: Eager loading
const folders = await db.query.folders.findMany({
  with: { files: true }
});
```

### Frontend State Optimization

```typescript
// ❌ Bad: Unnecessary re-renders
function FileList({ files }: { files: File[] }) {
  const [searchQuery, setSearchQuery] = useState('');
  
  // Filtered on every render
  const filtered = files.filter(f => 
    f.name.includes(searchQuery)
  );
  
  return <div>{filtered.map(...)}</div>;
}

// ✅ Good: Memoized filtering
function FileList({ files }: { files: File[] }) {
  const [searchQuery, setSearchQuery] = useState('');
  
  const filtered = useMemo(() => 
    files.filter(f => f.name.includes(searchQuery)),
    [files, searchQuery]
  );
  
  return <div>{filtered.map(...)}</div>;
}
```

### API Response Optimization

```typescript
// ❌ Bad: Returning unnecessary data
app.get("/files", async () => {
  const files = await db.query.files.findMany({
    with: {
      thumbnails: true,
      uploader: true,
      shares: true
    }
  });
  return { data: files, error: null };
});

// ✅ Good: Select only needed columns
app.get("/files", async () => {
  const files = await db
    .select({
      id: filesTable.id,
      name: filesTable.name,
      size: filesTable.size,
      thumbnailUrl: thumbnails.url
    })
    .from(filesTable)
    .leftJoin(thumbnails, eq(thumbnails.fileId, filesTable.id))
    .limit(50);
  
  return { data: files, error: null };
});
```

## Questions?

- Check existing code for patterns
- Ask in issues or discussions
- Review `AGENTS.md` for detailed guidelines
- Consult the [Architecture](./architecture.md) documentation
- Review the [Backend](./backend.md) patterns guide
- See the [Frontend](./frontend.md) development guide
