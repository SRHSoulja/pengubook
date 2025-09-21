'use client'

import { useAuth } from '@/providers/AuthProvider'
import Navbar from '@/components/Navbar'
import TokenManager from '@/components/admin/TokenManager'
import UserManager from '@/components/admin/UserManager'
import { useState } from 'react'
import Link from 'next/link'

export default function AdminPage() {
  const { user, isAuthenticated, loading: authLoading } = useAuth()
  const [activeTab, setActiveTab] = useState('overview')

  if (authLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-900 via-purple-900 to-indigo-900">
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
      <div className="min-h-screen bg-gradient-to-br from-blue-900 via-purple-900 to-indigo-900">
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
      <div className="min-h-screen bg-gradient-to-br from-blue-900 via-purple-900 to-indigo-900">
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
    { id: 'tokens', name: 'Token Management', icon: '🪙' },
    { id: 'users', name: 'User Management', icon: '👥' },
    { id: 'analytics', name: 'Analytics', icon: '📈' }
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-purple-900 to-indigo-900">
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
                      <span className="text-white font-bold">1,247</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-300">Active Tokens</span>
                      <span className="text-white font-bold">8</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-300">Total Tips</span>
                      <span className="text-white font-bold">542</span>
                    </div>
                  </div>
                </div>

                <div className="bg-black/20 backdrop-blur-lg rounded-2xl border border-white/20 p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-white">Recent Activity</h3>
                    <span className="text-2xl">🔥</span>
                  </div>
                  <div className="space-y-3 text-sm">
                    <div className="text-gray-300">5 new users registered today</div>
                    <div className="text-gray-300">12 tips sent in last hour</div>
                    <div className="text-gray-300">3 communities created this week</div>
                  </div>
                </div>

                <div className="bg-black/20 backdrop-blur-lg rounded-2xl border border-white/20 p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-white">Quick Actions</h3>
                    <span className="text-2xl">⚡</span>
                  </div>
                  <div className="space-y-3">
                    <button
                      onClick={() => setActiveTab('tokens')}
                      className="w-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/50 py-2 rounded-lg hover:bg-cyan-500/30 transition-colors text-sm"
                    >
                      Manage Tokens
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

            {activeTab === 'tokens' && <TokenManager />}

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