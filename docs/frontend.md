# Frontend Development

## Routing

TanStack Router uses file-based routing. Files in `src/routes/` become URLs:

```
routes/
├── __root.tsx              # Root layout (wraps all pages)
├── index.tsx               # Redirect to /files
├── files/
│   ├── index.tsx           # /files (file browser root)
│   └── $folderId.tsx       # /files/:folderId (specific folder)
├── s/
│   └── $token.tsx          # /s/:token (public share)
├── shares.tsx              # /shares (manage shares)
└── settings.tsx            # /settings
```

### Creating a Route

```typescript
// routes/my-route.tsx
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/my-route")({
  component: MyRouteComponent,
});

function MyRouteComponent() {
  return <div>My Route</div>;
}
```

## Data Fetching

Use TanStack Query via custom hooks:

```typescript
// hooks/useFiles.ts
import { useQuery, useMutation } from "@tanstack/react-query";

export function useFiles(folderId: number | null) {
  return useQuery({
    queryKey: ["files", folderId],
    queryFn: () => api.files.list(folderId),
  });
}

export function useCreateFile() {
  return useMutation({
    mutationFn: api.files.create,
    onSuccess: () => {
      // Invalidate and refetch
      queryClient.invalidateQueries({ queryKey: ["files"] });
    },
  });
}
```

Use in components:

```typescript
function FileBrowser() {
  const { data, isLoading } = useFiles(folderId);
  const createMutation = useCreateFile();
  
  if (isLoading) return <Loading />;
  
  return (
    <div>
      {data?.files.map(file => <FileCard key={file.id} file={file} />)}
    </div>
  );
}
```

## Component Organization

Components grouped by domain:

```
components/
├── ui/                    # shadcn primitives (Button, Input, Dialog)
│   ├── button.tsx
│   └── dialog.tsx
├── file-browser/          # File management components
│   ├── FileBrowser.tsx
│   ├── FileCard.tsx
│   ├── FileList.tsx
│   └── UploadZone.tsx
├── viewers/               # Media viewers
│   ├── video-player/
│   ├── audio-player/
│   ├── image-viewer/
│   └── document-viewer/
├── sharing/               # Share-related components
│   ├── CreateShareModal.tsx
│   └── ShareTable.tsx
└── settings/              # Settings components
    ├── SettingsProfile.tsx
    └── SettingsAccounts.tsx
```

## Component Patterns

Functional components with hooks:

```typescript
// components/file-browser/FileCard.tsx
import { useState } from "react";
import { cn } from "@/lib/utils";

interface FileCardProps {
  file: File;
  onSelect?: (file: File) => void;
}

export function FileCard({ file, onSelect }: FileCardProps) {
  const [isHovered, setIsHovered] = useState(false);
  
  return (
    <div
      className={cn(
        "p-4 border rounded",
        isHovered && "bg-accent"
      )}
      onMouseEnter={() => setIsHovered(true)}
      onClick={() => onSelect?.(file)}
    >
      {file.name}
    </div>
  );
}
```

## Custom Hooks

Extract reusable logic:

```typescript
// components/viewers/video-player/useVideoPlayer.ts
import { useRef, useState } from "react";
import Hls from "hls.js";

export function useVideoPlayer(src: string) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  
  const play = () => {
    videoRef.current?.play();
    setIsPlaying(true);
  };
  
  return { videoRef, isPlaying, play };
}
```

## Context Menu System

Global context menus via provider:

```typescript
// In your component
const { showContextMenu } = useContextMenu();

const handleRightClick = (e: MouseEvent, file: File) => {
  e.preventDefault();
  showContextMenu(e, [
    { label: "Download", onClick: () => download(file) },
    { label: "Share", onClick: () => share(file) },
    { label: "Delete", onClick: () => delete(file), danger: true },
  ]);
};
```

## Styling

Tailwind CSS with `cn()` utility for conditional classes:

```typescript
import { cn } from "@/lib/utils";

<div className={cn(
  "base-classes",
  isActive && "active-classes",
  size === "large" ? "text-lg" : "text-sm"
)}>
```

## API Client

Use the typed API client in `src/lib/api.ts`:

```typescript
import { api } from "@/lib/api";

// GET files in folder
const { items, currentFolder } = await api.getFiles({ folderId: 1 });

// GET single file
const file = await api.getFile(fileId);

// Upload with progress
await api.uploadFile(file, folderId, (progress) => {
  console.log(`${progress}%`);
});

// Create share
const share = await api.createShare({
  type: "file",
  targetId: fileId,
  expiresAt: "2026-12-31",
});
```

## Testing

Frontend tests use Vitest with React Testing Library:

```typescript
// FileCard.test.tsx
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { FileCard } from "./FileCard";

describe("FileCard", () => {
  it("renders file name", () => {
    render(<FileCard file={mockFile} />);
    expect(screen.getByText("test.txt")).toBeInTheDocument();
  });
});
```

Run with `bunx vitest`.

## Error Boundaries

Catch errors with error boundaries:

```typescript
import { ErrorBoundary } from "@/components/ErrorBoundary";

<ErrorBoundary fallback={<ErrorMessage />}>
  <FileBrowser />
</ErrorBoundary>
```

## Performance

- Use `React.memo()` for expensive components
- Virtualize long lists with `@tanstack/react-virtual`
- Lazy load routes with `React.lazy()`
- Images use lazy loading with blur placeholders
