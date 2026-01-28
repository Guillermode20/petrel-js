import { Outlet, createRootRoute } from '@tanstack/react-router'

import Header from '../components/Header'

export const Route = createRootRoute({
  component: () => (
    <div className="min-h-screen bg-background text-foreground">
      <Header />
      <main className="mx-auto w-full max-w-6xl px-6 py-10">
        <Outlet />
      </main>
    </div>
  ),
})
