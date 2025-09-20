import { useState, useEffect } from 'react'
import { useAbstractClient } from '@abstract-foundation/agw-react'

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

export function useAuth() {
  const { data: client } = useAbstractClient()
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [walletAddress, setWalletAddress] = useState<string | null>(null)

  // Try to get wallet address from AGW client or sessionStorage
  useEffect(() => {
    let address: string | null = null

    // First, try AGW client
    if (client?.account?.address) {
      address = client.account.address
    } else {
      // Fallback: check if we have stored auth info
      try {
        const storedAuth = sessionStorage.getItem('pengubook-auth')
        if (storedAuth) {
          const authData = JSON.parse(storedAuth)
          address = authData.walletAddress
        }
      } catch (error) {
        console.log('No stored auth found')
      }
    }

    setWalletAddress(address)
  }, [client?.account?.address])

  // Fetch user data when we have a wallet address
  useEffect(() => {
    if (walletAddress) {
      fetchUser(walletAddress)
    } else {
      setUser(null)
      setLoading(false)
    }
  }, [walletAddress])

  const fetchUser = async (address: string) => {
    try {
      setLoading(true)
      const response = await fetch(`/api/users/profile?walletAddress=${address}`)
      const data = await response.json()

      if (response.ok) {
        setUser(data.user)
        // Store auth info for persistence
        sessionStorage.setItem('pengubook-auth', JSON.stringify({
          walletAddress: address,
          timestamp: Date.now()
        }))
      } else {
        setUser(null)
      }
    } catch (error) {
      console.error('Failed to fetch user:', error)
      setUser(null)
    } finally {
      setLoading(false)
    }
  }

  const isAuthenticated = !!(user && walletAddress)

  return {
    user,
    loading,
    isAuthenticated,
    walletAddress,
    refetchUser: () => walletAddress && fetchUser(walletAddress)
  }
}