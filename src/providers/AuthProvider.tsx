'use client'

import { createContext, useContext, useState, useEffect, useRef, ReactNode } from 'react'
import { useAbstractClient } from '@abstract-foundation/agw-react'
import { useSession } from 'next-auth/react'
import PenguinLoadingScreen from '@/components/PenguinLoadingScreen'

const OAUTH_ENABLED = false

interface User {
  id: string
  username: string
  displayName: string
  walletAddress: string
  bio?: string
  avatar?: string
  avatarSource?: string
  level: number
  isAdmin: boolean
  isBanned: boolean
  discordName?: string
  discordAvatar?: string
  twitterHandle?: string
  twitterAvatar?: string
  profile?: any
}

interface AuthContextType {
  user: User | null
  loading: boolean
  isAuthenticated: boolean
  walletAddress: string | null
  sessionToken: string | null
  oauthSession: any | null
  walletStatus: 'disconnected' | 'connected' | 'verifying' | 'authenticated'
  verifyWallet: () => Promise<void>
  refetchUser: () => void
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  isAuthenticated: false,
  walletAddress: null,
  sessionToken: null,
  oauthSession: null,
  walletStatus: 'disconnected',
  verifyWallet: async () => {},
  refetchUser: () => {}
})

export function AuthProvider({ children }: { children: ReactNode }) {
  const { data: client } = useAbstractClient()
  const { data: oauthSession, status: oauthStatus } = OAUTH_ENABLED ? useSession() : { data: null, status: 'unauthenticated' }
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [initialLoad, setInitialLoad] = useState(true)
  const [walletAddress, setWalletAddress] = useState<string | null>(null)
  const [sessionToken, setSessionToken] = useState<string | null>(null)
  const [walletStatus, setWalletStatus] = useState<'disconnected' | 'connected' | 'verifying' | 'authenticated'>('disconnected')

  // Track verification and profile fetching to prevent loops
  const attemptedVerifyForAddr = useRef<string | null>(null)
  const fetchedProfileFor = useRef<string | null>(null)
  const inflightRef = useRef<Promise<any> | null>(null)

  // SECURITY: Removed sessionStorage authentication (session fixation vulnerability)
  // Now relying solely on HTTP-only cookies verified server-side
  // Check for existing session on mount via server verification
  useEffect(() => {
    const verifySession = async () => {
      try {
        const response = await fetch('/api/auth/verify-session', {
          credentials: 'include' // Send HTTP-only cookies
        })

        if (response.ok) {
          const data = await response.json()
          if (data.authenticated && data.user) {
            console.log('[AuthProvider] Valid session found via cookie')
            setWalletAddress(data.user.walletAddress)
            setUser(data.user)
            setWalletStatus('authenticated')
          }
        }
      } catch (error) {
        console.log('[AuthProvider] No valid session found')
      } finally {
        setLoading(false)
        setInitialLoad(false)
      }
    }

    verifySession()
  }, [])

  // Add timeout to prevent infinite loading
  useEffect(() => {
    if (!OAUTH_ENABLED) {
      const timeout = setTimeout(() => {
        if (initialLoad) {
          setInitialLoad(false)
          setLoading(false)
        }
      }, 3000)
      return () => clearTimeout(timeout)
    }

    // OAuth timeout handling
    const timeout = setTimeout(() => {
      if (initialLoad && oauthStatus !== 'loading') {
        setInitialLoad(false)
        setLoading(false)
      }
    }, 3000)
    return () => clearTimeout(timeout)
  }, [initialLoad, oauthStatus])

  // Update wallet status when client changes (NO auto-verify)
  useEffect(() => {
    if (client !== undefined) {
      const address = client?.account?.address

      if (address) {
        // Check if stored auth is for a different wallet address
        if (walletAddress && walletAddress.toLowerCase() !== address.toLowerCase()) {
          console.log('[AuthProvider] Different wallet detected, clearing stored auth')
          sessionStorage.removeItem('pebloq-auth')
          setWalletAddress(null)
          setUser(null)
          setWalletStatus('connected')
          attemptedVerifyForAddr.current = null
        } else if (user && user.walletAddress === address) {
          // User already authenticated with this address
          console.log('[AuthProvider] User already authenticated with this address')
          setWalletAddress(address)
          setWalletStatus('authenticated')
          setLoading(false)
          setInitialLoad(false)
        } else if (walletStatus !== 'authenticated' && walletStatus !== 'verifying') {
          // Wallet connected but not verified yet
          console.log('[AuthProvider] Wallet connected, ready for verification')
          setWalletStatus('connected')
          setLoading(false)
          setInitialLoad(false)
        }
      } else {
        // No wallet connected
        if (walletStatus !== 'disconnected') {
          console.log('[AuthProvider] Wallet disconnected')
          setWalletStatus('disconnected')
          attemptedVerifyForAddr.current = null
        }
        if (!walletAddress && !oauthSession) {
          setLoading(false)
          setInitialLoad(false)
        }
      }
    }
  }, [client?.account?.address, user?.walletAddress, walletStatus, walletAddress, oauthSession])

  // Handle OAuth session
  useEffect(() => {
    if (!OAUTH_ENABLED) return

    if (oauthStatus === 'authenticated' && (oauthSession?.user as any)?.id) {
      const isLinkingFlow = typeof window !== 'undefined' && (
        sessionStorage.getItem('linkToUserId') ||
        sessionStorage.getItem('pebloq-auth')
      )

      if (isLinkingFlow) return

      if (!walletAddress && !user && oauthSession) {
        createOrUpdateOAuthUser(oauthSession.user)
      }
    }
  }, [oauthSession, oauthStatus, walletAddress, user])

  // Fetch user profile exactly once after wallet address is set
  useEffect(() => {
    if (walletAddress && fetchedProfileFor.current !== walletAddress) {
      fetchedProfileFor.current = walletAddress
      fetchUser(walletAddress)
    } else if (!initialLoad && (!OAUTH_ENABLED || oauthStatus !== 'loading') && !walletAddress) {
      setUser(null)
      setLoading(false)
    }
  }, [walletAddress, initialLoad, oauthStatus])

  const fetchUser = async (address: string) => {
    try {
      setLoading(true)
      // Normalize address to lowercase for consistent database lookup
      const normalizedAddress = address.toLowerCase()
      const response = await fetch(`/api/users/profile?walletAddress=${normalizedAddress}`)
      const data = await response.json()

      if (response.ok && data.user) {
        // SECURITY: Admin status comes ONLY from server-side API response
        // Never trust client-side environment variables for privilege checks
        console.log('[AuthProvider] User data received:', {
          userId: data.user.id?.slice(0, 10) + '...',
          isAdminFromServer: data.user.isAdmin,
          userWalletAddress: address
        })

        setUser({
          ...data.user
          // isAdmin already set by server in data.user.isAdmin
        })

        // SECURITY: Removed sessionStorage - relying on HTTP-only cookies only
        // Session is managed server-side via /api/auth/wallet-login

        // Update login streak in background (don't await to avoid blocking)
        if (data.user.id) {
          // Check if we already updated streak today
          const lastStreakUpdate = sessionStorage.getItem('last-streak-update')
          const lastStreakDate = sessionStorage.getItem('last-streak-date')
          const now = Date.now()
          const today = new Date().toDateString()

          // Update if it's a new day OR if more than 12 hours have passed since last update
          const shouldUpdate = !lastStreakDate ||
                              lastStreakDate !== today ||
                              (!lastStreakUpdate || now - parseInt(lastStreakUpdate) > 12 * 60 * 60 * 1000)

          if (shouldUpdate) {
            fetch('/api/users/update-login-streak', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'x-wallet-address': address
              },
              body: JSON.stringify({ userId: data.user.id })
            }).then(() => {
              // Mark that we updated the streak
              sessionStorage.setItem('last-streak-update', now.toString())
              sessionStorage.setItem('last-streak-date', today)
            }).catch(err => console.error('Failed to update login streak:', err))
          }
        }
      } else {
        setUser(null)
        sessionStorage.removeItem('pebloq-auth')
      }
    } catch (error) {
      console.error('Failed to fetch user:', error)
      setUser(null)
    } finally {
      setLoading(false)
      setInitialLoad(false)
    }
  }

  const createOrUpdateOAuthUser = async (oauthUser: any) => {
    try {
      console.log('Creating/updating OAuth user:', oauthUser)
      setLoading(true)

      // Check if user already exists in our system (404 is expected for new users)
      const response = await fetch(`/api/users/profile?nextAuthId=${oauthUser.id}`, {
        headers: {
          'Cache-Control': 'no-cache'
        }
      })

      // Only try to parse JSON if response is ok or has content
      let data = null
      if (response.ok) {
        data = await response.json()
      }

      if (response.ok && data?.user) {
        console.log('Found existing user:', data.user)
        setUser(data.user)
      } else {
        console.log('User not found (404 expected for new users), creating OAuth user...')
        // Call OAuth register endpoint to create the user
        const registerResponse = await fetch('/api/auth/oauth-register', {
          method: 'POST',
          credentials: 'include'
        })

        const registerData = await registerResponse.json()

        if (registerResponse.ok && registerData.user) {
          console.log('OAuth user created:', registerData.user.id.slice(0, 10) + '...')
          setUser(registerData.user)
        } else {
          console.error('Failed to create OAuth user:', registerData.error)
          setUser(null)
        }
      }

      // Store OAuth auth info
      sessionStorage.setItem('pengubook-oauth-auth', JSON.stringify({
        nextAuthId: oauthUser.id,
        timestamp: Date.now()
      }))
    } catch (error) {
      console.error('Failed to create/update OAuth user:', error)
      setUser(null)
    } finally {
      setLoading(false)
      setInitialLoad(false)
    }
  }

  const refetchUser = () => {
    if (walletAddress) {
      fetchUser(walletAddress)
    } else if ((oauthSession?.user as any)?.id) {
      // Try to fetch by NextAuth ID
      fetchUserByNextAuthId((oauthSession?.user as any).id)
    }
  }

  const fetchUserByNextAuthId = async (nextAuthId: string) => {
    try {
      setLoading(true)
      const response = await fetch(`/api/users/profile?nextAuthId=${nextAuthId}`)
      const data = await response.json()

      if (response.ok && data.user) {
        setUser(data.user)
      } else {
        setUser(null)
      }
    } catch (error) {
      console.error('Failed to fetch user by NextAuth ID:', error)
      setUser(null)
    } finally {
      setLoading(false)
      setInitialLoad(false)
    }
  }

  // Hardened AGW-only verify helpers
  const sleep = (ms: number) => new Promise(r => setTimeout(r, ms))
  const isInitErr = (e: any) => String(e?.message || e).includes("Failed to initialize request")

  // Ensure the page is visible (avoids bfcache / hidden-tab bridge races)
  async function waitForVisible(timeoutMs = 8000) {
    const start = Date.now()
    while (document.visibilityState !== "visible") {
      if (Date.now() - start > timeoutMs) throw new Error("Document not visible")
      await sleep(120)
    }
  }

  async function verifyWithAgw(agw: any) {
    // Single-flight: prevent dup nonce/sign (using ref to survive HMR)
    if (inflightRef.current) return inflightRef.current
    inflightRef.current = (async () => {
      // 0) Require account
      const addr = agw?.account?.address as `0x${string}` | undefined
      if (!addr) throw new Error("AGW not connected")

      // 1) Visibility + small settle delay
      await waitForVisible(10_000)
      await sleep(500)

      // 2) Wait for signMessage to exist
      const t0 = Date.now()
      while (!agw?.signMessage) {
        if (Date.now() - t0 > 10_000) throw new Error("AGW signMessage not available after timeout")
        await sleep(150)
      }

      // 3) Fetch ONE nonce
      const nRes = await fetch("/api/auth/nonce", { credentials: "include" })
      if (!nRes.ok) throw new Error("Failed to fetch nonce")
      const { nonce } = await nRes.json()

      // 4) Build message once - exact same string for sign + POST
      const msg = JSON.stringify({
        domain: window.location.host,
        statement: "Sign to verify your Abstract Global Wallet.",
        nonce,
        issuedAt: new Date().toISOString(),
      })

      // 5) Try sign → verify with progressive backoff
      let lastErr: any

      for (let i = 1; i <= 5; i++) {
        try {
          if (i <= 4) {
            await sleep(300 * i)
          } else {
            console.log("[AGW Auth] Forcing reconnect and retrying once…")
            try { await agw.disconnect?.() } catch {}
            await sleep(500)
            await sleep(800)
          }

          await new Promise(r => requestAnimationFrame(() => r(null)))
          if ('requestIdleCallback' in window) {
            await new Promise(r => (window as any).requestIdleCallback(r, { timeout: 800 }))
          }

          const signature = await agw.signMessage({ message: msg })

          console.log('[AGW Client POST]', {
            addr: addr,
            chainId: agw?.chain?.id,
            sigLen: signature.length,
            msgPreview: msg.slice(0, 80) + (msg.length > 80 ? '...' : ''),
          })

          const vRes = await fetch("/api/auth/wallet-login", {
            method: "POST",
            headers: { "content-type": "application/json" },
            credentials: "include",
            body: JSON.stringify({
              message: msg,
              signature,
              walletAddress: addr,
              chainId: agw?.chain?.id,
            })
          })
          const j = await vRes.json()
          if (!vRes.ok || !j?.user) throw new Error(j?.error || "verify failed")

          return j
        } catch (e: any) {
          lastErr = e
          const init = isInitErr(e)
          if (process.env.NODE_ENV === 'development') {
            console.warn(`[AGW Auth] ${init ? "Init" : "Fatal"} error on attempt ${i}:`, e?.message)
          }
          if (!init && i < 5) break
          if (i === 5) throw e
        }
      }
      throw lastErr
    })().finally(() => { inflightRef.current = null })

    return inflightRef.current
  }

  // Explicit verify function - user must call this
  const verifyWallet = async () => {
    const address = client?.account?.address
    if (!address) {
      console.warn('[AGW Auth] No wallet address available')
      return
    }

    // Prevent duplicate verification attempts for same address
    if (attemptedVerifyForAddr.current === address) {
      console.log('[AGW Auth] Already attempted verification for this address; not looping')
      return
    }

    attemptedVerifyForAddr.current = address
    setWalletStatus('verifying')
    setLoading(true)

    try {
      const result = await verifyWithAgw(client)

      setWalletAddress(address)
      setWalletStatus('authenticated')
      setLoading(false)
      attemptedVerifyForAddr.current = null

      // SECURITY: Removed sessionStorage - session managed server-side only

    } catch (error) {
      console.error('[AGW Auth] Authentication failed:', error)
      setWalletStatus('connected')
    } finally {
      setLoading(false)
      setInitialLoad(false)
    }
  }

  const isAuthenticated = !!(user && (walletAddress || oauthSession))

  // Show loading screen during initial auth check
  if (initialLoad && loading) {
    return <PenguinLoadingScreen />
  }

  return (
    <AuthContext.Provider value={{
      user,
      loading,
      isAuthenticated,
      walletAddress,
      sessionToken,
      oauthSession,
      walletStatus,
      verifyWallet,
      refetchUser
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return context
}