'use client'

import { useLoginWithAbstract, useAbstractClient } from '@abstract-foundation/agw-react'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function WalletConnect() {
  const router = useRouter()
  const { login, logout } = useLoginWithAbstract()
  const { data: client, isLoading: clientLoading } = useAbstractClient()
  const [isConnecting, setIsConnecting] = useState(false)
  const [user, setUser] = useState<any>(null)
  const [registrationStatus, setRegistrationStatus] = useState('')
  const [loginStep, setLoginStep] = useState('')

  // Check if we're connected by seeing if we have a client with an address
  const isConnected = !!(client?.account?.address)

  console.log('AGW State:', {
    isConnected,
    isConnecting,
    client: !!client,
    clientLoading,
    address: client?.account?.address,
    user: !!user
  })

  // Auto-register when wallet connects
  useEffect(() => {
    if (isConnected && client?.account?.address && !user && isConnecting) {
      setLoginStep('Creating your account...')
      handleUserRegistration(client.account.address)
    }
  }, [isConnected, client?.account?.address, user, isConnecting])

  const handleUserRegistration = async (walletAddress: string) => {
    try {
      const response = await fetch('/api/auth/wallet-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ walletAddress })
      })

      const data = await response.json()

      if (response.ok) {
        setUser(data.user)
        setLoginStep('Success! Redirecting...')
        // Store auth immediately for persistence
        sessionStorage.setItem('pengubook-auth', JSON.stringify({
          walletAddress,
          sessionToken: data.sessionToken,
          timestamp: Date.now()
        }))
        // Redirect immediately to avoid flash
        router.push('/dashboard')
      } else {
        setLoginStep('')
        setRegistrationStatus('Login failed. Please try again.')
        setIsConnecting(false)
      }
    } catch (error) {
      setLoginStep('')
      setRegistrationStatus('Something went wrong. Please try again.')
      setIsConnecting(false)
    }
  }

  const handleLogin = async () => {
    try {
      console.log('Attempting AGW login...')
      setIsConnecting(true)
      setLoginStep('Waiting for signature...')
      await login()
      // Don't show "signature received" yet - wait for actual connection
      setLoginStep('Connecting to Abstract...')
    } catch (error) {
      console.error('AGW login failed:', error)
      setIsConnecting(false)
      setLoginStep('')
      setRegistrationStatus('Login failed. Please try again.')
    }
  }


  const handleLogout = () => {
    logout()
    setUser(null)
    setRegistrationStatus('')
    setLoginStep('')
    setIsConnecting(false)
  }

  // Clean redirect logic - this shouldn't happen now since we redirect to /connecting
  useEffect(() => {
    if (isConnected && client && user) {
      setTimeout(() => {
        router.push('/dashboard')
      }, 500)
    }
  }, [isConnected, client, user, router])

  return (
    <div className="space-y-4">
      <button
        onClick={handleLogin}
        disabled={isConnecting || clientLoading}
        className="w-full bg-gradient-to-r from-blue-500 to-purple-600 text-white px-6 py-3 rounded-xl hover:from-blue-600 hover:to-purple-700 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed font-medium shadow-lg"
      >
        {isConnecting || clientLoading ? (
          <div className="flex items-center justify-center space-x-2">
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            <span>Connecting...</span>
          </div>
        ) : (
          'Connect to Abstract 🐧'
        )}
      </button>

      {(loginStep || registrationStatus) && (
        <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-3 text-center">
          {loginStep && (
            <div className="text-blue-200 text-sm font-medium flex items-center justify-center space-x-2">
              <div className="w-3 h-3 border-2 border-blue-400 border-t-transparent rounded-full animate-spin"></div>
              <span>{loginStep}</span>
            </div>
          )}
          {registrationStatus && (
            <div className="text-blue-100 text-sm mt-1">{registrationStatus}</div>
          )}
        </div>
      )}
    </div>
  )
}