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

## Questions?

- Check existing code for patterns
- Ask in issues or discussions
- Review `AGENTS.md` for detailed guidelines
