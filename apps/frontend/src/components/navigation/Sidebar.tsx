import { Link, useLocation } from '@tanstack/react-router'
import { Files, Images, Share2, Settings, Menu } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet'
import { ScrollArea } from '@/components/ui/scroll-area'
import { useState } from 'react'

interface NavItem {
    label: string
    href: string
    icon: React.ComponentType<{ className?: string }>
}

const navItems: NavItem[] = [
    { label: 'Files', href: '/files', icon: Files },
    { label: 'Shares', href: '/shares', icon: Share2 },
    { label: 'Settings', href: '/settings', icon: Settings },
]

interface SidebarProps {
    className?: string
}

/**
 * Sidebar navigation component for desktop view
 */
export function Sidebar({ className }: SidebarProps) {
    const location = useLocation()

    return (
        <aside
            className={cn(
                'hidden w-64 shrink-0 border-r border-border bg-sidebar lg:block',
                className
            )}
        >
            <ScrollArea className="h-full py-6">
                <nav className="space-y-1 px-3">
                    {navItems.map((item) => {
                        const isActive =
                            location.pathname === item.href ||
                            location.pathname.startsWith(`${item.href}/`)
                        return (
                            <Link
                                key={item.href}
                                to={item.href}
                                className={cn(
                                    'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                                    isActive
                                        ? 'bg-primary text-primary-foreground'
                                        : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
                                )}
                            >
                                <item.icon className="h-4 w-4" />
                                {item.label}
                            </Link>
                        )
                    })}
                </nav>
            </ScrollArea>
        </aside>
    )
}

/**
 * Mobile sidebar using Sheet component
 */
export function MobileSidebar() {
    const [open, setOpen] = useState(false)
    const location = useLocation()

    return (
        <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="lg:hidden">
                    <Menu className="h-5 w-5" />
                    <span className="sr-only">Toggle navigation</span>
                </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-64 bg-sidebar p-0">
                <div className="flex h-14 items-center border-b border-border px-4">
                    <Link
                        to="/"
                        className="flex items-center gap-2 font-semibold"
                        onClick={() => setOpen(false)}
                    >
                        <span className="text-primary">▲</span>
                        <span>Petrel</span>
                    </Link>
                </div>
                <ScrollArea className="h-[calc(100vh-3.5rem)] py-6">
                    <nav className="space-y-1 px-3">
                        {navItems.map((item) => {
                            const isActive =
                                location.pathname === item.href ||
                                location.pathname.startsWith(`${item.href}/`)
                            return (
                                <Link
                                    key={item.href}
                                    to={item.href}
                                    onClick={() => setOpen(false)}
                                    className={cn(
                                        'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                                        isActive
                                            ? 'bg-primary text-primary-foreground'
                                            : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
                                    )}
                                >
                                    <item.icon className="h-4 w-4" />
                                    {item.label}
                                </Link>
                            )
                        })}
                    </nav>
                </ScrollArea>
            </SheetContent>
        </Sheet>
    )
}

export { navItems }
