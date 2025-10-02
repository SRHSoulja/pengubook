'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/providers/AuthProvider'

interface PrivacySettings {
  allowDirectMessages: boolean
  dmPrivacyLevel: 'ALL' | 'FRIENDS_ONLY' | 'NONE'
  isPrivate: boolean
  showActivity: boolean
  showTips: boolean
  showDiscord: boolean
  showTwitter: boolean
}

interface BlockedUser {
  id: string
  user: {
    id: string
    username: string
    displayName: string
    avatar?: string
  }
  blockedAt: string
}

export default function PrivacySettings() {
  const { user } = useAuth()
  const [settings, setSettings] = useState<PrivacySettings>({
    allowDirectMessages: true,
    dmPrivacyLevel: 'ALL',
    isPrivate: false,
    showActivity: true,
    showTips: true,
    showDiscord: true,
    showTwitter: true
  })
  const [blockedUsers, setBlockedUsers] = useState<BlockedUser[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (user?.walletAddress) {
      fetchPrivacySettings()
      fetchBlockedUsers()
    }
  }, [user])

  const fetchPrivacySettings = async () => {
    try {
      const response = await fetch('/api/users/privacy', {
        headers: {
          'x-wallet-address': user?.walletAddress || ''
        }
      })

      if (response.ok) {
        const data = await response.json()
        setSettings(data.data)
      }
    } catch (error) {
      console.error('Error fetching privacy settings:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchBlockedUsers = async () => {
    try {
      const response = await fetch('/api/users/block', {
        headers: {
          'x-wallet-address': user?.walletAddress || ''
        }
      })

      if (response.ok) {
        const data = await response.json()
        setBlockedUsers(data.data)
      }
    } catch (error) {
      console.error('Error fetching blocked users:', error)
    }
  }

  const updatePrivacySettings = async (newSettings: Partial<PrivacySettings>) => {
    setSaving(true)
    try {
      const response = await fetch('/api/users/privacy', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-wallet-address': user?.walletAddress || ''
        },
        body: JSON.stringify(newSettings)
      })

      if (response.ok) {
        const data = await response.json()
        setSettings(data.data)
      } else {
        throw new Error('Failed to update settings')
      }
    } catch (error) {
      console.error('Error updating privacy settings:', error)
      alert('Failed to update privacy settings')
    } finally {
      setSaving(false)
    }
  }

  const unblockUser = async (userId: string) => {
    try {
      const response = await fetch(`/api/users/block?userId=${userId}`, {
        method: 'DELETE',
        headers: {
          'x-wallet-address': user?.walletAddress || ''
        }
      })

      if (response.ok) {
        setBlockedUsers(prev => prev.filter(block => block.user.id !== userId))
      } else {
        throw new Error('Failed to unblock user')
      }
    } catch (error) {
      console.error('Error unblocking user:', error)
      alert('Failed to unblock user')
    }
  }

  const handleToggle = (key: keyof PrivacySettings, value: any) => {
    const newSettings = { [key]: value }
    setSettings(prev => ({ ...prev, ...newSettings }))
    updatePrivacySettings(newSettings)
  }

  if (loading) {
    return (
      <div className="bg-white/10 backdrop-blur-lg rounded-2xl border border-white/20 p-6">
        <div className="text-center py-8">
          <div className="w-8 h-8 border-4 border-white border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-300">Loading privacy settings...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Message Privacy Settings */}
      <div className="bg-white/10 backdrop-blur-lg rounded-2xl border border-white/20 p-6">
        <h2 className="text-xl font-bold text-white mb-4 flex items-center">
          <span className="mr-2">💬</span> Message Privacy
        </h2>

        <div className="space-y-4">
          <div className="flex items-center justify-between p-3 bg-black/20 rounded-lg">
            <div>
              <h3 className="text-white font-medium">Allow Direct Messages</h3>
              <p className="text-gray-400 text-sm">Allow others to send you messages</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={settings.allowDirectMessages}
                onChange={(e) => handleToggle('allowDirectMessages', e.target.checked)}
                disabled={saving}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-cyan-500"></div>
            </label>
          </div>

          <div className="p-3 bg-black/20 rounded-lg">
            <h3 className="text-white font-medium mb-2">Who can message you</h3>
            <div className="space-y-2">
              {['ALL', 'FRIENDS_ONLY', 'NONE'].map((level) => (
                <label key={level} className="flex items-center cursor-pointer">
                  <input
                    type="radio"
                    name="dmPrivacyLevel"
                    value={level}
                    checked={settings.dmPrivacyLevel === level}
                    onChange={(e) => handleToggle('dmPrivacyLevel', e.target.value)}
                    disabled={saving || !settings.allowDirectMessages}
                    className="mr-3 text-cyan-500"
                  />
                  <div>
                    <span className="text-white">
                      {level === 'ALL' && 'Everyone'}
                      {level === 'FRIENDS_ONLY' && 'Friends Only'}
                      {level === 'NONE' && 'No One'}
                    </span>
                    <p className="text-gray-400 text-sm">
                      {level === 'ALL' && 'Anyone can send you messages'}
                      {level === 'FRIENDS_ONLY' && 'Only accepted friends can message you'}
                      {level === 'NONE' && 'No one can send you messages'}
                    </p>
                  </div>
                </label>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Profile Privacy Settings */}
      <div className="bg-white/10 backdrop-blur-lg rounded-2xl border border-white/20 p-6">
        <h2 className="text-xl font-bold text-white mb-4 flex items-center">
          <span className="mr-2"><img src="https://gmgnrepeat.com/icons/penguinsilhouette1.png" alt="Profile" className="w-5 h-5 inline-block" /></span> Profile Privacy
        </h2>

        <div className="space-y-4">
          <div className="flex items-center justify-between p-3 bg-black/20 rounded-lg">
            <div>
              <h3 className="text-white font-medium">Private Profile</h3>
              <p className="text-gray-400 text-sm">Only friends can see your full profile</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={settings.isPrivate}
                onChange={(e) => handleToggle('isPrivate', e.target.checked)}
                disabled={saving}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-cyan-500"></div>
            </label>
          </div>

          <div className="flex items-center justify-between p-3 bg-black/20 rounded-lg">
            <div>
              <h3 className="text-white font-medium">Show Activity</h3>
              <p className="text-gray-400 text-sm">Let others see your recent activity</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={settings.showActivity}
                onChange={(e) => handleToggle('showActivity', e.target.checked)}
                disabled={saving}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-cyan-500"></div>
            </label>
          </div>

          <div className="flex items-center justify-between p-3 bg-black/20 rounded-lg">
            <div>
              <h3 className="text-white font-medium">Show Tips</h3>
              <p className="text-gray-400 text-sm">Display tips received on your profile</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={settings.showTips}
                onChange={(e) => handleToggle('showTips', e.target.checked)}
                disabled={saving}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-cyan-500"></div>
            </label>
          </div>

          <div className="flex items-center justify-between p-3 bg-black/20 rounded-lg">
            <div>
              <h3 className="text-white font-medium">Show Discord</h3>
              <p className="text-gray-400 text-sm">Display linked Discord account on your profile</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={settings.showDiscord}
                onChange={(e) => handleToggle('showDiscord', e.target.checked)}
                disabled={saving}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-cyan-500"></div>
            </label>
          </div>

          <div className="flex items-center justify-between p-3 bg-black/20 rounded-lg">
            <div>
              <h3 className="text-white font-medium">Show X/Twitter</h3>
              <p className="text-gray-400 text-sm">Display linked X/Twitter account on your profile</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={settings.showTwitter}
                onChange={(e) => handleToggle('showTwitter', e.target.checked)}
                disabled={saving}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-cyan-500"></div>
            </label>
          </div>
        </div>
      </div>

      {/* Blocked Users */}
      <div className="bg-white/10 backdrop-blur-lg rounded-2xl border border-white/20 p-6">
        <h2 className="text-xl font-bold text-white mb-4 flex items-center">
          <span className="mr-2">🚫</span> Blocked Users
        </h2>

        {blockedUsers.length === 0 ? (
          <p className="text-gray-400 text-center py-8">
            You haven't blocked any users yet.
          </p>
        ) : (
          <div className="space-y-3">
            {blockedUsers.map((block) => (
              <div key={block.id} className="flex items-center justify-between p-3 bg-black/20 rounded-lg">
                <div className="flex items-center">
                  <div className="w-10 h-10 bg-gradient-to-br from-cyan-400 to-blue-500 rounded-full flex items-center justify-center text-white font-bold mr-3">
                    {block.user.avatar ? (
                      <img
                        src={block.user.avatar}
                        alt={block.user.displayName || block.user.username}
                        className="w-10 h-10 rounded-full object-cover"
                      />
                    ) : (
                      (block.user.displayName || block.user.username || 'U').charAt(0).toUpperCase()
                    )}
                  </div>
                  <div>
                    <p className="text-white font-medium">
                      {block.user.displayName || block.user.username}
                    </p>
                    <p className="text-gray-400 text-sm">
                      Blocked {new Date(block.blockedAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => unblockUser(block.user.id)}
                  className="bg-red-500/20 hover:bg-red-500/30 text-red-300 px-3 py-1 rounded-lg text-sm transition-colors"
                >
                  Unblock
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {saving && (
        <div className="text-center text-cyan-400">
          <div className="w-6 h-6 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
          Saving changes...
        </div>
      )}
    </div>
  )
}