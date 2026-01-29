import { useState } from 'react'
import { LogIn } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card'
import { useAuth } from '@/hooks/useAuth'
import { cn } from '@/lib/utils'

/**
 * LoginForm - Authentication form for Petrel
 * 
 * Provides username/password login with error handling.
 * Follows darkmatter aesthetic with purple accents.
 */
export function LoginForm() {
    const [username, setUsername] = useState('')
    const [password, setPassword] = useState('')
    const { login, isLoggingIn, loginError } = useAuth()

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        try {
            await login(username, password)
        } catch (error) {
            // Error is handled by useAuth hook
        }
    }

    return (
        <div className="flex min-h-screen items-center justify-center bg-background p-4">
            <Card className="w-full max-w-md">
                <CardHeader className="space-y-3 text-center">
                    <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                        <LogIn className="h-6 w-6 text-primary" />
                    </div>
                    <CardTitle className="text-2xl">Welcome to Petrel</CardTitle>
                    <CardDescription>
                        Sign in to access your media fileserver
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="username">Username</Label>
                            <Input
                                id="username"
                                type="text"
                                placeholder="admin"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                disabled={isLoggingIn}
                                autoComplete="username"
                                autoFocus
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="password">Password</Label>
                            <Input
                                id="password"
                                type="password"
                                placeholder="••••••••"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                disabled={isLoggingIn}
                                autoComplete="current-password"
                                required
                            />
                        </div>
                        {loginError && (
                            <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                                {loginError instanceof Error ? loginError.message : 'Invalid credentials'}
                            </div>
                        )}
                        <Button
                            type="submit"
                            className="w-full"
                            disabled={isLoggingIn || !username || !password}
                        >
                            {isLoggingIn ? (
                                <>
                                    <span className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                                    Signing in...
                                </>
                            ) : (
                                <>
                                    <LogIn className="mr-2 h-4 w-4" />
                                    Sign In
                                </>
                            )}
                        </Button>
                    </form>
                    <div className="mt-6 text-center text-sm text-muted-foreground">
                        <p>Default credentials:</p>
                        <p className="font-mono">
                            <span className={cn('text-foreground')}>admin</span> / admin123
                        </p>
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}
