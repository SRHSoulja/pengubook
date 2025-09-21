'use client'

import { useState } from 'react'
import { useAuth } from '@/providers/AuthProvider'
import { useTheme } from '@/providers/ThemeProvider'
import Navbar from '@/components/Navbar'
import TipModal from '@/components/TipModal'
import ThemeCustomizer from '@/components/ThemeCustomizer'
import PenguinLoadingScreen from '@/components/PenguinLoadingScreen'

export default function Dashboard() {
  const { user, loading, isAuthenticated } = useAuth()
  const { currentTheme, applyTheme } = useTheme()
  const [showTipModal, setShowTipModal] = useState(false)
  const [showThemeCustomizer, setShowThemeCustomizer] = useState(false)

  // Show loading screen while checking auth
  if (loading) {
    return <PenguinLoadingScreen />
  }

  // Show access denied if not authenticated
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-900 via-purple-900 to-indigo-900 flex items-center justify-center">
        <div className="text-center text-white">
          <div className="text-6xl mb-4">🐧</div>
          <h1 className="text-2xl font-bold mb-4">Access Denied</h1>
          <p className="text-gray-300 mb-6">You need to connect your wallet to access the colony!</p>
          <a href="/" className="bg-cyan-500 text-white px-6 py-3 rounded-xl hover:bg-cyan-600 transition-colors">
            Back to Home
          </a>
        </div>
      </div>
    )
  }

  return (
    <div className={`min-h-screen bg-gradient-to-br ${currentTheme.bgGradient}`}>
      <Navbar />

      <div className="container-responsive mobile-padding py-12">
        <div className="max-w-5xl mx-auto">
          {/* Enhanced Welcome Header */}
          <div className="text-center mb-16 relative">
            <div className="relative inline-block">
              <div className="text-8xl mb-6 animate-float">🐧</div>
              <div className="absolute inset-0 animate-aurora-flow opacity-30 rounded-full"></div>
            </div>
            <h1 className="text-5xl md:text-6xl font-display font-bold text-gradient mb-6 leading-tight">
              Welcome to the Colony,<br />
              <span className="text-neon-cyan animate-glow">
                {user?.displayName || 'Fellow Penguin'}
              </span>!
            </h1>
            <p className="text-xl md:text-2xl text-gray-300 max-w-2xl mx-auto leading-relaxed">
              Ready to waddle into the social ice? Let's explore the Antarctic together!
              <span className="text-neon-cyan animate-pulse ml-2">❄️</span>
            </p>

            {/* Decorative elements */}
            <div className="absolute top-0 left-1/4 w-32 h-32 bg-emerald-400/10 rounded-full blur-xl animate-blob"></div>
            <div className="absolute bottom-0 right-1/4 w-24 h-24 bg-purple-500/10 rounded-full blur-xl animate-blob animation-delay-2000"></div>
          </div>

          {/* Enhanced Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
            <div className="glass-card-strong hover-lift group text-center p-8 relative overflow-hidden">
              <div className="text-5xl mb-4 group-hover:animate-float">💸</div>
              <h3 className="text-xl font-display font-semibold text-white mb-2">Tips Sent</h3>
              <p className="text-4xl font-bold text-neon-cyan font-mono">
                {user?.profile?.tipsSentCount || 0}
              </p>
              <div className="absolute top-0 right-0 w-20 h-20 bg-cyan-500/10 rounded-full blur-xl group-hover:bg-cyan-500/20 transition-colors"></div>
            </div>

            <div className="glass-card-strong hover-lift group text-center p-8 relative overflow-hidden">
              <div className="text-5xl mb-4 group-hover:animate-float">🎁</div>
              <h3 className="text-xl font-display font-semibold text-white mb-2">Tips Received</h3>
              <p className="text-4xl font-bold text-neon-green font-mono">
                {user?.profile?.tipsReceivedCount || 0}
              </p>
              <div className="absolute top-0 right-0 w-20 h-20 bg-green-500/10 rounded-full blur-xl group-hover:bg-green-500/20 transition-colors"></div>
            </div>

            <div className="glass-card-strong hover-lift group text-center p-8 relative overflow-hidden">
              <div className="text-5xl mb-4 group-hover:animate-float">🏔️</div>
              <h3 className="text-xl font-display font-semibold text-white mb-2">Penguin Level</h3>
              <p className="text-3xl font-bold text-neon-purple font-display">
                {(user?.profile?.tipsReceivedCount || 0) >= 50 ? 'Emperor' :
                 (user?.profile?.tipsReceivedCount || 0) >= 20 ? 'King' :
                 (user?.profile?.tipsReceivedCount || 0) >= 10 ? 'Noble' :
                 (user?.profile?.tipsReceivedCount || 0) >= 5 ? 'Explorer' : 'Hatchling'}
              </p>
              <div className="absolute top-0 right-0 w-20 h-20 bg-purple-500/10 rounded-full blur-xl group-hover:bg-purple-500/20 transition-colors"></div>
            </div>
          </div>

          {/* Enhanced Quick Actions */}
          <div className="glass-card-strong p-10 relative overflow-hidden">
            <h2 className="text-3xl font-display font-bold text-gradient mb-8 flex items-center">
              <span className="mr-4 text-4xl animate-float">⚡</span>
              Quick Actions
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <a
                href="/profile"
                className="group glass-card hover-lift hover-glow p-6 rounded-2xl transition-all duration-300 flex flex-col items-center text-center space-y-3"
              >
                <span className="text-4xl group-hover:animate-float">👤</span>
                <div>
                  <h3 className="font-display font-semibold text-white text-lg">My Profile</h3>
                  <p className="text-sm text-gray-400">View and edit your profile</p>
                </div>
                <div className="w-full h-1 bg-gradient-to-r from-emerald-400 to-purple-500 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"></div>
              </a>

              <a
                href="/settings"
                className="group glass-card hover-lift hover-glow p-6 rounded-2xl transition-all duration-300 flex flex-col items-center text-center space-y-3"
              >
                <span className="text-4xl group-hover:animate-float">⚙️</span>
                <div>
                  <h3 className="font-display font-semibold text-white text-lg">Settings</h3>
                  <p className="text-sm text-gray-400">Manage profile & accounts</p>
                </div>
                <div className="w-full h-1 bg-gradient-to-r from-emerald-400 to-cyan-500 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"></div>
              </a>

              <button
                onClick={() => setShowTipModal(true)}
                className="group glass-card hover-lift hover-glow p-6 rounded-2xl transition-all duration-300 flex flex-col items-center text-center space-y-3"
              >
                <span className="text-4xl group-hover:animate-float">💸</span>
                <div>
                  <h3 className="font-display font-semibold text-white text-lg">Send Tip</h3>
                  <p className="text-sm text-gray-400">Spread penguin love</p>
                </div>
                <div className="w-full h-1 bg-gradient-to-r from-emerald-400 to-green-400 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"></div>
              </button>

              <a
                href="/feed"
                className="group glass-card hover-lift hover-glow p-6 rounded-2xl transition-all duration-300 flex flex-col items-center text-center space-y-3"
              >
                <span className="text-4xl group-hover:animate-float">📝</span>
                <div>
                  <h3 className="font-display font-semibold text-white text-lg">Social Feed</h3>
                  <p className="text-sm text-gray-400">See what's happening</p>
                </div>
                <div className="w-full h-1 bg-gradient-to-r from-emerald-400 to-purple-500 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"></div>
              </a>

              <a
                href="/discover"
                className="group glass-card hover-lift hover-glow p-6 rounded-2xl transition-all duration-300 flex flex-col items-center text-center space-y-3"
              >
                <span className="text-4xl group-hover:animate-float">🧭</span>
                <div>
                  <h3 className="font-display font-semibold text-white text-lg">Discover</h3>
                  <p className="text-sm text-gray-400">Find new penguins</p>
                </div>
                <div className="w-full h-1 bg-gradient-to-r from-emerald-400 to-yellow-400 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"></div>
              </a>

              <a
                href="/communities"
                className="group glass-card hover-lift hover-glow p-6 rounded-2xl transition-all duration-300 flex flex-col items-center text-center space-y-3"
              >
                <span className="text-4xl group-hover:animate-float">🏔️</span>
                <div>
                  <h3 className="font-display font-semibold text-white text-lg">Communities</h3>
                  <p className="text-sm text-gray-400">Join penguin colonies</p>
                </div>
                <div className="w-full h-1 bg-gradient-to-r from-emerald-400 to-blue-500 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"></div>
              </a>

              <a
                href="/friends"
                className="group glass-card hover-lift hover-glow p-6 rounded-2xl transition-all duration-300 flex flex-col items-center text-center space-y-3"
              >
                <span className="text-4xl group-hover:animate-float">🤝</span>
                <div>
                  <h3 className="font-display font-semibold text-white text-lg">FRENS</h3>
                  <p className="text-sm text-gray-400">Connect with penguins</p>
                </div>
                <div className="w-full h-1 bg-gradient-to-r from-emerald-400 to-purple-400 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"></div>
              </a>

              <button
                onClick={() => setShowThemeCustomizer(true)}
                className="group glass-card hover-lift hover-glow p-6 rounded-2xl transition-all duration-300 flex flex-col items-center text-center space-y-3"
              >
                <span className="text-4xl group-hover:animate-float">🎨</span>
                <div>
                  <h3 className="font-display font-semibold text-white text-lg">Themes</h3>
                  <p className="text-sm text-gray-400">Customize your style</p>
                </div>
                <div className="w-full h-1 bg-gradient-to-r from-emerald-400 to-purple-500 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"></div>
              </button>
            </div>

            {/* Background decorative elements */}
            <div className="absolute -top-20 -right-20 w-40 h-40 bg-emerald-500/5 rounded-full blur-3xl"></div>
            <div className="absolute -bottom-20 -left-20 w-32 h-32 bg-emerald-400/10 rounded-full blur-3xl"></div>
            <div className="absolute top-1/2 left-1/2 w-24 h-24 bg-purple-500/5 rounded-full blur-2xl"></div>
          </div>
        </div>
      </div>

      <TipModal
        isOpen={showTipModal}
        onClose={() => setShowTipModal(false)}
      />

      <ThemeCustomizer
        isOpen={showThemeCustomizer}
        onClose={() => setShowThemeCustomizer(false)}
        onThemeChange={applyTheme}
      />
    </div>
  )
}