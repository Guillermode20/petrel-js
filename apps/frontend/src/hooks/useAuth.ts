import { useState, useCallback, useEffect } from 'react'
import { useQuery, useMutation } from '@tanstack/react-query'
import { api } from '@/lib/api'
import type { User } from '@petrel/shared'

const ACCESS_TOKEN_KEY = 'petrel_access_token'
const REFRESH_TOKEN_KEY = 'petrel_refresh_token'

/**
 * Query keys for auth
 */
export const authKeys = {
  user: ['auth', 'user'] as const,
}

/**
 * Hook for managing authentication state
 */
export function useAuth() {
  const [isInitialized, setIsInitialized] = useState(false)

  // Initialize token from localStorage on mount
  useEffect(() => {
    const token = localStorage.getItem(ACCESS_TOKEN_KEY)
    if (token) {
      api.setAccessToken(token)
    }
    setIsInitialized(true)
  }, [])

  const { data: user, isLoading, refetch } = useQuery({
    queryKey: authKeys.user,
    queryFn: () => api.getCurrentUser(),
    enabled: isInitialized && !!localStorage.getItem(ACCESS_TOKEN_KEY),
    retry: false,
  })

  const loginMutation = useMutation({
    mutationFn: ({ username, password }: { username: string; password: string }) =>
      api.login(username, password),
    onSuccess: (data) => {
      localStorage.setItem(ACCESS_TOKEN_KEY, data.accessToken)
      localStorage.setItem(REFRESH_TOKEN_KEY, data.refreshToken)
      api.setAccessToken(data.accessToken)
      refetch()
    },
  })

  const logoutMutation = useMutation({
    mutationFn: async () => {
      const refreshToken = localStorage.getItem(REFRESH_TOKEN_KEY)
      if (refreshToken) {
        await api.logout(refreshToken)
      }
    },
    onSettled: () => {
      localStorage.removeItem(ACCESS_TOKEN_KEY)
      localStorage.removeItem(REFRESH_TOKEN_KEY)
      api.setAccessToken(null)
      refetch()
    },
  })

  const login = useCallback(
    (username: string, password: string) => {
      return loginMutation.mutateAsync({ username, password })
    },
    [loginMutation]
  )

  const logout = useCallback(() => {
    return logoutMutation.mutateAsync()
  }, [logoutMutation])

  return {
    user: user ?? null,
    isLoading: !isInitialized || isLoading,
    isAuthenticated: !!user,
    login,
    logout,
    loginError: loginMutation.error,
    isLoggingIn: loginMutation.isPending,
  }
}

/**
 * Hook for getting current user (for components that need user data)
 */
export function useCurrentUser(): User | null {
  const { user } = useAuth()
  return user
}
