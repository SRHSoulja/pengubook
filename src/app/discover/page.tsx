'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/providers/AuthProvider'
import { useTheme } from '@/providers/ThemeProvider'
import Navbar from '@/components/Navbar'
import PenguinLoadingScreen from '@/components/PenguinLoadingScreen'
import UserActions from '@/components/UserActions'
import HashtagSearch from '@/components/HashtagSearch'
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
  const { currentTheme } = useTheme()
  const [suggestedUsers, setSuggestedUsers] = useState<UserSuggestion[]>([])
  const [suggestedCommunities, setSuggestedCommunities] = useState<CommunityRecommendation[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'users' | 'communities' | 'hashtags'>('users')

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

  if (!isAuthenticated && !loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-900 via-purple-900 to-indigo-900 flex items-center justify-center">
        <div className="text-center text-white">
          <div className="flex justify-center mb-4"><img src="https://gmgnrepeat.com/icons/pengubookicon1.png" alt="PeBloq" className="w-24 h-24" /></div>
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
    <div style={{ background: `linear-gradient(135deg, ${currentTheme.colors.from}, ${currentTheme.colors.via}, ${currentTheme.colors.to})` }} className="min-h-screen transition-all duration-500">
      <Navbar />

      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-white mb-4 flex items-center justify-center">
              <img src="https://gmgnrepeat.com/icons/penguindiscover1.png" alt="Discover" className="w-12 h-12 mr-3" />
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
              className={`flex-1 py-3 px-4 rounded-xl font-semibold transition-all flex items-center justify-center gap-2 ${
                activeTab === 'users'
                  ? 'bg-cyan-500 text-white shadow-lg'
                  : 'text-gray-300 hover:bg-white/10'
              }`}
            >
              <img src="https://gmgnrepeat.com/icons/pengubookicon1.png" alt="Suggested" className="w-5 h-5" />
              Suggested Pengus
            </button>
            <button
              onClick={() => setActiveTab('communities')}
              className={`flex-1 py-3 px-4 rounded-xl font-semibold transition-all flex items-center justify-center gap-2 ${
                activeTab === 'communities'
                  ? 'bg-purple-500 text-white shadow-lg'
                  : 'text-gray-300 hover:bg-white/10'
              }`}
            >
              <img src="https://gmgnrepeat.com/icons/penguincommunity1.png" alt="Communities" className="w-5 h-5" />
              Recommended Communities
            </button>
            <button
              onClick={() => setActiveTab('hashtags')}
              className={`flex-1 py-3 px-4 rounded-xl font-semibold transition-all ${
                activeTab === 'hashtags'
                  ? 'bg-orange-500 text-white shadow-lg'
                  : 'text-gray-300 hover:bg-white/10'
              }`}
            >
              🔥 Trending Tags
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
                      <img src="https://gmgnrepeat.com/icons/pengubookicon1.png" alt="Suggestions" className="w-24 h-24 mx-auto mb-4" />
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

                            <div className="flex items-center gap-4 text-xs text-gray-300 mb-4">
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
                            <UserActions
                              targetUserId={suggestion.user.id}
                              targetUser={suggestion.user}
                              compact={true}
                              showMessageButton={true}
                              showFriendButton={true}
                            />
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
                      <img src="https://gmgnrepeat.com/icons/penguincommunity1.png" alt="Communities" className="w-24 h-24 mx-auto mb-4" />
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

                            <div className="flex items-center gap-4 text-xs text-gray-300 mb-3">
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

              {activeTab === 'hashtags' && (
                <div className="space-y-6">
                  {/* Hashtag Search */}
                  <div className="bg-white/10 backdrop-blur-lg rounded-2xl border border-white/20 p-6">
                    <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
                      <span className="mr-2">🔍</span>
                      Search Hashtags
                    </h3>
                    <HashtagSearch
                      placeholder="Search for hashtags..."
                      onHashtagSelect={(hashtag) => {
                        window.location.href = `/feed/search?q=%23${hashtag}`
                      }}
                    />
                  </div>

                  {/* Redirect to Feed */}
                  <div className="bg-gradient-to-br from-orange-500/20 to-pink-500/20 backdrop-blur-lg rounded-2xl border border-orange-500/30 p-8 text-center">
                    <div className="text-5xl mb-4">🔥</div>
                    <h3 className="text-2xl font-bold text-white mb-3">Looking for Trending Tags?</h3>
                    <p className="text-gray-200 mb-6">
                      Check out our trending hashtags section in the Feed page!
                    </p>
                    <Link
                      href="/feed"
                      className="inline-block bg-gradient-to-r from-orange-500 to-pink-500 text-white px-8 py-3 rounded-xl hover:from-orange-600 hover:to-pink-600 transition-all font-semibold shadow-lg"
                    >
                      Go to Feed →
                    </Link>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}