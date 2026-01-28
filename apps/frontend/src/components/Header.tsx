import { Link } from '@tanstack/react-router'

import { Badge } from './ui/badge'
import { Button } from './ui/button'

export default function Header() {
  return (
    <header className="border-b border-border bg-card/40 backdrop-blur">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-4">
        <div className="flex items-center gap-3">
          <Link to="/" className="text-lg font-semibold tracking-tight">
            Petrel
          </Link>
          <Badge variant="secondary" className="text-xs">
            v0.1.0
          </Badge>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" asChild>
            <a href="/docs" aria-label="Documentation">
              Docs
            </a>
          </Button>
          <Button>Upload</Button>
        </div>
      </div>
    </header>
  )
}
