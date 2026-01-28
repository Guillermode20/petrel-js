import { createFileRoute } from '@tanstack/react-router'

import { Badge } from '../components/ui/badge'
import { Button } from '../components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '../components/ui/card'
import { Input } from '../components/ui/input'

export const Route = createFileRoute('/')({
  component: Home,
})

function Home() {
  return (
    <div className="space-y-10">
      <section className="space-y-4">
        <Badge variant="outline">Petrel Fileserver</Badge>
        <h1 className="text-4xl font-semibold tracking-tight">
          Share files and albums with terminal-grade simplicity.
        </h1>
        <p className="text-muted-foreground max-w-2xl">
          Petrel is a minimalist fileserver designed for fast sharing of videos
          and photo albums. Built with TanStack Start, Elysia, SQLite, and a
          muted terminal aesthetic.
        </p>
        <div className="flex flex-wrap items-center gap-3">
          <Button>Open Library</Button>
          <Button variant="outline">Create Share</Button>
        </div>
      </section>

      <section className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Quick Upload</CardTitle>
            <CardDescription>
              Drop a file to generate a shareable link instantly.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Input placeholder="Paste file path or URL" />
            <Button className="w-full">Queue Upload</Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Shared Links</CardTitle>
            <CardDescription>
              Manage active shares with expiry and access controls.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <div className="flex items-center justify-between rounded-md border border-border px-3 py-2">
              <span>/s/terminal-demo</span>
              <Badge variant="secondary">24h</Badge>
            </div>
            <div className="flex items-center justify-between rounded-md border border-border px-3 py-2">
              <span>/s/album-night</span>
              <Badge variant="secondary">7d</Badge>
            </div>
            <Button variant="ghost" className="w-full">
              View all shares
            </Button>
          </CardContent>
        </Card>
      </section>
    </div>
  )
}
