# petrel-js

A sharing-first media fileserver with a sleek darkmatter aesthetic.

## Features

- **Sharing-first**: Effortless media sharing as the primary use case
- **Darkmatter aesthetic**: Deep dark backgrounds with purple tint, orange/teal accents, and sharp corners
- **Performance optimized**: Streaming support for large files
- **Modern stack**: Built with TypeScript, React, and Elysia

## Getting Started

To install dependencies:

```bash
bun install
```

To run:

```bash
bun run index.ts
```

## Development

This project uses a monorepo structure with:
- `apps/frontend` - React frontend with TailwindCSS
- `apps/backend` - Elysia API server
- `packages/shared` - Shared TypeScript types

This project was created using `bun init` in bun v1.3.0. [Bun](https://bun.com) is a fast all-in-one JavaScript runtime.
