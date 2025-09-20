'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/providers/AuthProvider'
import Navbar from '@/components/Navbar'
import PenguinLoadingScreen from '@/components/PenguinLoadingScreen'
import Link from 'next/link'

interface UserSuggestion {
  user: {
    id: string
    username: string
    displayName: string
    avatar?: string
    level: number
    profile: {
      profileVerified: boolean
      followersCount: number
      postsCount: number
    }
  }
  reason: string
  mutualConnections: number
  commonInterests: string[]
  score: number
}

interface CommunityRecommendation {
  community: {
    id: string
    name: string
    displayName: string
    description: string
    avatar?: string
    banner?: string
    category: string
    tags: string[]
    isOfficial: boolean
    membersCount: number
    postsCount: number
  }
  reason: string
  matchingInterests: string[]
  memberFriends: any[]
  score: number
}

export default function DiscoverPage() {
  const { user, isAuthenticated, loading: authLoading } = useAuth()
  const [suggestedUsers, setSuggestedUsers] = useState<UserSuggestion[]>([])
  const [suggestedCommunities, setSuggestedCommunities] = useState<CommunityRecommendation[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'users' | 'communities'>('users')

  useEffect(() => {
    if (isAuthenticated) {
      fetchDiscoverData()
    }
  }, [isAuthenticated])


  const fetchDiscoverData = async () => {
    if (!user?.id) return

    try {
      setLoading(true)
      const response = await fetch(`/api/social/discover?userId=${user.id}&type=all&limit=10`)
      const data = await response.json()

      if (response.ok) {
        setSuggestedUsers(data.data.suggestedUsers || [])
        setSuggestedCommunities(data.data.suggestedCommunities || [])
      }
    } catch (error) {
      console.error('Failed to fetch discover data:', error)
    } finally {
      setLoading(false)
    }
  }

  const followUser = async (userId: string) => {
    if (!user) return

    try {
      const response = await fetch('/api/social/follow', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          followerId: user.id,
          followingId: userId
        })
      })

      const data = await response.json()
      if (response.ok) {
        // Update the user in suggestions to show followed state
        setSuggestedUsers(prev => prev.filter(suggestion => suggestion.user.id !== userId))
      } else {
        alert(data.error || 'Failed to follow user')
      }
    } catch (error) {
      console.error('Error following user:', error)
      alert('Failed to follow user')
    }
  }

  const sendFriendRequest = async (userId: string) => {
    if (!user) return

    try {
      const response = await fetch('/api/social/friends', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          initiatorId: user.id,
          receiverId: userId
        })
      })

      const data = await response.json()
      if (response.ok) {
        alert(data.message)
      } else {
        alert(data.error || 'Failed to send friend request')
      }
    } catch (error) {
      console.error('Error sending friend request:', error)
      alert('Failed to send friend request')
    }
  }

  const joinCommunity = async (communityId: string) => {
    if (!user) return

    try {
      const response = await fetch(`/api/communities/${communityId}/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id })
      })

      const data = await response.json()
      if (response.ok) {
        // Remove community from suggestions
        setSuggestedCommunities(prev => prev.filter(suggestion => suggestion.community.id !== communityId))
        alert(data.message)
      } else {
        alert(data.error || 'Failed to join community')
      }
    } catch (error) {
      console.error('Error joining community:', error)
      alert('Failed to join community')
    }
  }

  if (authLoading) {
    return <PenguinLoadingScreen />
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-900 via-purple-900 to-indigo-900 flex items-center justify-center">
        <div className="text-center text-white">
          <div className="text-6xl mb-4">🐧</div>
          <h1 className="text-2xl font-bold mb-4">Access Denied</h1>
          <p className="text-gray-300 mb-6">You need to connect your wallet to discover new penguins!</p>
          <Link href="/" className="bg-cyan-500 text-white px-6 py-3 rounded-xl hover:bg-cyan-600 transition-colors">
            Back to Home
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-purple-900 to-indigo-900">
      <Navbar />

      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-white mb-4 flex items-center justify-center">
              <span className="mr-3">🧭</span>
              Discover Penguins
            </h1>
            <p className="text-xl text-gray-300">
              Find new friends and communities to waddle with!
            </p>
          </div>

          {/* Tab Navigation */}
          <div className="flex bg-white/10 backdrop-blur-lg rounded-2xl border border-white/20 p-2 mb-8">
            <button
              onClick={() => setActiveTab('users')}
              className={`flex-1 py-3 px-4 rounded-xl font-semibold transition-all ${
                activeTab === 'users'
                  ? 'bg-cyan-500 text-white shadow-lg'
                  : 'text-gray-300 hover:bg-white/10'
              }`}
            >
              🐧 Suggested Pengus
            </button>
            <button
              onClick={() => setActiveTab('communities')}
              className={`flex-1 py-3 px-4 rounded-xl font-semibold transition-all ${
                activeTab === 'communities'
                  ? 'bg-purple-500 text-white shadow-lg'
                  : 'text-gray-300 hover:bg-white/10'
              }`}
            >
              🏔️ Recommended Communities
            </button>
          </div>

          {/* Content */}
          {loading ? (
            <div className="text-center text-white py-12">
              <div className="text-4xl mb-4">🔄</div>
              <p>Discovering amazing penguins for you...</p>
            </div>
          ) : (
            <div className="space-y-6">
              {activeTab === 'users' && (
                <>
                  {suggestedUsers.length === 0 ? (
                    <div className="text-center text-white py-12">
                      <div className="text-4xl mb-4">🔍</div>
                      <p className="text-xl">No penguin suggestions available</p>
                      <p className="text-gray-300">Follow more pengus and join communities to get better recommendations!</p>
                    </div>
                  ) : (
                    suggestedUsers.map((suggestion) => (
                      <div
                        key={suggestion.user.id}
                        className="bg-white/10 backdrop-blur-lg rounded-2xl border border-white/20 p-6 hover:bg-white/15 transition-all"
                      >
                        <div className="flex items-start gap-4">
                          {/* Avatar */}
                          <div className="w-16 h-16 bg-gradient-to-br from-cyan-400 to-blue-500 rounded-xl flex items-center justify-center text-2xl font-bold text-white">
                            {suggestion.user.avatar ? (
                              <img
                                src={suggestion.user.avatar}
                                alt={suggestion.user.displayName}
                                className="w-full h-full rounded-xl object-cover"
                              />
                            ) : (
                              suggestion.user.displayName.charAt(0)
                            )}
                          </div>

                          {/* User Info */}
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <h3 className="text-lg font-bold text-white">
                                {suggestion.user.displayName}
                              </h3>
                              {suggestion.user.profile.profileVerified && (
                                <span className="text-blue-400">✓</span>
                              )}
                              <span className="px-2 py-1 bg-yellow-500/20 text-yellow-300 rounded-full text-xs">
                                Level {suggestion.user.level}
                              </span>
                            </div>

                            <p className="text-gray-300 text-sm mb-2">@{suggestion.user.username}</p>

                            <p className="text-cyan-300 text-sm mb-3">
                              {suggestion.reason}
                            </p>

                            <div className="flex items-center gap-4 text-xs text-gray-400 mb-4">
                              <span>👥 {suggestion.user.profile.followersCount} followers</span>
                              <span>📝 {suggestion.user.profile.postsCount} posts</span>
                              {suggestion.mutualConnections > 0 && (
                                <span>🤝 {suggestion.mutualConnections} mutual</span>
                              )}
                            </div>

                            {suggestion.commonInterests.length > 0 && (
                              <div className="flex flex-wrap gap-1 mb-4">
                                {suggestion.commonInterests.slice(0, 3).map((interest, index) => (
                                  <span
                                    key={index}
                                    className="px-2 py-1 bg-purple-500/20 text-purple-200 rounded-full text-xs"
                                  >
                                    {interest}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>

                          {/* Actions */}
                          <div className="flex flex-col gap-2">
                            <Link
                              href={`/profile/${suggestion.user.id}`}
                              className="bg-white/20 text-white px-4 py-2 rounded-lg hover:bg-white/30 transition-colors text-center text-sm"
                            >
                              View Profile
                            </Link>
                            <button
                              onClick={() => followUser(suggestion.user.id)}
                              className="bg-cyan-500 text-white px-4 py-2 rounded-lg hover:bg-cyan-600 transition-colors text-sm"
                            >
                              Follow
                            </button>
                            <button
                              onClick={() => sendFriendRequest(suggestion.user.id)}
                              className="bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600 transition-colors text-sm"
                            >
                              Add Friend
                            </button>
                            <Link
                              href={`/messages/new?userId=${suggestion.user.id}`}
                              className="bg-purple-500 text-white px-4 py-2 rounded-lg hover:bg-purple-600 transition-colors text-sm text-center"
                            >
                              Message
                            </Link>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </>
              )}

              {activeTab === 'communities' && (
                <>
                  {suggestedCommunities.length === 0 ? (
                    <div className="text-center text-white py-12">
                      <div className="text-4xl mb-4">🔍</div>
                      <p className="text-xl">No community recommendations available</p>
                      <p className="text-gray-300">Update your interests in settings to get better recommendations!</p>
                    </div>
                  ) : (
                    suggestedCommunities.map((recommendation) => (
                      <div
                        key={recommendation.community.id}
                        className="bg-white/10 backdrop-blur-lg rounded-2xl border border-white/20 p-6 hover:bg-white/15 transition-all"
                      >
                        <div className="flex items-start gap-4">
                          {/* Community Avatar */}
                          <div className="w-16 h-16 bg-gradient-to-br from-purple-400 to-pink-500 rounded-xl flex items-center justify-center text-2xl font-bold text-white">
                            {recommendation.community.avatar ? (
                              <img
                                src={recommendation.community.avatar}
                                alt={recommendation.community.displayName}
                                className="w-full h-full rounded-xl object-cover"
                              />
                            ) : (
                              recommendation.community.displayName.charAt(0)
                            )}
                          </div>

                          {/* Community Info */}
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <h3 className="text-lg font-bold text-white">
                                {recommendation.community.displayName}
                              </h3>
                              {recommendation.community.isOfficial && (
                                <span className="text-yellow-400">✨</span>
                              )}
                            </div>

                            <p className="text-gray-300 text-sm mb-2">@{recommendation.community.name}</p>

                            <p className="text-purple-300 text-sm mb-3">
                              {recommendation.reason}
                            </p>

                            <p className="text-gray-300 text-sm mb-3 line-clamp-2">
                              {recommendation.community.description}
                            </p>

                            <div className="flex items-center gap-4 text-xs text-gray-400 mb-3">
                              <span>👥 {recommendation.community.membersCount} members</span>
                              <span>📝 {recommendation.community.postsCount} posts</span>
                            </div>

                            <div className="flex flex-wrap gap-2">
                              <span className="px-2 py-1 bg-purple-500/20 text-purple-200 rounded-full text-xs">
                                {recommendation.community.category}
                              </span>
                              {recommendation.matchingInterests.slice(0, 2).map((interest, index) => (
                                <span
                                  key={index}
                                  className="px-2 py-1 bg-green-500/20 text-green-200 rounded-full text-xs"
                                >
                                  {interest}
                                </span>
                              ))}
                            </div>
                          </div>

                          {/* Actions */}
                          <div className="flex flex-col gap-2">
                            <Link
                              href={`/communities/${recommendation.community.id}`}
                              className="bg-white/20 text-white px-4 py-2 rounded-lg hover:bg-white/30 transition-colors text-center text-sm"
                            >
                              View
                            </Link>
                            <button
                              onClick={() => joinCommunity(recommendation.community.id)}
                              className="bg-purple-500 text-white px-4 py-2 rounded-lg hover:bg-purple-600 transition-colors text-sm"
                            >
                              Join
                            </button>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}