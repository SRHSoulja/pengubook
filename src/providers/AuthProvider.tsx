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

  // Add timeout to prevent infinite loading, but consider OAuth status
  useEffect(() => {
    const timeout = setTimeout(() => {
      if (initialLoad && oauthStatus !== 'loading') {
        console.log('Auth timeout reached, oauth status:', oauthStatus)
        setInitialLoad(false)
        setLoading(false)
      }
    }, 3000) // 3 second timeout to account for OAuth

    return () => clearTimeout(timeout)
  }, [initialLoad, oauthStatus])

  // Update wallet address when client changes and auto-register wallet users
  useEffect(() => {
    if (client !== undefined) {
      if (client?.account?.address) {
        setWalletAddress(client.account.address)
        // Auto-register/login wallet user if not already authenticated
        if (!user || user.walletAddress !== client.account.address) {
          handleWalletLogin(client.account.address)
        }
      } else if (!walletAddress) {
        // Only clear if we don't have a stored address
        setLoading(false)
        setInitialLoad(false)
      }
    }
  }, [client?.account?.address, user?.walletAddress])

  // Handle OAuth session
  useEffect(() => {
    console.log('OAuth status:', oauthStatus, 'Session:', oauthSession)
    if (oauthStatus === 'authenticated' && oauthSession?.user?.id) {
      console.log('OAuth user authenticated with NextAuth ID:', oauthSession.user.id)
      // Create/update our user record based on NextAuth user
      createOrUpdateOAuthUser(oauthSession.user)
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
        // Check if user is admin based on environment variable
        const adminWalletAddress = process.env.NEXT_PUBLIC_ADMIN_WALLET_ADDRESS
        const isAdminByWallet = adminWalletAddress &&
          address.toLowerCase() === adminWalletAddress.toLowerCase()

        setUser({
          ...data.user,
          isAdmin: data.user.isAdmin || isAdminByWallet
        })
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

  const createOrUpdateOAuthUser = async (oauthUser: any) => {
    try {
      console.log('Creating/updating OAuth user:', oauthUser)
      setLoading(true)

      // Check if user already exists in our system
      const response = await fetch(`/api/users/profile?nextAuthId=${oauthUser.id}`)
      const data = await response.json()

      if (response.ok && data.user) {
        console.log('Found existing user:', data.user)
        setUser(data.user)
      } else {
        console.log('User not found, creating OAuth user...')
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
    } else if (oauthSession?.user?.id) {
      // Try to fetch by NextAuth ID
      fetchUserByNextAuthId(oauthSession.user.id)
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

  const handleWalletLogin = async (walletAddress: string) => {
    try {
      console.log('Auto-registering wallet user:', walletAddress.slice(0, 10) + '...')
      setLoading(true)

      const response = await fetch('/api/auth/wallet-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ walletAddress })
      })

      const data = await response.json()

      if (response.ok && data.user) {
        console.log('Wallet user registered/found:', data.user.id.slice(0, 10) + '...')

        // Check if user is admin based on environment variable
        const adminWalletAddress = process.env.NEXT_PUBLIC_ADMIN_WALLET_ADDRESS
        const isAdminByWallet = adminWalletAddress &&
          walletAddress.toLowerCase() === adminWalletAddress.toLowerCase()

        setUser({
          id: data.user.id,
          username: data.user.username,
          displayName: data.user.displayName,
          walletAddress: data.user.walletAddress,
          bio: '',
          avatar: '',
          level: 1,
          isAdmin: isAdminByWallet || false,
          isBanned: false
        })

        // Store auth info for persistence
        sessionStorage.setItem('pengubook-auth', JSON.stringify({
          walletAddress,
          timestamp: Date.now()
        }))
      } else {
        console.error('Wallet login failed:', data.error)
      }
    } catch (error) {
      console.error('Failed to register/login wallet user:', error)
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