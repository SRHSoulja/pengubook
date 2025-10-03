'use client'

import { useLoginWithAbstract } from '@abstract-foundation/agw-react'
import { useState } from 'react'
import { useAuth } from '@/providers/AuthProvider'

export default function WalletConnect() {
  const { login } = useLoginWithAbstract()
  const { loading: authLoading, walletStatus, verifyWallet } = useAuth()
  const [isConnecting, setIsConnecting] = useState(false)
  const [error, setError] = useState('')

  const handleLogin = async () => {
    try {
      console.log('Initiating AGW login...')
      setIsConnecting(true)
      setError('')

      // AGW login - user will need to manually verify after
      await login()

      console.log('AGW login completed, ready for verification')
      setIsConnecting(false)
    } catch (error: any) {
      console.error('AGW login failed:', error)
      setIsConnecting(false)
      setError(error.message || 'Login failed. Please try again.')
    }
  }

  const handleVerify = async () => {
    try {
      setError('')
      await verifyWallet()
    } catch (error: any) {
      console.error('Verification failed:', error)
      setError(error.message || 'Verification failed. Please try again.')
    }
  }

  const isLoading = isConnecting || authLoading

  // Show authenticated status
  if (walletStatus === 'authenticated') {
    return null // Component not needed when authenticated
  }

  // Show verify button if wallet is connected but not verified
  if (walletStatus === 'connected') {
    return (
      <div className="space-y-4">
        <button
          onClick={handleVerify}
          disabled={isLoading}
          className="group relative w-full bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-600 text-white px-8 py-4 rounded-xl font-display font-bold text-lg shadow-2xl hover:shadow-emerald-500/25 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed overflow-hidden"
        >
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -skew-x-12 transform translate-x-[-200%] group-hover:translate-x-[200%] transition-transform duration-1000"></div>

          <div className="relative flex items-center justify-center gap-3">
            {isLoading ? (
              <>
                <div className="w-5 h-5 border-3 border-white border-t-transparent rounded-full animate-spin"></div>
                <span>Verifying...</span>
              </>
            ) : (
              <>
                <span>🔐</span>
                <span>Verify Wallet</span>
                <span className="text-2xl">→</span>
              </>
            )}
          </div>
        </button>

        <div className="glass-card bg-gradient-to-r from-emerald-500/10 to-teal-500/10 border-emerald-500/30 rounded-xl p-4 text-center">
          <div className="text-emerald-200 text-sm">
            ✅ Wallet connected! Click "Verify Wallet" to sign and authenticate.
          </div>
        </div>

        {error && (
          <div className="glass-card bg-gradient-to-r from-red-500/10 to-orange-500/10 border-red-500/30 rounded-xl p-4 text-center">
            <div className="text-red-200 text-sm">
              {error}
            </div>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <button
        onClick={handleLogin}
        disabled={isLoading || walletStatus === 'verifying'}
        className="group relative w-full bg-gradient-to-r from-cyan-500 via-blue-500 to-purple-600 text-white px-8 py-4 rounded-xl font-display font-bold text-lg shadow-2xl hover:shadow-cyan-500/25 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed overflow-hidden"
      >
        {/* Animated shine effect */}
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -skew-x-12 transform translate-x-[-200%] group-hover:translate-x-[200%] transition-transform duration-1000"></div>

        <div className="relative flex items-center justify-center gap-3">
          {isLoading ? (
            <>
              <div className="w-5 h-5 border-3 border-white border-t-transparent rounded-full animate-spin"></div>
              <span>Connecting to Abstract...</span>
            </>
          ) : (
            <>
              <img src="https://gmgnrepeat.com/icons/pengubookicon1.png" alt="Penguin" className="w-6 h-6 animate-float" />
              <span>Connect Wallet & Join</span>
              <span className="text-2xl">→</span>
            </>
          )}
        </div>
      </button>

      {error && (
        <div className="glass-card bg-gradient-to-r from-red-500/10 to-orange-500/10 border-red-500/30 rounded-xl p-4 text-center">
          <div className="text-red-200 text-sm">
            {error}
          </div>
        </div>
      )}
    </div>
  )
}