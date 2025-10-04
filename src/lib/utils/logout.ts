/**
 * Comprehensive logout utility
 * Clears all authentication state and storage
 */

import { signOut } from 'next-auth/react'
import { createElement } from 'react'
import { createRoot } from 'react-dom/client'

interface LogoutOptions {
  /** Redirect URL after logout (default: '/') */
  redirectTo?: string
  /** Whether to call AGW logout function */
  agwLogout?: () => void
  /** Show goodbye loading screen (default: true) */
  showGoodbyeScreen?: boolean
  /** Goodbye screen message */
  goodbyeMessage?: string
}

/**
 * Performs a complete logout from all authentication systems
 * - Shows goodbye loading screen
 * - Logs out from Abstract Global Wallet (AGW)
 * - Logs out from NextAuth OAuth session
 * - Clears all session storage
 * - Clears all local storage
 * - Clears relevant cookies
 * - Redirects to specified page
 */
export async function performLogout(options: LogoutOptions = {}): Promise<void> {
  const {
    redirectTo = '/',
    agwLogout,
    showGoodbyeScreen = true,
    goodbyeMessage = 'Leaving the Colony'
  } = options

  try {
    console.log('[Logout] Starting comprehensive logout...')

    // Show goodbye screen
    if (showGoodbyeScreen) {
      showGoodbyeLoadingScreen(goodbyeMessage)
    }

    // 1. Logout from Abstract Global Wallet if function provided
    if (agwLogout) {
      try {
        agwLogout()
        console.log('[Logout] AGW logout successful')
      } catch (error) {
        console.error('[Logout] AGW logout failed:', error)
      }
    }

    // 2. Logout from NextAuth OAuth session
    try {
      await signOut({ redirect: false })
      console.log('[Logout] NextAuth logout successful')
    } catch (error) {
      console.error('[Logout] NextAuth logout failed:', error)
    }

    // 3. Clear all session storage
    try {
      const sessionKeys = [
        'pengubook-auth',
        'pengubook-oauth-auth',
        'linkToUserId',
        'pengubook-wallet-address',
        'pengubook-user-id'
      ]

      sessionKeys.forEach(key => {
        sessionStorage.removeItem(key)
      })

      console.log('[Logout] Session storage cleared')
    } catch (error) {
      console.error('[Logout] Session storage clear failed:', error)
    }

    // 4. Clear all local storage (keep user preferences like theme)
    try {
      const localKeys = [
        'pengubook-user',
        'pengubook-auth-token',
        'pengubook-wallet-cache'
      ]

      localKeys.forEach(key => {
        localStorage.removeItem(key)
      })

      console.log('[Logout] Local storage cleared')
    } catch (error) {
      console.error('[Logout] Local storage clear failed:', error)
    }

    // 5. Clear authentication cookies
    try {
      clearAuthCookies()
      console.log('[Logout] Cookies cleared')
    } catch (error) {
      console.error('[Logout] Cookie clear failed:', error)
    }

    console.log('[Logout] Logout complete, redirecting to:', redirectTo)

    // 6. Redirect to specified page
    // Use window.location to ensure full page reload and state reset
    window.location.href = redirectTo
  } catch (error) {
    console.error('[Logout] Fatal error during logout:', error)

    // Force redirect even if logout fails to prevent stuck state
    window.location.href = redirectTo
  }
}

/**
 * Clears all authentication-related cookies
 */
function clearAuthCookies(): void {
  const cookies = document.cookie.split(';')

  cookies.forEach(cookie => {
    const name = cookie.split('=')[0].trim()

    // Clear cookies that start with pengubook or next-auth
    if (name.startsWith('pengubook') || name.startsWith('next-auth')) {
      // Clear with different path configurations to ensure removal
      const clearCookie = (path: string = '/') => {
        document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=${path}; domain=${window.location.hostname}`
        document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=${path};`
      }

      clearCookie('/')
      clearCookie('/api')
      clearCookie('/auth')
    }
  })
}

/**
 * Quick logout with default options
 */
export async function quickLogout(): Promise<void> {
  await performLogout()
}

/**
 * Logout and redirect to login page
 */
export async function logoutToLogin(): Promise<void> {
  await performLogout({ redirectTo: '/connecting' })
}

/**
 * Check if user is currently logged in
 * Useful for preventing double logout attempts
 */
export function isLoggedIn(): boolean {
  // Check session storage
  const hasSessionAuth = !!sessionStorage.getItem('pengubook-auth')

  // Check if NextAuth session exists
  const hasNextAuthSession = document.cookie.includes('next-auth.session-token')

  return hasSessionAuth || hasNextAuthSession
}

/**
 * Show the goodbye loading screen
 */
function showGoodbyeLoadingScreen(message: string): void {
  // Create container
  const container = document.createElement('div')
  container.id = 'goodbye-loading-screen'
  document.body.appendChild(container)

  // Dynamically import and render GoodbyeLoadingScreen
  import('@/components/GoodbyeLoadingScreen').then(({ default: GoodbyeLoadingScreen }) => {
    const root = createRoot(container)
    root.render(createElement(GoodbyeLoadingScreen, { message }))
  }).catch(error => {
    console.error('[Logout] Failed to load goodbye screen:', error)
  })
}
