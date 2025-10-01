'use client'

import { useAuth } from '@/providers/AuthProvider'
import Navbar from '@/components/Navbar'
import SocialAccountLinking from '@/components/SocialAccountLinking'
import PrivacySettings from '@/components/PrivacySettings'
import MutedPhrasesManager from '@/components/MutedPhrasesManager'
import Link from 'next/link'

export default function SettingsPage() {
  const { user, isAuthenticated, loading: authLoading } = useAuth()

  if (authLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-900 via-purple-900 to-indigo-900">
        <Navbar />
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center text-white">
            <div className="text-6xl mb-4">🐧</div>
            <h1 className="text-2xl font-bold mb-4">Loading...</h1>
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
            <div className="text-6xl mb-4">🐧</div>
            <h1 className="text-2xl font-bold mb-4">Access Denied</h1>
            <p className="text-gray-300 mb-6">You need to connect your wallet to access settings!</p>
            <Link href="/" className="bg-cyan-500 text-white px-6 py-3 rounded-xl hover:bg-cyan-600 transition-colors">
              Back to Home
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-purple-900 to-indigo-900">
      <Navbar />

      <div className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto">
          <div className="text-center mb-8">
            <div className="text-5xl mb-4">⚙️</div>
            <h1 className="text-3xl font-bold text-white mb-2">Account Settings</h1>
            <p className="text-gray-300">Manage your account and social connections</p>
          </div>

          {/* Account Info Card */}
          <div className="bg-white/10 backdrop-blur-lg rounded-2xl border border-white/20 p-6 mb-6">
            <h2 className="text-xl font-bold text-white mb-4 flex items-center">
              <span className="mr-2">👤</span> Account Information
            </h2>
            <div className="space-y-4">
              <div>
                <label className="text-gray-300 text-sm">Wallet Address</label>
                <p className="text-white font-mono text-sm bg-black/20 p-2 rounded break-all">
                  {user.walletAddress}
                </p>
              </div>
              <div>
                <label className="text-gray-300 text-sm">Username</label>
                <p className="text-white bg-black/20 p-2 rounded">
                  {user.username || 'Not set'}
                </p>
              </div>
              <div>
                <label className="text-gray-300 text-sm">Display Name</label>
                <p className="text-white bg-black/20 p-2 rounded">
                  {user.displayName || 'Not set'}
                </p>
              </div>
              <div>
                <label className="text-gray-300 text-sm">Level</label>
                <p className="text-white bg-black/20 p-2 rounded flex items-center">
                  Level {user.level} {user.isAdmin && <span className="ml-2 bg-yellow-500/20 text-yellow-300 px-2 py-1 rounded text-xs">ADMIN</span>}
                </p>
              </div>
            </div>

            <div className="mt-4 flex items-center justify-between bg-blue-500/10 border border-blue-500/20 rounded-xl p-3">
              <div>
                <p className="text-blue-300 text-sm font-medium">Edit Profile Information</p>
                <p className="text-gray-400 text-xs">Update your username, bio, and interests</p>
              </div>
              <Link
                href="/profile/edit"
                className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg transition-colors text-sm"
              >
                Edit Profile
              </Link>
            </div>
          </div>

          {/* Social Accounts Card */}
          <div className="bg-white/10 backdrop-blur-lg rounded-2xl border border-white/20 p-6 mb-6">
            <SocialAccountLinking />
          </div>

          {/* Privacy Settings */}
          <PrivacySettings />

          {/* Muted Phrases */}
          <div className="mb-6">
            <MutedPhrasesManager />
          </div>

          {/* Additional Settings Info */}
          <div className="mt-6 bg-white/5 backdrop-blur-lg rounded-2xl border border-white/10 p-6">
            <h3 className="text-lg font-semibold text-white mb-3 flex items-center">
              <span className="mr-2">ℹ️</span> About Settings
            </h3>
            <div className="space-y-2 text-gray-300 text-sm">
              <p>• <strong>Social Connections:</strong> Link your Discord and X accounts to help other penguins find you</p>
              <p>• <strong>Message Privacy:</strong> Control who can send you direct messages</p>
              <p>• <strong>Profile Privacy:</strong> Manage what information is visible on your profile</p>
              <p>• <strong>Blocking:</strong> Block users to prevent them from messaging or interacting with you</p>
              <p>• <strong>Muted Phrases:</strong> Filter content containing specific words or phrases from your feed</p>
              <p>• All settings are saved automatically and take effect immediately</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}