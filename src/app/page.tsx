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
          <div className="flex justify-center">
            <img src="https://gmgnrepeat.com/icons/pengubookicon1.png" alt="PenguBook" className="w-32 h-32 animate-float" />
          </div>
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
    <main className="min-h-screen relative overflow-hidden bg-gradient-to-br from-[#0a0f0d] via-[#0d1410] to-[#0f1b14]">
      {/* Enhanced Animated Background - Modern Abstract Green Theme */}
      <div className="absolute inset-0 overflow-hidden">
        {/* Vibrant floating gradient orbs */}
        <div className="absolute top-20 left-10 w-[500px] h-[500px] bg-gradient-to-r from-emerald-400/30 via-green-400/25 to-cyan-400/20 rounded-full blur-3xl animate-blob"></div>
        <div className="absolute top-40 right-20 w-[400px] h-[400px] bg-gradient-to-r from-teal-400/25 via-emerald-400/20 to-green-400/15 rounded-full blur-3xl animate-blob animation-delay-2000"></div>
        <div className="absolute bottom-20 left-1/3 w-[350px] h-[350px] bg-gradient-to-r from-cyan-400/25 via-emerald-400/20 to-teal-400/15 rounded-full blur-3xl animate-blob animation-delay-4000"></div>

        {/* Subtle grid overlay with less opacity */}
        <div className="absolute inset-0 web3-grid-bg opacity-10"></div>

        {/* Enhanced aurora effect */}
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-400/15 via-transparent to-cyan-400/10 opacity-40 animate-aurora-flow"></div>
      </div>

      <div className="relative z-10 min-h-screen flex flex-col justify-center mobile-padding py-20">
        <div className="max-w-[1400px] mx-auto w-full">

          {/* Hero Section - Enhanced with Better Spacing */}
          <div className="text-center mb-24 relative">
            {/* Main Logo - Larger and More Focal */}
            <div className="flex justify-center mb-16">
              <div className="relative group">
                <img
                  src={`https://gmgnrepeat.com/pengubooklogo1.png?v=${Date.now()}`}
                  alt="PenguBook Logo"
                  className="w-56 h-56 md:w-72 md:h-72 lg:w-96 lg:h-96 animate-float filter drop-shadow-2xl transition-all group-hover:scale-[1.02] duration-700 object-contain"
                />
                {/* Vibrant multi-layer glow effect */}
                <div className="absolute inset-0 bg-gradient-to-r from-emerald-400/50 via-teal-400/45 to-cyan-400/40 rounded-full blur-3xl animate-pulse"></div>
                <div className="absolute inset-0 bg-gradient-to-r from-green-400/40 via-emerald-400/35 to-teal-400/30 rounded-full blur-2xl animate-pulse animation-delay-2000"></div>
                <div className="absolute inset-0 bg-gradient-to-r from-cyan-400/30 via-emerald-400/25 to-green-400/20 rounded-full blur-xl animate-pulse animation-delay-4000"></div>
              </div>
            </div>

            {/* Tagline with Better Typography and Spacing */}
            <p className="text-2xl md:text-3xl lg:text-4xl text-white/95 font-light max-w-4xl mx-auto leading-relaxed mb-6 tracking-wide">
              The Ultimate Web3 Social Hub on
            </p>
            <p className="text-3xl md:text-4xl lg:text-5xl font-bold mb-10">
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-teal-400 to-cyan-400">
                Abstract
              </span>
            </p>

            {/* Description with Better Spacing */}
            <p className="text-lg md:text-xl text-gray-300/90 max-w-3xl mx-auto leading-relaxed mb-12 font-light">
              All you need is an <span className="text-emerald-400 font-medium">Abstract Global Wallet</span> to join.
              <br className="hidden md:block"/>
              <span className="text-gray-400/80">Connect, tip, share, and build the coolest community on Web3.</span>
            </p>

            {/* Refined Badge Design with Animations */}
            <div className="flex flex-wrap items-center justify-center gap-4">
              <div className="group/badge inline-flex items-center gap-2.5 bg-gradient-to-r from-emerald-500/15 to-teal-500/10 backdrop-blur-md border border-emerald-400/30 rounded-full px-5 py-2.5 hover:border-emerald-400/50 transition-all duration-300">
                <div className="relative">
                  <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse"></div>
                  <div className="absolute inset-0 w-2 h-2 bg-emerald-400 rounded-full animate-ping"></div>
                </div>
                <span className="text-emerald-300 text-sm font-semibold tracking-wide">LIVE ON MAINNET</span>
              </div>
              <div className="group/badge inline-flex items-center gap-2.5 bg-white/5 backdrop-blur-md border border-white/10 rounded-full px-5 py-2.5 hover:border-cyan-400/30 transition-all duration-300">
                <span className="text-cyan-400 text-lg">⚡</span>
                <span className="text-gray-300 text-sm font-medium tracking-wide">POWERED BY ABSTRACT</span>
              </div>
            </div>
          </div>

          {/* Main Content Grid - Enhanced Spacing */}
          <div className="grid lg:grid-cols-3 gap-10 mb-20">

            {/* Stats Card - Refined Minimalist Design */}
            <div className="group relative">
              <div className="absolute -inset-0.5 bg-gradient-to-r from-emerald-400/40 via-teal-400/30 to-cyan-400/20 rounded-3xl blur-xl opacity-0 group-hover:opacity-100 transition-all duration-700"></div>
              <div className="relative bg-white/5 backdrop-blur-xl border border-white/10 p-10 rounded-3xl hover:border-emerald-400/30 transition-all duration-500">
                <div className="text-center mb-8">
                  <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-400/20 to-teal-400/10 mb-5 group-hover:scale-110 transition-transform duration-500">
                    <svg className="w-7 h-7 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                  </div>
                  <h2 className="text-2xl font-display font-bold text-white/95 mb-2 tracking-tight">
                    Live Stats
                  </h2>
                  <p className="text-gray-400/80 text-sm font-light">Real-time activity</p>
                </div>

                <div className="space-y-4">
                  <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-400/5 to-transparent p-5 border border-white/5 hover:border-emerald-400/20 transition-all duration-300 group/stat">
                    <div className="relative z-10">
                      <div className="text-4xl font-bold text-emerald-400 font-mono mb-1 tracking-tight">
                        {stats.totalUsers.toLocaleString()}
                      </div>
                      <div className="text-sm text-gray-400/90 font-light">Total Penguins</div>
                    </div>
                    <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-400/10 rounded-full blur-2xl group-hover/stat:bg-emerald-400/15 transition-all duration-500"></div>
                  </div>

                  <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-teal-400/5 to-transparent p-5 border border-white/5 hover:border-teal-400/20 transition-all duration-300 group/stat">
                    <div className="relative z-10">
                      <div className="text-4xl font-bold text-teal-400 font-mono mb-1 tracking-tight">
                        {stats.totalTips.toLocaleString()}
                      </div>
                      <div className="text-sm text-gray-400/90 font-light">Tips Shared</div>
                    </div>
                    <div className="absolute top-0 right-0 w-24 h-24 bg-teal-400/10 rounded-full blur-2xl group-hover/stat:bg-teal-400/15 transition-all duration-500"></div>
                  </div>

                  <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-cyan-400/5 to-transparent p-5 border border-white/5 hover:border-cyan-400/20 transition-all duration-300 group/stat">
                    <div className="relative z-10">
                      <div className="text-4xl font-bold text-cyan-400 font-mono mb-1 tracking-tight">
                        {stats.connectedUsers.toLocaleString()}
                      </div>
                      <div className="text-sm text-gray-400/90 font-light">Online Now</div>
                    </div>
                    <div className="absolute top-0 right-0 w-24 h-24 bg-cyan-400/10 rounded-full blur-2xl group-hover/stat:bg-cyan-400/15 transition-all duration-500"></div>
                  </div>
                </div>
              </div>
            </div>

            {/* Features Card - Minimalist Design */}
            <div className="group relative">
              <div className="absolute -inset-0.5 bg-gradient-to-r from-teal-400/40 via-cyan-400/30 to-emerald-400/20 rounded-3xl blur-xl opacity-0 group-hover:opacity-100 transition-all duration-700"></div>
              <div className="relative bg-white/5 backdrop-blur-xl border border-white/10 p-10 rounded-3xl hover:border-teal-400/30 transition-all duration-500">
                <div className="text-center mb-8">
                  <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-teal-400/20 to-cyan-400/10 mb-5 group-hover:scale-110 transition-transform duration-500">
                    <svg className="w-7 h-7 text-teal-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                  </div>
                  <h2 className="text-2xl font-display font-bold text-white/95 mb-2 tracking-tight">
                    Key Features
                  </h2>
                  <p className="text-gray-400/80 text-sm font-light">Built for the community</p>
                </div>

                <div className="space-y-4">
                  <div className="bg-white/5 p-5 rounded-2xl hover:bg-emerald-400/5 border border-white/5 hover:border-emerald-400/20 transition-all duration-300 group/feature">
                    <h3 className="font-display font-semibold text-white/95 text-base mb-1.5 tracking-tight">Instant Crypto Tips</h3>
                    <p className="text-sm text-gray-400/80 leading-relaxed font-light">Lightning-fast tips on Abstract L2</p>
                  </div>

                  <div className="bg-white/5 p-5 rounded-2xl hover:bg-teal-400/5 border border-white/5 hover:border-teal-400/20 transition-all duration-300 group/feature">
                    <h3 className="font-display font-semibold text-white/95 text-base mb-1.5 tracking-tight">Build Communities</h3>
                    <p className="text-sm text-gray-400/80 leading-relaxed font-light">Create and join penguin colonies</p>
                  </div>

                  <div className="bg-white/5 p-5 rounded-2xl hover:bg-cyan-400/5 border border-white/5 hover:border-cyan-400/20 transition-all duration-300 group/feature">
                    <h3 className="font-display font-semibold text-white/95 text-base mb-1.5 tracking-tight">Share & Connect</h3>
                    <p className="text-sm text-gray-400/80 leading-relaxed font-light">Post updates, photos, and moments</p>
                  </div>

                  <div className="bg-white/5 p-5 rounded-2xl hover:bg-emerald-400/5 border border-white/5 hover:border-emerald-400/20 transition-all duration-300 group/feature">
                    <h3 className="font-display font-semibold text-white/95 text-base mb-1.5 tracking-tight">Level Up System</h3>
                    <p className="text-sm text-gray-400/80 leading-relaxed font-light">Earn XP, badges, and achievements</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Connection Portal - Refined Minimalist Design */}
            <div className="group relative">
              <div className="absolute -inset-0.5 bg-gradient-to-r from-cyan-400/40 via-emerald-400/30 to-teal-400/20 rounded-3xl blur-xl opacity-0 group-hover:opacity-100 transition-all duration-700"></div>
              <div className="relative bg-white/5 backdrop-blur-xl border border-white/10 p-10 rounded-3xl hover:border-cyan-400/30 transition-all duration-500">
                <div className="space-y-6">
                  {/* Header with Icon */}
                  <div className="text-center">
                    <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-cyan-400/20 to-emerald-400/10 mb-5 group-hover:scale-110 transition-transform duration-500">
                      <svg className="w-7 h-7 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                      </svg>
                    </div>
                    <h2 className="text-2xl font-display font-bold text-white/95 mb-2 tracking-tight">
                      Join the Colony
                    </h2>
                    <p className="text-gray-400/80 text-sm font-light">Connect with your Abstract Global Wallet</p>
                  </div>

                  {/* Wallet Connect */}
                  <WalletConnect />

                  {/* Info Items - Simplified */}
                  <div className="space-y-3 pt-2">
                    <div className="flex items-center gap-3 p-4 rounded-2xl bg-white/5 hover:bg-emerald-400/5 border border-white/5 hover:border-emerald-400/20 transition-all duration-300">
                      <svg className="w-5 h-5 text-emerald-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-semibold text-white/95">Lightning Fast</div>
                        <div className="text-xs text-gray-400/80 font-light">Abstract L2 Technology</div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 p-4 rounded-2xl bg-white/5 hover:bg-teal-400/5 border border-white/5 hover:border-teal-400/20 transition-all duration-300">
                      <span className="text-xl flex-shrink-0">🧰</span>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-semibold text-white/95">Zero Custody, Zero Worries</div>
                        <div className="text-xs text-gray-400/80 font-light">Your assets, your rules</div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 p-4 rounded-2xl bg-white/5 hover:bg-cyan-400/5 border border-white/5 hover:border-cyan-400/20 transition-all duration-300">
                      <svg className="w-5 h-5 text-cyan-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
                      </svg>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-semibold text-white/95">Web3 Native</div>
                        <div className="text-xs text-gray-400/80 font-light">Built for the future</div>
                      </div>
                    </div>
                  </div>

                  {/* Status Indicator */}
                  <div className="text-center pt-2">
                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-emerald-400/15 to-teal-400/10 border border-emerald-400/30">
                      <div className="relative">
                        <div className="w-2 h-2 bg-emerald-400 rounded-full"></div>
                        <div className="absolute inset-0 w-2 h-2 bg-emerald-400 rounded-full animate-ping"></div>
                      </div>
                      <span className="text-xs text-emerald-300 font-semibold tracking-wide">COLONY ONLINE</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Bottom Features Banner - Simplified Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-16">
            <div className="group/badge relative bg-white/5 backdrop-blur-md border border-white/10 p-8 rounded-3xl hover:border-emerald-400/30 transition-all duration-500 text-center">
              <svg className="w-10 h-10 mx-auto mb-4 text-emerald-400 group-hover/badge:scale-110 transition-transform duration-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              <div className="text-base font-semibold text-white/95 mb-1">Lightning Fast</div>
              <div className="text-sm text-gray-400/80 font-light">Abstract L2</div>
            </div>

            <div className="group/badge relative bg-white/5 backdrop-blur-md border border-white/10 p-8 rounded-3xl hover:border-teal-400/30 transition-all duration-500 text-center">
              <svg className="w-10 h-10 mx-auto mb-4 text-teal-400 group-hover/badge:scale-110 transition-transform duration-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
              <div className="text-base font-semibold text-white/95 mb-1">Ultra Secure</div>
              <div className="text-sm text-gray-400/80 font-light">Web3 Native</div>
            </div>

            <div className="group/badge relative bg-white/5 backdrop-blur-md border border-white/10 p-8 rounded-3xl hover:border-cyan-400/30 transition-all duration-500 text-center">
              <svg className="w-10 h-10 mx-auto mb-4 text-cyan-400 group-hover/badge:scale-110 transition-transform duration-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              <div className="text-base font-semibold text-white/95 mb-1">Community First</div>
              <div className="text-sm text-gray-400/80 font-light">By Penguins</div>
            </div>

            <div className="group/badge relative bg-white/5 backdrop-blur-md border border-white/10 p-8 rounded-3xl hover:border-emerald-400/30 transition-all duration-500 text-center">
              <svg className="w-10 h-10 mx-auto mb-4 text-emerald-400 group-hover/badge:scale-110 transition-transform duration-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
              </svg>
              <div className="text-base font-semibold text-white/95 mb-1">Decentralized</div>
              <div className="text-sm text-gray-400/80 font-light">Web3 Powered</div>
            </div>
          </div>

          {/* Footer - Minimalist & Clean */}
          <div className="text-center mt-12 space-y-6">
            <p className="text-gray-400/90 text-base font-light">
              Built with 💚 for the Pudgy Penguins community
            </p>
            <div className="flex flex-wrap justify-center items-center gap-4 text-sm text-gray-500/80">
              <span className="inline-flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                Powered by Abstract
              </span>
              <span className="w-px h-4 bg-gray-600/50"></span>
              <span className="inline-flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400"></span>
                Secured by Web3
              </span>
            </div>
            {/* Creator Logo */}
            <div className="flex justify-center items-center gap-4 pt-2">
              <span className="text-sm text-gray-400/80 font-light">Created by</span>
              <a href="https://www.gmgnrepeat.com" target="_blank" rel="noopener noreferrer" className="group/logo">
                <img
                  src={`https://gmgnrepeat.com/gmgnrepeatlogo.jpeg?v=${Date.now()}`}
                  alt="GMGNRepeat"
                  className="h-14 w-auto object-contain opacity-75 group-hover/logo:opacity-100 transition-all duration-300 group-hover/logo:scale-105"
                />
              </a>
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}