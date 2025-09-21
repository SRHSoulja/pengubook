'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/providers/AuthProvider'
import { useTheme } from '@/providers/ThemeProvider'
import WalletConnect from '@/components/WalletConnect'
import OAuthLogin from '@/components/OAuthLogin'
import PenguinLoadingScreen from '@/components/PenguinLoadingScreen'

export default function Home() {
  const { user, loading, isAuthenticated } = useAuth()
  const { currentTheme } = useTheme()
  const [stats, setStats] = useState({
    totalUsers: 0,
    connectedUsers: 0,
    totalTips: 0,
    totalTipVolume: '0',
    enabledTokens: 0
  })

  useEffect(() => {
    const fetchServerStats = async () => {
      try {
        const response = await fetch('/api/system/stats')
        const data = await response.json()
        setStats({
          totalUsers: data.totalUsers || 0,
          connectedUsers: data.connectedUsers || 0,
          totalTips: data.totalTips || 0,
          totalTipVolume: data.totalTipVolume || '0',
          enabledTokens: data.enabledTokens || 0
        })
      } catch (error) {
        console.error('Failed to fetch server stats:', error)
      }
    }

    fetchServerStats()
    const statsInterval = setInterval(fetchServerStats, 30000)

    return () => clearInterval(statsInterval)
  }, [])

  // Auto-redirect authenticated users to dashboard
  useEffect(() => {
    if (isAuthenticated) {
      const timer = setTimeout(() => {
        window.location.href = '/dashboard'
      }, 2000)
      return () => clearTimeout(timer)
    }
  }, [isAuthenticated])

  // Show loading screen while checking auth
  if (loading) {
    return <PenguinLoadingScreen />
  }

  // If authenticated, redirect to dashboard or show different content
  if (isAuthenticated) {
    return (
      <main
        className="min-h-screen flex items-center justify-center"
        style={{
          background: `linear-gradient(135deg, ${currentTheme.colors.from}, ${currentTheme.colors.via}, ${currentTheme.colors.to})`
        }}
      >
        <div className="text-center space-y-6">
          <div className="text-8xl animate-float">🐧</div>
          <h1 className="text-4xl font-display font-bold text-gradient">
            Welcome back, {user?.displayName}!
          </h1>
          <p className="text-xl text-gray-300">
            Redirecting you to the colony...
          </p>
          <div className="animate-pulse">
            <a href="/dashboard" className="cyber-button inline-block">
              Enter Dashboard →
            </a>
          </div>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-green-900">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-20 left-20 w-32 h-32 bg-emerald-400/10 rounded-full blur-xl animate-blob"></div>
        <div className="absolute top-40 right-20 w-24 h-24 bg-green-500/10 rounded-full blur-xl animate-blob animation-delay-2000"></div>
        <div className="absolute bottom-20 left-1/3 w-40 h-40 bg-emerald-400/10 rounded-full blur-xl animate-blob animation-delay-4000"></div>
      </div>

      <div className="relative z-10 min-h-screen flex flex-col justify-center mobile-padding py-12">
        <div className="max-w-6xl mx-auto">

          {/* Hero Section */}
          <div className="text-center mb-16 relative">
            <div className="relative inline-block mb-8">
              <div className="text-8xl mb-6 animate-float">🐧</div>
              <div className="absolute inset-0 animate-aurora-flow opacity-30 rounded-full"></div>
            </div>

            <h1 className="text-6xl md:text-7xl font-display font-bold text-gray-200 mb-8 leading-tight">
              PENGUBOOK
            </h1>

            <div className="text-green-400 text-lg md:text-xl font-mono mb-4 opacity-60">
              v2.7.4-arctic-mainnet
            </div>

            <p className="text-2xl md:text-3xl text-gray-300 max-w-3xl mx-auto leading-relaxed mb-8">
              The <span className="text-green-400 font-bold">Web3 Social Protocol</span> for
              <span className="text-gray-200"> Crypto-Native Penguins</span>
            </p>

            <p className="text-lg text-gray-500 max-w-2xl mx-auto">
              Connect, tip, and build communities in the Pudgy Penguins metaverse.
              Powered by Abstract Global Wallet and quantum penguin energy.
              <span className="text-green-500 ml-2">❄️</span>
            </p>
          </div>

          {/* Main Content Grid */}
          <div className="grid lg:grid-cols-2 gap-12 mb-16">

            {/* Left: Features & Stats */}
            <div className="space-y-8">

              {/* Live Stats */}
              <div className="glass-card-strong p-8">
                <h2 className="text-2xl font-display font-bold text-gray-300 mb-6 flex items-center">
                  <span className="mr-3 text-3xl animate-float">📊</span>
                  Colony Status
                </h2>

                <div className="grid grid-cols-2 gap-4">
                  <div className="glass-card p-4 text-center hover-lift">
                    <div className="text-3xl font-bold text-green-400 font-mono">
                      {stats.totalUsers.toLocaleString()}
                    </div>
                    <div className="text-sm text-gray-500">Penguins</div>
                  </div>

                  <div className="glass-card p-4 text-center hover-lift">
                    <div className="text-3xl font-bold text-green-500 font-mono">
                      {stats.totalTips.toLocaleString()}
                    </div>
                    <div className="text-sm text-gray-500">Tips Sent</div>
                  </div>

                  <div className="glass-card p-4 text-center hover-lift">
                    <div className="text-3xl font-bold text-emerald-400 font-mono">
                      {stats.connectedUsers.toLocaleString()}
                    </div>
                    <div className="text-sm text-gray-500">Online</div>
                  </div>

                  <div className="glass-card p-4 text-center hover-lift">
                    <div className="text-3xl font-bold text-emerald-500 font-mono">
                      {stats.enabledTokens}
                    </div>
                    <div className="text-sm text-gray-500">Tokens</div>
                  </div>
                </div>
              </div>

              {/* Features */}
              <div className="glass-card-strong p-8">
                <h2 className="text-2xl font-display font-bold text-gray-300 mb-6 flex items-center">
                  <span className="mr-3 text-3xl animate-float">⚡</span>
                  Core Features
                </h2>

                <div className="space-y-4">
                  <div className="glass-card p-4 hover-lift group">
                    <div className="flex items-center space-x-4">
                      <span className="text-2xl group-hover:animate-float">💸</span>
                      <div>
                        <h3 className="font-display font-semibold text-gray-200">Instant Tipping</h3>
                        <p className="text-sm text-gray-400">Send crypto tips with quantum speed</p>
                      </div>
                    </div>
                  </div>

                  <div className="glass-card p-4 hover-lift group">
                    <div className="flex items-center space-x-4">
                      <span className="text-2xl group-hover:animate-float">🔗</span>
                      <div>
                        <h3 className="font-display font-semibold text-gray-200">Wallet Bridge</h3>
                        <p className="text-sm text-gray-400">Seamless AGW integration</p>
                      </div>
                    </div>
                  </div>

                  <div className="glass-card p-4 hover-lift group">
                    <div className="flex items-center space-x-4">
                      <span className="text-2xl group-hover:animate-float">🏔️</span>
                      <div>
                        <h3 className="font-display font-semibold text-gray-200">Social Matrix</h3>
                        <p className="text-sm text-gray-400">Build penguin communities</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Right: Connection Portal */}
            <div className="space-y-6">
              <div className="glass-card-strong p-10 relative overflow-hidden">

                {/* Decorative elements */}
                <div className="absolute top-0 right-0 w-20 h-20 bg-green-500/5 rounded-full blur-xl"></div>
                <div className="absolute bottom-0 left-0 w-16 h-16 bg-emerald-500/5 rounded-full blur-xl"></div>

                <div className="relative space-y-8">
                  <div className="text-center">
                    <div className="text-7xl mb-6 animate-float">🐧</div>
                    <h2 className="text-3xl font-display font-bold text-gray-200 mb-4">
                      Enter the Colony
                    </h2>
                    <p className="text-gray-400 text-lg">
                      Connect your Abstract Global Wallet to join the penguin social protocol
                    </p>
                  </div>

                  <div className="h-px bg-white/20 w-full"></div>

                  <WalletConnect />

                  <div className="h-px bg-white/20 w-full"></div>

                  <div className="text-center">
                    <p className="text-sm text-gray-400 mb-4">Or connect with social accounts</p>
                  </div>

                  <OAuthLogin />

                  <div className="h-px bg-white/20 w-full"></div>

                  <div className="text-center space-y-2">
                    <div className="text-sm text-gray-500">
                      <span className="text-green-400">Protocol:</span> Abstract Layer 2
                    </div>
                    <div className="text-sm text-gray-500">
                      <span className="text-green-400">Security:</span> Quantum-resistant encryption
                    </div>
                    <div className="text-sm text-gray-500">
                      <span className="text-green-400">Status:</span>
                      <span className="text-green-500 ml-1">Colony Active</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Security Notice */}
              <div className="glass-card bg-gradient-to-r from-green-500/5 to-emerald-500/5 border-green-400/20 p-6">
                <div className="flex items-start space-x-3">
                  <span className="text-2xl">🔒</span>
                  <div>
                    <h3 className="font-display font-semibold text-green-300 mb-2">
                      Secure Access Required
                    </h3>
                    <p className="text-sm text-gray-400">
                      This penguin colony uses advanced quantum cryptography.
                      Only authorized wallet connections are permitted to access the Pudgy Penguins social matrix.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Bottom Info */}
          <div className="glass-card p-6 text-center">
            <div className="flex flex-wrap justify-center items-center space-x-6 text-sm text-gray-500">
              <div className="flex items-center space-x-2">
                <span className="text-green-400">⚡</span>
                <span>Powered by Abstract Protocol</span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-green-500">🔐</span>
                <span>Quantum Cryptography</span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-emerald-400">🐧</span>
                <span>Built for Pudgy Penguins</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}