'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/hooks/useAuth'
import Navbar from '@/components/Navbar'
import Link from 'next/link'

export default function SettingsPage() {
  const { user, isAuthenticated, loading: authLoading } = useAuth()
  const [loading, setLoading] = useState(false)
  const [profileLoading, setProfileLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [profileMessage, setProfileMessage] = useState('')
  const [username, setUsername] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [disconnecting, setDisconnecting] = useState<'discord' | 'twitter' | null>(null)

  useEffect(() => {
    if (user) {
      setUsername(user.username || '')
      setDisplayName(user.displayName || '')
    }
  }, [user])

  useEffect(() => {
    // Check for OAuth callback messages
    const urlParams = new URLSearchParams(window.location.search)
    const success = urlParams.get('success')
    const error = urlParams.get('error')

    if (success === 'discord_connected') {
      setMessage('Discord account connected successfully!')
      window.history.replaceState({}, '', '/settings')
    } else if (success === 'twitter_connected') {
      setMessage('X (Twitter) account connected successfully!')
      window.history.replaceState({}, '', '/settings')
    } else if (error) {
      const errorMessages: { [key: string]: string } = {
        discord_auth_cancelled: 'Discord authentication was cancelled',
        discord_auth_failed: 'Discord authentication failed',
        discord_config_missing: 'Discord OAuth not configured',
        discord_token_failed: 'Failed to exchange Discord token',
        discord_user_failed: 'Failed to fetch Discord user info',
        discord_db_failed: 'Failed to save Discord connection',
        twitter_auth_cancelled: 'X authentication was cancelled',
        twitter_auth_failed: 'X authentication failed',
        twitter_config_missing: 'X OAuth not configured',
        twitter_token_failed: 'Failed to exchange X token',
        twitter_user_failed: 'Failed to fetch X user info',
        twitter_db_failed: 'Failed to save X connection',
      }
      setMessage(errorMessages[error] || 'Authentication failed')
      window.history.replaceState({}, '', '/settings')
    }
  }, [])

  const handleProfileUpdate = async () => {
    if (!user) return

    setProfileLoading(true)
    setProfileMessage('')

    try {
      const response = await fetch('/api/users/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          walletAddress: user.walletAddress,
          username,
          displayName,
        }),
      })

      const data = await response.json()

      if (response.ok) {
        setProfileMessage('Profile updated successfully!')
      } else {
        setProfileMessage(data.error || 'Failed to update profile')
      }
    } catch (error) {
      setProfileMessage('Error updating profile')
    } finally {
      setProfileLoading(false)
    }
  }

  const handleDiscordConnect = () => {
    if (!user) return
    const baseUrl = window.location.origin
    window.location.href = `${baseUrl}/api/auth/discord?wallet=${encodeURIComponent(user.walletAddress)}`
  }

  const handleTwitterConnect = () => {
    if (!user) return
    const baseUrl = window.location.origin
    window.location.href = `${baseUrl}/api/auth/twitter?wallet=${encodeURIComponent(user.walletAddress)}`
  }

  const handleDisconnect = async (platform: 'discord' | 'twitter') => {
    if (!user) return

    setDisconnecting(platform)
    setMessage('')

    try {
      const response = await fetch(`/api/auth/${platform}/disconnect`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          walletAddress: user.walletAddress,
        }),
      })

      const data = await response.json()

      if (response.ok) {
        setMessage(`${platform === 'discord' ? 'Discord' : 'X'} account disconnected successfully!`)
        // Refresh the page to update the user data
        window.location.reload()
      } else {
        setMessage(data.error || `Failed to disconnect ${platform} account`)
      }
    } catch (error) {
      setMessage(`Error disconnecting ${platform} account`)
    } finally {
      setDisconnecting(null)
    }
  }

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
            <p className="text-gray-300">Manage your PenguBook profile and connected accounts</p>
          </div>

          {/* Profile Info Card */}
          <div className="bg-white/10 backdrop-blur-lg rounded-2xl border border-white/20 p-6 mb-6">
            <h2 className="text-xl font-bold text-white mb-4 flex items-center">
              <span className="mr-2">👤</span> Profile Information
            </h2>
            <div className="space-y-4">
              <div>
                <label className="text-gray-300 text-sm">Wallet Address</label>
                <p className="text-white font-mono text-sm bg-black/20 p-2 rounded">
                  {user.walletAddress}
                </p>
              </div>
              <div>
                <label className="text-gray-300 text-sm mb-2 block">Username</label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full bg-black/30 text-white placeholder-gray-400 border border-white/20 rounded-xl px-4 py-2 focus:outline-none focus:border-cyan-400"
                  placeholder="Enter your username"
                />
              </div>
              <div>
                <label className="text-gray-300 text-sm mb-2 block">Display Name</label>
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="w-full bg-black/30 text-white placeholder-gray-400 border border-white/20 rounded-xl px-4 py-2 focus:outline-none focus:border-cyan-400"
                  placeholder="Enter your display name"
                />
              </div>
              <div>
                <label className="text-gray-300 text-sm">Level</label>
                <p className="text-white bg-black/20 p-2 rounded flex items-center">
                  Level {user.level} {user.isAdmin && <span className="ml-2 bg-yellow-500/20 text-yellow-300 px-2 py-1 rounded text-xs">ADMIN</span>}
                </p>
              </div>
            </div>

            {profileMessage && (
              <div className={`mt-4 p-3 rounded-xl ${
                profileMessage.includes('success')
                  ? 'bg-green-500/20 text-green-300 border border-green-500/30'
                  : 'bg-red-500/20 text-red-300 border border-red-500/30'
              }`}>
                {profileMessage}
              </div>
            )}

            <button
              onClick={handleProfileUpdate}
              disabled={profileLoading}
              className="mt-4 w-full bg-gradient-to-r from-purple-500 to-pink-500 text-white font-semibold py-3 rounded-xl hover:from-purple-600 hover:to-pink-600 transition-all transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {profileLoading ? 'Updating...' : 'Update Profile'}
            </button>
          </div>

          {/* Social Accounts Card */}
          <div className="bg-white/10 backdrop-blur-lg rounded-2xl border border-white/20 p-6">
            <h2 className="text-xl font-bold text-white mb-4 flex items-center">
              <span className="mr-2">🔗</span> Connected Accounts
            </h2>

            <div className="space-y-6">
              {/* Discord */}
              <div className="bg-black/20 rounded-xl p-4 border border-white/10">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <span className="text-3xl mr-3">💬</span>
                    <div>
                      <h3 className="text-white font-semibold">Discord</h3>
                      {user?.discordName ? (
                        <p className="text-gray-300 text-sm">{user.discordName}</p>
                      ) : (
                        <p className="text-gray-400 text-sm">Not connected</p>
                      )}
                    </div>
                  </div>
                  <div>
                    {user?.discordName ? (
                      <button
                        onClick={() => handleDisconnect('discord')}
                        disabled={disconnecting === 'discord'}
                        className="bg-red-500/20 text-red-300 hover:bg-red-500/30 px-4 py-2 rounded-xl transition-colors border border-red-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {disconnecting === 'discord' ? 'Disconnecting...' : 'Disconnect'}
                      </button>
                    ) : (
                      <button
                        onClick={handleDiscordConnect}
                        className="bg-gradient-to-r from-indigo-500 to-purple-500 text-white px-6 py-2 rounded-xl hover:from-indigo-600 hover:to-purple-600 transition-all transform hover:scale-105"
                      >
                        Connect Discord
                      </button>
                    )}
                  </div>
                </div>
                <p className="text-gray-400 text-xs mt-2">
                  Connect your Discord to enable notifications and show on your profile
                </p>
              </div>

              {/* X/Twitter */}
              <div className="bg-black/20 rounded-xl p-4 border border-white/10">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <span className="text-3xl mr-3">𝕏</span>
                    <div>
                      <h3 className="text-white font-semibold">X (Twitter)</h3>
                      {user?.twitterHandle ? (
                        <p className="text-gray-300 text-sm">{user.twitterHandle}</p>
                      ) : (
                        <p className="text-gray-400 text-sm">Not connected</p>
                      )}
                    </div>
                  </div>
                  <div>
                    {user?.twitterHandle ? (
                      <button
                        onClick={() => handleDisconnect('twitter')}
                        disabled={disconnecting === 'twitter'}
                        className="bg-red-500/20 text-red-300 hover:bg-red-500/30 px-4 py-2 rounded-xl transition-colors border border-red-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {disconnecting === 'twitter' ? 'Disconnecting...' : 'Disconnect'}
                      </button>
                    ) : (
                      <button
                        onClick={handleTwitterConnect}
                        className="bg-gradient-to-r from-blue-500 to-cyan-500 text-white px-6 py-2 rounded-xl hover:from-blue-600 hover:to-cyan-600 transition-all transform hover:scale-105"
                      >
                        Connect X
                      </button>
                    )}
                  </div>
                </div>
                <p className="text-gray-400 text-xs mt-2">
                  Connect your X account to enable notifications and show on your profile
                </p>
              </div>
            </div>

            {message && (
              <div className={`mt-4 p-3 rounded-xl ${
                message.includes('success')
                  ? 'bg-green-500/20 text-green-300 border border-green-500/30'
                  : 'bg-red-500/20 text-red-300 border border-red-500/30'
              }`}>
                {message}
              </div>
            )}
          </div>

          {/* Additional Settings Info */}
          <div className="mt-6 bg-white/5 backdrop-blur-lg rounded-2xl border border-white/10 p-6">
            <h3 className="text-lg font-semibold text-white mb-3 flex items-center">
              <span className="mr-2">ℹ️</span> About Social Connections
            </h3>
            <div className="space-y-2 text-gray-300 text-sm">
              <p>• Linking your Discord and X accounts helps other penguins find and connect with you</p>
              <p>• Your social handles will be displayed on your public profile</p>
              <p>• You can update or remove these connections at any time</p>
              <p>• We never post on your behalf or access your social accounts directly</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}