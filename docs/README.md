# Petrel Development Documentation

Technical documentation for developers working on Petrel.

## Quick Start

```bash
bun install          # Install dependencies
bun run dev          # Start dev servers (backend + frontend)
bun run test         # Run all tests
bun run lint         # Run linter
```

## Documentation

- [Architecture](./architecture.md) - System design, data flow, and tech stack
- [Backend Development](./backend.md) - Module structure, services, and API patterns
- [Frontend Development](./frontend.md) - Component organization, state management, and routing
- [Database & Models](./database.md) - Schema, migrations, and query patterns
- [Contributing](./contributing.md) - Code style, testing, and PR guidelines

## Tech Stack

- **Runtime**: Bun
- **Backend**: Elysia (framework), Drizzle ORM, SQLite, BullMQ
- **Frontend**: React, TanStack Router, TanStack Query, Tailwind CSS
- **Testing**: Bun test runner (backend), Vitest (frontend)
- **Linting**: Biome
