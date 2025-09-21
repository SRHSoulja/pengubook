'use client'

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { useAbstractClient } from '@abstract-foundation/agw-react'
import { useSession } from 'next-auth/react'
import PenguinLoadingScreen from '@/components/PenguinLoadingScreen'

interface User {
  id: string
  username: string
  displayName: string
  walletAddress: string
  bio?: string
  avatar?: string
  level: number
  isAdmin: boolean
  isBanned: boolean
  discordName?: string
  twitterHandle?: string
  profile?: any
}

interface AuthContextType {
  user: User | null
  loading: boolean
  isAuthenticated: boolean
  walletAddress: string | null
  sessionToken: string | null
  oauthSession: any | null
  refetchUser: () => void
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  isAuthenticated: false,
  walletAddress: null,
  sessionToken: null,
  oauthSession: null,
  refetchUser: () => {}
})

export function AuthProvider({ children }: { children: ReactNode }) {
  const { data: client } = useAbstractClient()
  const { data: oauthSession, status: oauthStatus } = useSession()
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [initialLoad, setInitialLoad] = useState(true)
  const [walletAddress, setWalletAddress] = useState<string | null>(null)
  const [sessionToken, setSessionToken] = useState<string | null>(null)

  // Check for existing auth on mount
  useEffect(() => {
    // Check sessionStorage for existing auth
    try {
      const storedAuth = sessionStorage.getItem('pengubook-auth')
      if (storedAuth) {
        const authData = JSON.parse(storedAuth)
        // Check if auth is still valid (within 24 hours)
        if (Date.now() - authData.timestamp < 24 * 60 * 60 * 1000) {
          setWalletAddress(authData.walletAddress)
          setSessionToken(authData.sessionToken)
        }
      }
    } catch (error) {
      console.log('No valid stored auth')
    }
  }, [])

  // Add timeout to prevent infinite loading
  useEffect(() => {
    const timeout = setTimeout(() => {
      if (initialLoad) {
        setInitialLoad(false)
        setLoading(false)
      }
    }, 2000) // 2 second timeout

    return () => clearTimeout(timeout)
  }, [initialLoad])

  // Update wallet address when client changes
  useEffect(() => {
    if (client !== undefined) {
      if (client?.account?.address) {
        setWalletAddress(client.account.address)
      } else if (!walletAddress) {
        // Only clear if we don't have a stored address
        setLoading(false)
        setInitialLoad(false)
      }
    }
  }, [client?.account?.address, walletAddress])

  // Handle OAuth session
  useEffect(() => {
    if (oauthStatus === 'authenticated' && oauthSession?.user?.id) {
      fetchUserByOAuthId(oauthSession.user.id)
    }
  }, [oauthSession, oauthStatus])

  // Fetch user data when wallet address is available
  useEffect(() => {
    if (walletAddress) {
      fetchUser(walletAddress)
    } else if (!initialLoad && oauthStatus !== 'loading') {
      setUser(null)
      setLoading(false)
    }
  }, [walletAddress, initialLoad, oauthStatus])

  const fetchUser = async (address: string) => {
    try {
      setLoading(true)
      const response = await fetch(`/api/users/profile?walletAddress=${address}`)
      const data = await response.json()

      if (response.ok && data.user) {
        setUser(data.user)
        // Store auth info for persistence
        sessionStorage.setItem('pengubook-auth', JSON.stringify({
          walletAddress: address,
          timestamp: Date.now()
        }))
      } else {
        setUser(null)
        sessionStorage.removeItem('pengubook-auth')
      }
    } catch (error) {
      console.error('Failed to fetch user:', error)
      setUser(null)
    } finally {
      setLoading(false)
      setInitialLoad(false)
    }
  }

  const fetchUserByOAuthId = async (userId: string) => {
    try {
      setLoading(true)
      const response = await fetch(`/api/users/profile?oauthId=${userId}`)
      const data = await response.json()

      if (response.ok && data.user) {
        setUser(data.user)
        // Store OAuth auth info for persistence
        sessionStorage.setItem('pengubook-oauth-auth', JSON.stringify({
          oauthId: userId,
          timestamp: Date.now()
        }))
      } else {
        setUser(null)
        sessionStorage.removeItem('pengubook-oauth-auth')
      }
    } catch (error) {
      console.error('Failed to fetch user by OAuth ID:', error)
      setUser(null)
    } finally {
      setLoading(false)
      setInitialLoad(false)
    }
  }

  const refetchUser = () => {
    if (walletAddress) {
      fetchUser(walletAddress)
    } else if (oauthSession?.user?.id) {
      fetchUserByOAuthId(oauthSession.user.id)
    }
  }

  const isAuthenticated = !!(user && (walletAddress || oauthSession))

  // Show loading screen during initial auth check
  if (initialLoad && loading) {
    return <PenguinLoadingScreen />
  }

  return (
    <AuthContext.Provider value={{ user, loading, isAuthenticated, walletAddress, sessionToken, oauthSession, refetchUser }}>
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