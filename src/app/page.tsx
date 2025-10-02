'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/providers/AuthProvider'
import { useTheme } from '@/providers/ThemeProvider'
import WalletConnect from '@/components/WalletConnect'
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
    <main className="min-h-screen relative overflow-hidden bg-gradient-to-br from-black via-gray-900 to-emerald-900">
      {/* Enhanced Animated Background - Abstract Green Theme */}
      <div className="absolute inset-0 overflow-hidden">
        {/* Floating gradient orbs - Abstract green colors */}
        <div className="absolute top-20 left-10 w-96 h-96 bg-gradient-to-r from-emerald-500/20 to-green-500/20 rounded-full blur-3xl animate-blob"></div>
        <div className="absolute top-40 right-20 w-80 h-80 bg-gradient-to-r from-green-500/15 to-emerald-500/15 rounded-full blur-3xl animate-blob animation-delay-2000"></div>
        <div className="absolute bottom-20 left-1/3 w-72 h-72 bg-gradient-to-r from-emerald-400/20 to-cyan-500/20 rounded-full blur-3xl animate-blob animation-delay-4000"></div>

        {/* Grid overlay */}
        <div className="absolute inset-0 web3-grid-bg opacity-30"></div>

        {/* Aurora effect - green themed */}
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/10 via-green-500/5 to-transparent opacity-30 animate-aurora-flow"></div>
      </div>

      <div className="relative z-10 min-h-screen flex flex-col justify-center mobile-padding py-12">
        <div className="max-w-7xl mx-auto w-full">

          {/* Hero Section */}
          <div className="text-center mb-16 relative">
            {/* Main Logo - Large and Focal */}
            <div className="flex justify-center mb-8">
              <div className="relative group">
                <img
                  src={`https://gmgnrepeat.com/pengubooklogo1.png?v=${Date.now()}`}
                  alt="PenguBook Logo"
                  className="w-48 h-48 md:w-64 md:h-64 lg:w-80 lg:h-80 animate-float filter drop-shadow-2xl transition-transform group-hover:scale-105 duration-500 object-contain"
                />
                {/* Multi-layer glow effect - Abstract green themed */}
                <div className="absolute inset-0 bg-gradient-to-r from-emerald-400/40 via-green-400/40 to-cyan-400/40 blur-3xl animate-pulse"></div>
                <div className="absolute inset-0 bg-gradient-to-r from-green-400/30 via-emerald-400/30 to-cyan-400/30 blur-2xl animate-pulse animation-delay-2000"></div>
                <div className="absolute inset-0 bg-gradient-to-r from-cyan-400/20 via-emerald-400/20 to-green-400/20 blur-xl animate-pulse animation-delay-4000"></div>
              </div>
            </div>

            {/* Title with modern styling */}
            <div className="relative inline-block mb-8">
              <h1 className="text-5xl md:text-6xl lg:text-7xl font-display font-black mb-2 leading-none tracking-tight">
                <span className="bg-gradient-to-r from-emerald-400 via-green-400 to-cyan-400 bg-clip-text text-transparent animate-gradient">
                  PenguBook
                </span>
              </h1>
              {/* Subtle underline accent - Abstract green */}
              <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 w-32 h-1 bg-gradient-to-r from-emerald-400 via-green-400 to-cyan-400 rounded-full blur-sm"></div>
            </div>

            {/* Tagline with better hierarchy */}
            <p className="text-xl md:text-2xl text-white/90 font-semibold max-w-3xl mx-auto leading-relaxed mb-4">
              The Ultimate Web3 Social Hub on<br/>
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-cyan-400 to-blue-400 font-bold text-2xl md:text-3xl">
                Abstract
              </span>
            </p>

            {/* Description with better spacing */}
            <p className="text-base md:text-lg text-gray-400 max-w-2xl mx-auto leading-relaxed mb-8">
              All you need is an <span className="text-emerald-400 font-semibold">Abstract Global Wallet (AGW)</span> to join!<br className="hidden md:block"/>
              Connect, tip, share, and build the coolest community on Web3.
            </p>

            {/* Modern badge design */}
            <div className="flex flex-wrap items-center justify-center gap-3">
              <div className="inline-flex items-center gap-2 bg-emerald-500/10 backdrop-blur-sm border border-emerald-500/20 rounded-full px-4 py-2">
                <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse"></div>
                <span className="text-emerald-400 text-sm font-semibold">LIVE ON MAINNET</span>
              </div>
              <div className="inline-flex items-center gap-2 glass-card rounded-full px-4 py-2">
                <span className="text-cyan-400">⚡</span>
                <span className="text-gray-400 text-sm font-semibold">POWERED BY ABSTRACT</span>
              </div>
            </div>
          </div>

          {/* Main Content Grid */}
          <div className="grid lg:grid-cols-3 gap-8 mb-16">

            {/* Stats Card - Modern Design */}
            <div className="group relative">
              <div className="absolute -inset-0.5 bg-gradient-to-r from-cyan-500 via-purple-500 to-pink-500 rounded-2xl blur opacity-20 group-hover:opacity-40 transition duration-500"></div>
              <div className="relative glass-card-strong p-8 rounded-2xl">
                <div className="text-center mb-6">
                  <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-cyan-500/20 to-blue-500/20 mb-4">
                    <span className="text-4xl">📊</span>
                  </div>
                  <h2 className="text-2xl font-display font-bold text-white mb-1">
                    Live Stats
                  </h2>
                  <p className="text-gray-400 text-sm">Real-time activity</p>
                </div>

                <div className="space-y-3">
                  <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-cyan-500/10 via-blue-500/10 to-cyan-500/5 p-4 border border-cyan-500/20 hover:border-cyan-400/40 transition-all group/stat">
                    <div className="relative z-10">
                      <div className="text-3xl font-bold text-cyan-400 font-mono mb-0.5">
                        {stats.totalUsers.toLocaleString()}
                      </div>
                      <div className="text-xs text-gray-400 uppercase tracking-wider">Total Penguins</div>
                    </div>
                    <div className="absolute top-0 right-0 w-20 h-20 bg-cyan-400/10 rounded-full blur-2xl group-hover/stat:bg-cyan-400/20 transition-all"></div>
                  </div>

                  <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-emerald-500/10 via-green-500/10 to-emerald-500/5 p-4 border border-emerald-500/20 hover:border-emerald-400/40 transition-all group/stat">
                    <div className="relative z-10">
                      <div className="text-3xl font-bold text-emerald-400 font-mono mb-0.5">
                        {stats.totalTips.toLocaleString()}
                      </div>
                      <div className="text-xs text-gray-400 uppercase tracking-wider">Tips Shared</div>
                    </div>
                    <div className="absolute top-0 right-0 w-20 h-20 bg-emerald-400/10 rounded-full blur-2xl group-hover/stat:bg-emerald-400/20 transition-all"></div>
                  </div>

                  <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-purple-500/10 via-pink-500/10 to-purple-500/5 p-4 border border-purple-500/20 hover:border-purple-400/40 transition-all group/stat">
                    <div className="relative z-10">
                      <div className="text-3xl font-bold text-purple-400 font-mono mb-0.5">
                        {stats.connectedUsers.toLocaleString()}
                      </div>
                      <div className="text-xs text-gray-400 uppercase tracking-wider">Online Now</div>
                    </div>
                    <div className="absolute top-0 right-0 w-20 h-20 bg-purple-400/10 rounded-full blur-2xl group-hover/stat:bg-purple-400/20 transition-all"></div>
                  </div>
                </div>
              </div>
            </div>

            {/* Features Card - Modern Design */}
            <div className="group relative">
              <div className="absolute -inset-0.5 bg-gradient-to-r from-purple-500 via-pink-500 to-cyan-500 rounded-2xl blur opacity-20 group-hover:opacity-40 transition duration-500"></div>
              <div className="relative glass-card-strong p-8 rounded-2xl">
                <div className="text-center mb-6">
                  <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-500/20 to-pink-500/20 mb-4">
                    <span className="text-4xl">⚡</span>
                  </div>
                  <h2 className="text-2xl font-display font-bold text-white mb-1">
                    Key Features
                  </h2>
                  <p className="text-gray-400 text-sm">Built for the community</p>
                </div>

                <div className="space-y-3">
                  <div className="glass-card p-4 rounded-xl hover:bg-white/10 transition-all group/feature cursor-pointer">
                    <div className="flex items-start gap-3">
                      <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-gradient-to-br from-emerald-500/20 to-cyan-500/20 flex items-center justify-center group-hover/feature:scale-110 transition-transform">
                        <span className="text-2xl">💸</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-display font-bold text-white text-sm mb-1">Instant Crypto Tips</h3>
                        <p className="text-xs text-gray-400 leading-relaxed">Lightning-fast tips on Abstract L2</p>
                      </div>
                    </div>
                  </div>

                  <div className="glass-card p-4 rounded-xl hover:bg-white/10 transition-all group/feature cursor-pointer">
                    <div className="flex items-start gap-3">
                      <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500/20 to-purple-500/20 flex items-center justify-center group-hover/feature:scale-110 transition-transform">
                        <span className="text-2xl">🏔️</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-display font-bold text-white text-sm mb-1">Build Communities</h3>
                        <p className="text-xs text-gray-400 leading-relaxed">Create and join penguin colonies</p>
                      </div>
                    </div>
                  </div>

                  <div className="glass-card p-4 rounded-xl hover:bg-white/10 transition-all group/feature cursor-pointer">
                    <div className="flex items-start gap-3">
                      <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-gradient-to-br from-pink-500/20 to-purple-500/20 flex items-center justify-center group-hover/feature:scale-110 transition-transform">
                        <span className="text-2xl">🎨</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-display font-bold text-white text-sm mb-1">Share & Connect</h3>
                        <p className="text-xs text-gray-400 leading-relaxed">Post updates, photos, and moments</p>
                      </div>
                    </div>
                  </div>

                  <div className="glass-card p-4 rounded-xl hover:bg-white/10 transition-all group/feature cursor-pointer">
                    <div className="flex items-start gap-3">
                      <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-gradient-to-br from-yellow-500/20 to-orange-500/20 flex items-center justify-center group-hover/feature:scale-110 transition-transform">
                        <span className="text-2xl">🏆</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-display font-bold text-white text-sm mb-1">Level Up System</h3>
                        <p className="text-xs text-gray-400 leading-relaxed">Earn XP, badges, and achievements</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Connection Portal - Premium Design */}
            <div className="group relative">
              <div className="absolute -inset-0.5 bg-gradient-to-r from-emerald-500 via-cyan-500 to-blue-500 rounded-2xl blur opacity-30 group-hover:opacity-50 transition duration-500"></div>
              <div className="relative glass-card-strong p-8 rounded-2xl overflow-hidden">
                {/* Animated gradient background */}
                <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/5 via-blue-500/5 to-purple-500/5 animate-aurora-flow"></div>

                {/* Decorative orbs */}
                <div className="absolute -top-10 -right-10 w-40 h-40 bg-gradient-to-r from-cyan-400/10 to-blue-400/10 rounded-full blur-3xl"></div>
                <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-gradient-to-r from-purple-400/10 to-pink-400/10 rounded-full blur-3xl"></div>

                <div className="relative space-y-6">
                  {/* Header */}
                  <div className="text-center">
                    <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-emerald-500/20 to-green-500/20 mb-4 group-hover:scale-110 transition-transform duration-300 p-2">
                      <img
                        src={`https://gmgnrepeat.com/pengubooklogo1.png?v=${Date.now()}`}
                        alt="PenguBook"
                        className="w-full h-full object-contain animate-float"
                      />
                    </div>
                    <h2 className="text-2xl font-display font-bold text-white mb-2">
                      Join the Colony
                    </h2>
                    <p className="text-gray-300 text-base">
                      Connect with your Abstract Global Wallet
                    </p>
                  </div>

                  {/* Decorative Divider */}
                  <div className="flex items-center gap-3">
                    <div className="flex-1 h-px bg-gradient-to-r from-transparent via-cyan-400/30 to-transparent"></div>
                    <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                      <span className="text-xs text-emerald-400 font-semibold uppercase tracking-wide">Secure</span>
                    </div>
                    <div className="flex-1 h-px bg-gradient-to-r from-transparent via-cyan-400/30 to-transparent"></div>
                  </div>

                  {/* Wallet Connect */}
                  <WalletConnect />

                  {/* Info Grid with modern icons */}
                  <div className="grid grid-cols-1 gap-2 pt-2">
                    <div className="flex items-center gap-3 p-3 rounded-xl bg-white/5 hover:bg-white/10 transition-all border border-white/10 group/info">
                      <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-500/20 to-blue-500/20 flex items-center justify-center">
                        <span className="text-xl">⚡</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-semibold text-white">Lightning Fast</div>
                        <div className="text-xs text-gray-400">Abstract L2 Technology</div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 p-3 rounded-xl bg-white/5 hover:bg-white/10 transition-all border border-white/10 group/info">
                      <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-500/20 to-green-500/20 flex items-center justify-center">
                        <span className="text-xl">🔒</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-semibold text-white">Bank-Level Security</div>
                        <div className="text-xs text-gray-400">Your keys, your crypto</div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 p-3 rounded-xl bg-white/5 hover:bg-white/10 transition-all border border-white/10 group/info">
                      <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500/20 to-pink-500/20 flex items-center justify-center">
                        <span className="text-xl">🌐</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-semibold text-white">Web3 Native</div>
                        <div className="text-xs text-gray-400">Built for the future</div>
                      </div>
                    </div>
                  </div>

                  {/* Status Indicator */}
                  <div className="text-center pt-2">
                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-500/10 border border-emerald-500/20">
                      <div className="relative">
                        <div className="w-2 h-2 bg-emerald-400 rounded-full"></div>
                        <div className="absolute inset-0 w-2 h-2 bg-emerald-400 rounded-full animate-ping"></div>
                      </div>
                      <span className="text-xs text-emerald-400 font-semibold">COLONY ONLINE</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Bottom Features Banner - Modern Bento Grid */}
          <div className="relative group">
            <div className="absolute -inset-0.5 bg-gradient-to-r from-cyan-500 via-purple-500 to-pink-500 rounded-2xl blur opacity-20 group-hover:opacity-30 transition duration-500"></div>
            <div className="relative glass-card-strong p-6 md:p-8 rounded-2xl">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="group/badge relative overflow-hidden rounded-xl bg-gradient-to-br from-cyan-500/10 to-blue-500/10 p-6 border border-cyan-500/20 hover:border-cyan-400/40 transition-all text-center">
                  <div className="relative z-10">
                    <div className="text-3xl mb-3 inline-block transform group-hover/badge:scale-110 transition-transform">⚡</div>
                    <div className="text-sm font-bold text-white mb-1">Lightning Fast</div>
                    <div className="text-xs text-gray-400">Abstract L2</div>
                  </div>
                  <div className="absolute top-0 right-0 w-16 h-16 bg-cyan-400/10 rounded-full blur-xl group-hover/badge:bg-cyan-400/20 transition-all"></div>
                </div>

                <div className="group/badge relative overflow-hidden rounded-xl bg-gradient-to-br from-emerald-500/10 to-green-500/10 p-6 border border-emerald-500/20 hover:border-emerald-400/40 transition-all text-center">
                  <div className="relative z-10">
                    <div className="text-3xl mb-3 inline-block transform group-hover/badge:scale-110 transition-transform animation-delay-2000">🔒</div>
                    <div className="text-sm font-bold text-white mb-1">Ultra Secure</div>
                    <div className="text-xs text-gray-400">Web3 Native</div>
                  </div>
                  <div className="absolute top-0 right-0 w-16 h-16 bg-emerald-400/10 rounded-full blur-xl group-hover/badge:bg-emerald-400/20 transition-all"></div>
                </div>

                <div className="group/badge relative overflow-hidden rounded-xl bg-gradient-to-br from-purple-500/10 to-pink-500/10 p-6 border border-purple-500/20 hover:border-purple-400/40 transition-all text-center">
                  <div className="relative z-10">
                    <div className="text-3xl mb-3 inline-block transform group-hover/badge:scale-110 transition-transform animation-delay-4000">🐧</div>
                    <div className="text-sm font-bold text-white mb-1">For Penguins</div>
                    <div className="text-xs text-gray-400">By Penguins</div>
                  </div>
                  <div className="absolute top-0 right-0 w-16 h-16 bg-purple-400/10 rounded-full blur-xl group-hover/badge:bg-purple-400/20 transition-all"></div>
                </div>

                <div className="group/badge relative overflow-hidden rounded-xl bg-gradient-to-br from-blue-500/10 to-cyan-500/10 p-6 border border-blue-500/20 hover:border-blue-400/40 transition-all text-center">
                  <div className="relative z-10">
                    <div className="text-3xl mb-3 inline-block transform group-hover/badge:scale-110 transition-transform">🌐</div>
                    <div className="text-sm font-bold text-white mb-1">Decentralized</div>
                    <div className="text-xs text-gray-400">Community First</div>
                  </div>
                  <div className="absolute top-0 right-0 w-16 h-16 bg-blue-400/10 rounded-full blur-xl group-hover/badge:bg-blue-400/20 transition-all"></div>
                </div>
              </div>
            </div>
          </div>

          {/* Footer - Clean & Minimal */}
          <div className="text-center mt-10 space-y-4">
            <p className="text-gray-400 text-sm font-medium">
              Built with 💚 for the Pudgy Penguins community
            </p>
            <div className="flex flex-wrap justify-center items-center gap-3 text-xs text-gray-500">
              <span className="inline-flex items-center gap-1.5">
                <span className="w-1 h-1 rounded-full bg-cyan-400"></span>
                Powered by Abstract Protocol
              </span>
              <span className="w-1 h-1 rounded-full bg-gray-600"></span>
              <span className="inline-flex items-center gap-1.5">
                <span className="w-1 h-1 rounded-full bg-emerald-400"></span>
                Secured by Web3
              </span>
            </div>
            {/* Creator Logo */}
            <div className="flex justify-center items-center gap-3 pt-4">
              <span className="text-sm text-gray-400 font-medium">Created by</span>
              <a href="https://www.gmgnrepeat.com" target="_blank" rel="noopener noreferrer">
                <img
                  src={`https://gmgnrepeat.com/gmgnrepeatlogo.jpeg?v=${Date.now()}`}
                  alt="GMGNRepeat"
                  className="h-12 w-auto object-contain opacity-80 hover:opacity-100 transition-opacity cursor-pointer"
                />
              </a>
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}