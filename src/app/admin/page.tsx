'use client'

import { useAuth } from '@/providers/AuthProvider'
import { useTheme } from '@/providers/ThemeProvider'
import Navbar from '@/components/Navbar'
import TokenBlacklistManager from '@/components/admin/TokenBlacklistManager'
import TokenVerificationManager from '@/components/admin/TokenVerificationManager'
import UserManager from '@/components/admin/UserManager'
import AchievementManager from '@/components/admin/AchievementManager'
import XPLevelManager from '@/components/admin/XPLevelManager'
import { useState, useEffect } from 'react'
import Link from 'next/link'

export default function AdminPage() {
  const { user, isAuthenticated, loading: authLoading } = useAuth()
  const { currentTheme } = useTheme()
  const [activeTab, setActiveTab] = useState('overview')
  const [stats, setStats] = useState({
    totalUsers: 0,
    verifiedTokens: 0,
    blacklistedTokens: 0,
    pendingReports: 0,
    recentUsers: 0,
    loading: true
  })

  useEffect(() => {
    if (user?.isAdmin && activeTab === 'overview') {
      fetchStats()
    }
  }, [user, activeTab])

  const fetchStats = async () => {
    try {
      const response = await fetch('/api/admin/stats')
      if (response.ok) {
        const data = await response.json()
        setStats({
          ...data,
          loading: false
        })
      }
    } catch (error) {
      console.error('Error fetching stats:', error)
      setStats(prev => ({ ...prev, loading: false }))
    }
  }

  if (authLoading) {
    return (
      <div style={{ background: `linear-gradient(135deg, ${currentTheme.colors.from}, ${currentTheme.colors.via}, ${currentTheme.colors.to})` }} className="min-h-screen transition-all duration-500">
        <Navbar />
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center text-white">
            <div className="text-6xl mb-4">👑</div>
            <h1 className="text-2xl font-bold mb-4">Loading Admin Panel...</h1>
            <div className="w-8 h-8 border-4 border-white border-t-transparent rounded-full animate-spin mx-auto"></div>
          </div>
        </div>
      </div>
    )
  }

  if (!isAuthenticated || !user) {
    return (
      <div style={{ background: `linear-gradient(135deg, ${currentTheme.colors.from}, ${currentTheme.colors.via}, ${currentTheme.colors.to})` }} className="min-h-screen transition-all duration-500">
        <Navbar />
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center text-white">
            <div className="text-6xl mb-4">🚫</div>
            <h1 className="text-2xl font-bold mb-4">Access Denied</h1>
            <p className="text-gray-300 mb-6">You need to connect your wallet to access this page!</p>
            <Link href="/" className="bg-cyan-500 text-white px-6 py-3 rounded-xl hover:bg-cyan-600 transition-colors">
              Back to Home
            </Link>
          </div>
        </div>
      </div>
    )
  }

  if (!user.isAdmin) {
    return (
      <div style={{ background: `linear-gradient(135deg, ${currentTheme.colors.from}, ${currentTheme.colors.via}, ${currentTheme.colors.to})` }} className="min-h-screen transition-all duration-500">
        <Navbar />
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center text-white">
            <div className="text-6xl mb-4">👑</div>
            <h1 className="text-2xl font-bold mb-4">Admin Access Required</h1>
            <p className="text-gray-300 mb-6">You need admin privileges to access this panel!</p>
            <Link href="/dashboard" className="bg-cyan-500 text-white px-6 py-3 rounded-xl hover:bg-cyan-600 transition-colors">
              Back to Dashboard
            </Link>
          </div>
        </div>
      </div>
    )
  }

  const tabs = [
    { id: 'overview', name: 'Overview', icon: '📊' },
    { id: 'achievements', name: 'Achievements', icon: '🏆' },
    { id: 'xp-levels', name: 'XP Levels', icon: '⭐' },
    { id: 'reports', name: 'Token Reports', icon: '⚠️' },
    { id: 'blacklist', name: 'Blacklist', icon: '🚫' },
    { id: 'verified', name: 'Verification', icon: '✓' },
    { id: 'users', name: 'User Management', icon: '👥' },
    { id: 'analytics', name: 'Analytics', icon: '📈' }
  ]

  return (
    <div style={{ background: `linear-gradient(135deg, ${currentTheme.colors.from}, ${currentTheme.colors.via}, ${currentTheme.colors.to})` }} className="min-h-screen transition-all duration-500">
      <Navbar />

      <div className="container mx-auto px-4 py-8">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="text-5xl mb-4">👑</div>
            <h1 className="text-3xl font-bold text-white mb-2">Admin Panel</h1>
            <p className="text-gray-300">Welcome back, {user.displayName}!</p>
          </div>

          {/* Navigation Tabs */}
          <div className="mb-8">
            <nav className="flex space-x-1 bg-black/20 p-1 rounded-2xl backdrop-blur-lg border border-white/20">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-4 py-3 rounded-xl transition-all duration-200 ${
                    activeTab === tab.id
                      ? 'bg-cyan-500 text-white shadow-lg'
                      : 'text-gray-300 hover:text-white hover:bg-white/10'
                  }`}
                >
                  <span className="text-lg">{tab.icon}</span>
                  <span className="font-medium">{tab.name}</span>
                </button>
              ))}
            </nav>
          </div>

          {/* Tab Content */}
          <div className="min-h-[500px]">
            {activeTab === 'overview' && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {/* Stats Cards */}
                <div className="bg-black/20 backdrop-blur-lg rounded-2xl border border-white/20 p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-white">Platform Stats</h3>
                    <span className="text-2xl">📊</span>
                  </div>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-gray-300">Total Users</span>
                      <span className="text-white font-bold">
                        {stats.loading ? '...' : stats.totalUsers.toLocaleString()}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-300">Verified Tokens</span>
                      <span className="text-white font-bold">
                        {stats.loading ? '...' : stats.verifiedTokens}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-300">Blacklisted Tokens</span>
                      <span className="text-white font-bold text-red-400">
                        {stats.loading ? '...' : stats.blacklistedTokens}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="bg-black/20 backdrop-blur-lg rounded-2xl border border-white/20 p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-white">Recent Activity</h3>
                    <span className="text-2xl">🔥</span>
                  </div>
                  <div className="space-y-3 text-sm">
                    <div className="text-gray-300">
                      {stats.loading ? '...' : stats.recentUsers} new {stats.recentUsers === 1 ? 'user' : 'users'} registered today
                    </div>
                    <div className="text-gray-300">
                      {stats.loading ? '...' : stats.pendingReports} pending scam {stats.pendingReports === 1 ? 'report' : 'reports'}
                    </div>
                    <div className="text-gray-300">
                      {stats.loading ? '...' : stats.verifiedTokens} verified {stats.verifiedTokens === 1 ? 'token' : 'tokens'}
                    </div>
                  </div>
                </div>

                <div className="bg-black/20 backdrop-blur-lg rounded-2xl border border-white/20 p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-white">Quick Actions</h3>
                    <span className="text-2xl">⚡</span>
                  </div>
                  <div className="space-y-3">
                    <button
                      onClick={() => setActiveTab('reports')}
                      className="w-full bg-yellow-500/20 text-yellow-300 border border-yellow-500/50 py-2 rounded-lg hover:bg-yellow-500/30 transition-colors text-sm"
                    >
                      Review Reports
                    </button>
                    <button
                      onClick={() => setActiveTab('verified')}
                      className="w-full bg-blue-500/20 text-blue-300 border border-blue-500/50 py-2 rounded-lg hover:bg-blue-500/30 transition-colors text-sm"
                    >
                      Verify Tokens
                    </button>
                    <button
                      onClick={() => setActiveTab('users')}
                      className="w-full bg-purple-500/20 text-purple-300 border border-purple-500/50 py-2 rounded-lg hover:bg-purple-500/30 transition-colors text-sm"
                    >
                      Manage Users
                    </button>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'reports' && (
              <TokenBlacklistManager initialTab="reports" />
            )}

            {activeTab === 'blacklist' && (
              <TokenBlacklistManager initialTab="blacklist" />
            )}

            {activeTab === 'verified' && <TokenVerificationManager />}

            {activeTab === 'achievements' && <AchievementManager />}

            {activeTab === 'xp-levels' && <XPLevelManager />}

            {activeTab === 'users' && <UserManager />}

            {activeTab === 'analytics' && (
              <div className="bg-black/20 backdrop-blur-lg rounded-2xl border border-white/20 p-6">
                <div className="text-center py-12">
                  <div className="text-6xl mb-4">📈</div>
                  <h3 className="text-xl font-bold text-white mb-2">Analytics Dashboard</h3>
                  <p className="text-gray-400">Coming soon! Advanced analytics and insights.</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}