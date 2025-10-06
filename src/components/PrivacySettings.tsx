'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/providers/AuthProvider'
import { useToast } from '@/components/ui/Toast'

interface PrivacySettings {
  allowDirectMessages: boolean
  dmPrivacyLevel: 'ALL' | 'FRIENDS_ONLY' | 'NONE'
  showReadReceipts: boolean
  showTypingIndicator: boolean
  showOnlineStatus: boolean
  isPrivate: boolean
  showActivity: boolean
  showTips: boolean
  showDiscord: boolean
  showTwitter: boolean
}

interface Community {
  id: string
  displayName: string
  avatar?: string
  isOfficial: boolean
  membersCount: number
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
  const { addToast } = useToast()
  const [settings, setSettings] = useState<PrivacySettings>({
    allowDirectMessages: true,
    dmPrivacyLevel: 'ALL',
    showReadReceipts: true,
    showTypingIndicator: true,
    showOnlineStatus: true,
    isPrivate: false,
    showActivity: true,
    showTips: true,
    showDiscord: true,
    showTwitter: true
  })
  const [blockedUsers, setBlockedUsers] = useState<BlockedUser[]>([])
  const [communities, setCommunities] = useState<Community[]>([])
  const [featuredCommunityId, setFeaturedCommunityId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (user?.walletAddress) {
      fetchPrivacySettings()
      fetchBlockedUsers()
      fetchUserCommunities()
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
        setFeaturedCommunityId(data.data.featuredCommunityId || null)
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

  const fetchUserCommunities = async () => {
    try {
      const response = await fetch('/api/communities/my-communities', {
        headers: {
          'x-wallet-address': user?.walletAddress || ''
        }
      })

      if (response.ok) {
        const data = await response.json()
        // Filter to only show ACTIVE memberships
        const activeCommunities = data.communities
          .filter((membership: any) => membership.status === 'ACTIVE')
          .map((membership: any) => membership.community)
        setCommunities(activeCommunities)
      }
    } catch (error) {
      console.error('Error fetching user communities:', error)
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
      addToast('Failed to update privacy settings', 'error')
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
      addToast('Failed to unblock user', 'error')
    }
  }

  const updateFeaturedCommunity = async (communityId: string | null) => {
    setSaving(true)
    try {
      const response = await fetch('/api/users/featured-community', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': user?.id || ''
        },
        body: JSON.stringify({ communityId })
      })

      if (response.ok) {
        const data = await response.json()
        setFeaturedCommunityId(data.featuredCommunityId)
      } else {
        throw new Error('Failed to update featured community')
      }
    } catch (error) {
      console.error('Error updating featured community:', error)
      addToast('Failed to update featured community', 'error')
    } finally {
      setSaving(false)
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
              <p className="text-gray-300 text-sm">Allow others to send you messages</p>
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
                    <p className="text-gray-300 text-sm">
                      {level === 'ALL' && 'Anyone can send you messages'}
                      {level === 'FRIENDS_ONLY' && 'Only accepted friends can message you'}
                      {level === 'NONE' && 'No one can send you messages'}
                    </p>
                  </div>
                </label>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between p-3 bg-black/20 rounded-lg">
            <div>
              <h3 className="text-white font-medium">Show Read Receipts</h3>
              <p className="text-gray-300 text-sm">Let others know when you've read their messages</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={settings.showReadReceipts}
                onChange={(e) => handleToggle('showReadReceipts', e.target.checked)}
                disabled={saving}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-cyan-500"></div>
            </label>
          </div>

          <div className="flex items-center justify-between p-3 bg-black/20 rounded-lg">
            <div>
              <h3 className="text-white font-medium">Show Typing Indicator</h3>
              <p className="text-gray-300 text-sm">Let others see when you're typing a message</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={settings.showTypingIndicator}
                onChange={(e) => handleToggle('showTypingIndicator', e.target.checked)}
                disabled={saving}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-cyan-500"></div>
            </label>
          </div>

          <div className="flex items-center justify-between p-3 bg-black/20 rounded-lg">
            <div>
              <h3 className="text-white font-medium">Show Online Status</h3>
              <p className="text-gray-300 text-sm">Let others see when you're online</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={settings.showOnlineStatus}
                onChange={(e) => handleToggle('showOnlineStatus', e.target.checked)}
                disabled={saving}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-cyan-500"></div>
            </label>
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
              <p className="text-gray-300 text-sm">Only friends can see your full profile</p>
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
              <p className="text-gray-300 text-sm">Let others see your recent activity</p>
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
              <p className="text-gray-300 text-sm">Display tips received on your profile</p>
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
            <div className="flex-1">
              <h3 className="text-white font-medium">Show Discord</h3>
              <p className="text-gray-300 text-sm">Display linked Discord account on your profile</p>
              <p className="text-green-400 text-xs font-semibold mt-1">⭐ LEAVE UNHIDDEN SO YOUR FRIENDS CAN FIND YOU BY VERIFIED USERNAME</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer ml-4">
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
            <div className="flex-1">
              <h3 className="text-white font-medium">Show X/Twitter</h3>
              <p className="text-gray-300 text-sm">Display linked X/Twitter account on your profile</p>
              <p className="text-green-400 text-xs font-semibold mt-1">⭐ LEAVE UNHIDDEN SO YOUR FRIENDS CAN FIND YOU BY VERIFIED USERNAME</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer ml-4">
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

      {/* Featured Community */}
      <div className="bg-white/10 backdrop-blur-lg rounded-2xl border border-white/20 p-6">
        <h2 className="text-xl font-bold text-white mb-4 flex items-center">
          <span className="mr-2">⭐</span> Featured Community
        </h2>

        <p className="text-gray-300 text-sm mb-4">
          Choose one of your communities to showcase on your profile
        </p>

        {communities.length === 0 ? (
          <p className="text-gray-300 text-center py-8">
            You haven't joined any communities yet.
          </p>
        ) : (
          <div className="space-y-3">
            {/* None option */}
            <label className="flex items-center p-3 bg-black/20 rounded-lg cursor-pointer hover:bg-black/30 transition-colors">
              <input
                type="radio"
                name="featuredCommunity"
                checked={featuredCommunityId === null}
                onChange={() => updateFeaturedCommunity(null)}
                disabled={saving}
                className="mr-3 text-purple-500"
              />
              <div>
                <span className="text-white font-medium">None</span>
                <p className="text-gray-300 text-sm">Don't feature any community</p>
              </div>
            </label>

            {/* Community options */}
            {communities.map((community) => (
              <label
                key={community.id}
                className="flex items-center p-3 bg-black/20 rounded-lg cursor-pointer hover:bg-black/30 transition-colors"
              >
                <input
                  type="radio"
                  name="featuredCommunity"
                  checked={featuredCommunityId === community.id}
                  onChange={() => updateFeaturedCommunity(community.id)}
                  disabled={saving}
                  className="mr-3 text-purple-500"
                />
                <div className="w-10 h-10 bg-gradient-to-br from-purple-400 to-pink-500 rounded-lg flex items-center justify-center mr-3 flex-shrink-0">
                  {community.avatar ? (
                    <img
                      src={community.avatar}
                      alt={community.displayName}
                      className="w-full h-full rounded-lg object-cover"
                    />
                  ) : (
                    <span className="text-white font-bold text-sm">
                      {community.displayName.charAt(0)}
                    </span>
                  )}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-white font-medium">
                      {community.displayName}
                    </span>
                    {community.isOfficial && (
                      <span className="text-yellow-400 text-xs">✨</span>
                    )}
                  </div>
                  <p className="text-gray-300 text-sm">
                    {community.membersCount.toLocaleString()} members
                  </p>
                </div>
              </label>
            ))}
          </div>
        )}
      </div>

      {/* Blocked Users */}
      <div className="bg-white/10 backdrop-blur-lg rounded-2xl border border-white/20 p-6">
        <h2 className="text-xl font-bold text-white mb-4 flex items-center">
          <span className="mr-2">🚫</span> Blocked Users
        </h2>

        {blockedUsers.length === 0 ? (
          <p className="text-gray-300 text-center py-8">
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
                    <p className="text-gray-300 text-sm">
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