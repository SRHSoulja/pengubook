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
        className="group relative w-full bg-gradient-to-r from-cyan-500 via-blue-500 to-purple-600 text-white px-8 py-4 rounded-xl font-display font-bold text-lg shadow-2xl hover:shadow-cyan-500/25 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed overflow-hidden"
      >
        {/* Animated shine effect */}
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -skew-x-12 transform translate-x-[-200%] group-hover:translate-x-[200%] transition-transform duration-1000"></div>

        <div className="relative flex items-center justify-center gap-3">
          {isConnecting || clientLoading ? (
            <>
              <div className="w-5 h-5 border-3 border-white border-t-transparent rounded-full animate-spin"></div>
              <span>Connecting to Abstract...</span>
            </>
          ) : (
            <>
              <span className="text-2xl animate-float">🐧</span>
              <span>Connect Wallet & Join</span>
              <span className="text-2xl">→</span>
            </>
          )}
        </div>
      </button>

      {(loginStep || registrationStatus) && (
        <div className="glass-card bg-gradient-to-r from-cyan-500/10 to-blue-500/10 border-cyan-500/30 rounded-xl p-4 text-center">
          {loginStep && (
            <div className="text-cyan-200 text-sm font-semibold flex items-center justify-center gap-3">
              <div className="w-4 h-4 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin"></div>
              <span>{loginStep}</span>
            </div>
          )}
          {registrationStatus && (
            <div className="text-cyan-100 text-sm mt-2">{registrationStatus}</div>
          )}
        </div>
      )}
    </div>
  )
}