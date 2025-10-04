'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAbstractClient } from '@abstract-foundation/agw-react'

export default function ConnectingPage() {
  const router = useRouter()
  const { data: client } = useAbstractClient()
  const [error, setError] = useState<string | null>(null)
  const [timedOut, setTimedOut] = useState(false)
  const [status, setStatus] = useState('Connecting to PeBloq...')

  useEffect(() => {
    const timeout = setTimeout(() => {
      setTimedOut(true)
      setStatus('Connection is taking longer than expected')
    }, 10000) // 10 second timeout

    const authenticateUser = async () => {
      if (!client?.account?.address) {
        setStatus('Waiting for wallet connection...')
        return
      }

      try {
        setStatus('Setting up your profile...')

        const response = await fetch('/api/auth/wallet-login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ walletAddress: client.account.address })
        })

        const data = await response.json()

        if (response.ok) {
          setStatus('Welcome back! Redirecting...')
          clearTimeout(timeout)
          router.push('/dashboard')
        } else {
          throw new Error(data.error || 'Authentication failed')
        }
      } catch (err) {
        clearTimeout(timeout)
        setError(err instanceof Error ? err.message : 'Something went wrong')
      }
    }

    authenticateUser()

    return () => clearTimeout(timeout)
  }, [client, router])

  const handleRetry = () => {
    setError(null)
    setTimedOut(false)
    setStatus('Retrying connection...')
    window.location.reload()
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-lg border border-red-200 p-8 max-w-md w-full text-center">
          <div className="text-6xl mb-4">😔</div>
          <h2 className="text-2xl font-bold text-gray-800 mb-4">Connection Failed</h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <div className="space-y-3">
            <button
              onClick={handleRetry}
              className="w-full bg-blue-500 text-white px-6 py-3 rounded-xl hover:bg-blue-600 transition-colors font-medium"
            >
              Try Again
            </button>
            <button
              onClick={() => router.push('/')}
              className="w-full bg-gray-100 text-gray-700 px-6 py-3 rounded-xl hover:bg-gray-200 transition-colors"
            >
              Back to Home
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (timedOut) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-lg border border-yellow-200 p-8 max-w-md w-full text-center">
          <div className="text-6xl mb-4">⏰</div>
          <h2 className="text-2xl font-bold text-gray-800 mb-4">Taking Longer Than Usual</h2>
          <p className="text-gray-600 mb-6">
            Your connection is taking longer than expected. This might be due to network issues.
          </p>
          <div className="space-y-3">
            <button
              onClick={handleRetry}
              className="w-full bg-blue-500 text-white px-6 py-3 rounded-xl hover:bg-blue-600 transition-colors font-medium"
            >
              Try Again
            </button>
            <button
              onClick={() => router.push('/')}
              className="w-full bg-gray-100 text-gray-700 px-6 py-3 rounded-xl hover:bg-gray-200 transition-colors"
            >
              Back to Home
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 flex items-center justify-center">
      <div className="text-center">
        {/* Simple, friendly penguin animation */}
        <div className="text-8xl mb-6 animate-bounce">🐧</div>

        {/* Loading spinner */}
        <div className="w-12 h-12 mx-auto mb-6">
          <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-500 rounded-full animate-spin"></div>
        </div>

        {/* Clear, helpful status */}
        <h2 className="text-2xl font-semibold text-gray-800 mb-2">{status}</h2>
        <p className="text-gray-600 text-lg mb-4">This usually takes just a moment</p>

        {/* Subtle penguin branding */}
        <p className="text-sm text-gray-300">
          Welcome to the colony! 🐧
        </p>
      </div>
    </div>
  )
}