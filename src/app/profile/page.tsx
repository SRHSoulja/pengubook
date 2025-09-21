'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/providers/AuthProvider'
import { useTheme } from '@/providers/ThemeProvider'
import PenguinLoadingScreen from '@/components/PenguinLoadingScreen'
import Navbar from '@/components/Navbar'

export default function ProfilePage() {
  const { user, loading: authLoading, isAuthenticated, refetchUser } = useAuth()
  const { currentTheme } = useTheme()
  const [editing, setEditing] = useState(false)
  const [formData, setFormData] = useState({
    displayName: '',
    username: '',
    bio: '',
    interests: ''
  })

  useEffect(() => {
    if (user) {
      setFormData({
        displayName: user.displayName || '',
        username: user.username || '',
        bio: user.bio || '',
        interests: user.profile?.interests
          ? (Array.isArray(JSON.parse(user.profile.interests))
              ? JSON.parse(user.profile.interests).join(', ')
              : '')
          : ''
      })
    }
  }, [user])

  const handleSave = async () => {
    if (!user) return

    try {
      const response = await fetch('/api/users/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          walletAddress: user.walletAddress,
          displayName: formData.displayName,
          username: formData.username,
          bio: formData.bio,
          interests: formData.interests.split(',').map(i => i.trim()).filter(Boolean)
        })
      })

      if (response.ok) {
        const data = await response.json()
        console.log('Profile updated successfully:', data)
        refetchUser()
        setEditing(false)
      } else {
        const errorData = await response.json()
        console.error('Failed to update profile:', errorData)
        alert('Failed to update profile: ' + (errorData.error || 'Unknown error'))
      }
    } catch (error) {
      console.error('Failed to update profile:', error)
    }
  }

  // Show loading screen while checking auth
  if (authLoading) {
    return <PenguinLoadingScreen />
  }

  // Show access denied if not authenticated
  if (!isAuthenticated || !user) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{
          background: `linear-gradient(135deg, ${currentTheme.colors.from}, ${currentTheme.colors.via}, ${currentTheme.colors.to})`
        }}
      >
        <div className="text-center text-white">
          <div className="text-6xl mb-4">🐧</div>
          <h1 className="text-2xl font-bold mb-4">Profile Access Required</h1>
          <p className="text-gray-300 mb-6">Please connect your wallet to view your profile</p>
          <a href="/" className="bg-cyan-500 text-white px-6 py-3 rounded-xl hover:bg-cyan-600 transition-colors">
            Back to Home
          </a>
        </div>
      </div>
    )
  }

  return (
    <div
      className="min-h-screen"
      style={{
        background: `linear-gradient(135deg, ${currentTheme.colors.from}, ${currentTheme.colors.via}, ${currentTheme.colors.to})`
      }}
    >
      <Navbar />

      <div className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto">
          <div className="bg-white/10 backdrop-blur-lg rounded-2xl border border-white/20 shadow-2xl p-8">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center">
                <span className="text-4xl mr-3">🐧</span>
                <h1 className="text-3xl font-bold text-white">My Penguin Profile</h1>
              </div>
              <button
                onClick={() => setEditing(!editing)}
                className="bg-gradient-to-r from-cyan-500 to-blue-500 text-white px-6 py-2 rounded-xl hover:from-cyan-600 hover:to-blue-600 transition-all transform hover:scale-105 shadow-lg"
              >
                {editing ? '❄️ Cancel' : '✏️ Edit Profile'}
              </button>
            </div>

            {editing ? (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-white mb-1">
                    Display Name
                  </label>
                  <input
                    type="text"
                    value={formData.displayName}
                    onChange={(e) => setFormData({...formData, displayName: e.target.value})}
                    className="w-full border border-gray-300 rounded px-3 py-2"
                    placeholder="Your display name"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-white mb-1">
                    Username
                  </label>
                  <input
                    type="text"
                    value={formData.username}
                    onChange={(e) => setFormData({...formData, username: e.target.value})}
                    className="w-full border border-gray-300 rounded px-3 py-2"
                    placeholder="Your unique username"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-white mb-1">
                    Bio
                  </label>
                  <textarea
                    value={formData.bio}
                    onChange={(e) => setFormData({...formData, bio: e.target.value})}
                    rows={3}
                    className="w-full border border-gray-300 rounded px-3 py-2"
                    placeholder="Tell us about yourself..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-white mb-1">
                    Interests (comma separated)
                  </label>
                  <input
                    type="text"
                    value={formData.interests}
                    onChange={(e) => setFormData({...formData, interests: e.target.value})}
                    className="w-full border border-gray-300 rounded px-3 py-2"
                    placeholder="DeFi, NFTs, Gaming..."
                  />
                </div>

                {/* Social accounts are read-only - managed via OAuth linking */}
                {(user.discordName || user.twitterHandle) && (
                  <div className="bg-black/20 p-4 rounded-lg border border-white/10">
                    <h4 className="text-sm font-medium text-gray-300 mb-2">Linked Social Accounts</h4>
                    <p className="text-xs text-gray-400 mb-3">These are managed via the Social Account Linking in Settings</p>

                    {user.discordName && (
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm text-gray-300">Discord:</span>
                        <span className="text-sm text-white bg-black/30 px-2 py-1 rounded">{user.discordName}</span>
                      </div>
                    )}

                    {user.twitterHandle && (
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-300">X (Twitter):</span>
                        <span className="text-sm text-white bg-black/30 px-2 py-1 rounded">{user.twitterHandle}</span>
                      </div>
                    )}
                  </div>
                )}

                <button
                  onClick={handleSave}
                  className="w-full bg-green-600 text-white py-2 rounded hover:bg-green-700"
                >
                  Save Changes
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <h2 className="text-xl font-bold text-white">{user.displayName}</h2>
                  <p className="text-cyan-300">@{user.username}</p>
                  <div className="mt-2 p-2 bg-black/30 rounded-lg">
                    <p className="text-xs text-gray-400 mb-1">Wallet Address:</p>
                    <p className="text-sm text-cyan-400 font-mono break-all">{user.walletAddress}</p>
                  </div>
                </div>

                {user.bio && (
                  <div>
                    <h3 className="font-semibold text-gray-300 mb-1">Bio</h3>
                    <p className="text-gray-200">{user.bio}</p>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-black/30 p-4 rounded-xl border border-white/10">
                    <h3 className="font-medium text-gray-300">Tips Sent</h3>
                    <p className="text-2xl font-bold text-cyan-400">{user.profile?.tipCount || 0}</p>
                  </div>
                  <div className="bg-black/30 p-4 rounded-xl border border-white/10">
                    <h3 className="font-medium text-gray-300">Tips Received</h3>
                    <p className="text-2xl font-bold text-green-400">{user.profile?.tipCount || 0}</p>
                  </div>
                </div>

                {user.profile?.interests && JSON.parse(user.profile.interests || '[]').length > 0 && (
                  <div>
                    <h3 className="font-semibold text-gray-300 mb-2">Interests</h3>
                    <div className="flex flex-wrap gap-2">
                      {JSON.parse(user.profile.interests || '[]').map((interest: string, index: number) => (
                        <span
                          key={index}
                          className="bg-purple-500/30 text-purple-200 px-3 py-1 rounded-full text-sm"
                        >
                          {interest}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {(user.discordName || user.twitterHandle) && (
                  <div>
                    <h3 className="font-semibold text-gray-300 mb-2">Social Links</h3>
                    <div className="space-y-2">
                      {user.discordName && (
                        <div className="flex items-center space-x-2">
                          <span className="text-sm text-gray-400">Discord:</span>
                          <span className="text-white">{user.discordName}</span>
                        </div>
                      )}
                      {user.twitterHandle && (
                        <div className="flex items-center space-x-2">
                          <span className="text-sm text-gray-400">X (Twitter):</span>
                          <span className="text-white">{user.twitterHandle}</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}