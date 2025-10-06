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
  const [verifiedProjects, setVerifiedProjects] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'users' | 'communities' | 'projects' | 'hashtags'>('users')

  useEffect(() => {
    if (isAuthenticated) {
      fetchDiscoverData()
      fetchVerifiedProjects()
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

  const fetchVerifiedProjects = async () => {
    try {
      const response = await fetch('/api/projects/verified')
      const data = await response.json()

      if (response.ok) {
        setVerifiedProjects(data.projects || [])
      }
    } catch (error) {
      console.error('Failed to fetch verified projects:', error)
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

  if (!isAuthenticated && !authLoading) {
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

      <div className="container mx-auto px-4 py-4 md:py-8">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="text-center mb-4 md:mb-8">
            <h1 className="text-3xl md:text-4xl font-bold text-white mb-2 md:mb-4 flex items-center justify-center gap-2 md:gap-3">
              <img src="https://gmgnrepeat.com/icons/penguindiscover1.png" alt="Discover" className="w-10 h-10 md:w-12 md:h-12" />
              <span>Discover Penguins</span>
            </h1>
            <p className="text-base md:text-xl text-gray-300">
              Find new friends and communities to waddle with!
            </p>
          </div>

          {/* Tab Navigation */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-1.5 md:gap-2 bg-white/10 backdrop-blur-lg rounded-xl md:rounded-2xl border border-white/20 p-1.5 md:p-2 mb-4 md:mb-8">
            <button
              onClick={() => setActiveTab('users')}
              className={`py-2 px-2 md:py-3 md:px-4 rounded-lg md:rounded-xl font-semibold text-sm md:text-base transition-all flex flex-col md:flex-row items-center justify-center gap-1 md:gap-2 ${
                activeTab === 'users'
                  ? 'bg-cyan-500 text-white shadow-lg'
                  : 'text-gray-300 hover:bg-white/10'
              }`}
            >
              <img src="https://gmgnrepeat.com/icons/pengubookicon1.png" alt="Suggested" className="w-5 h-5" />
              <span>Pengus</span>
            </button>
            <button
              onClick={() => setActiveTab('communities')}
              className={`py-2 px-2 md:py-3 md:px-4 rounded-lg md:rounded-xl font-semibold text-sm md:text-base transition-all flex flex-col md:flex-row items-center justify-center gap-1 md:gap-2 ${
                activeTab === 'communities'
                  ? 'bg-purple-500 text-white shadow-lg'
                  : 'text-gray-300 hover:bg-white/10'
              }`}
            >
              <img src="https://gmgnrepeat.com/icons/penguincommunity1.png" alt="Communities" className="w-5 h-5" />
              <span>Groups</span>
            </button>
            <button
              onClick={() => setActiveTab('projects')}
              className={`py-2 px-2 md:py-3 md:px-4 rounded-lg md:rounded-xl font-semibold text-sm md:text-base transition-all flex flex-col md:flex-row items-center justify-center gap-1 md:gap-2 ${
                activeTab === 'projects'
                  ? 'bg-blue-500 text-white shadow-lg'
                  : 'text-gray-300 hover:bg-white/10'
              }`}
            >
              <span className="text-lg">🏢</span>
              <span>Projects</span>
            </button>
            <button
              onClick={() => setActiveTab('hashtags')}
              className={`py-2 px-2 md:py-3 md:px-4 rounded-lg md:rounded-xl font-semibold text-sm md:text-base transition-all flex flex-col md:flex-row items-center justify-center gap-1 md:gap-2 ${
                activeTab === 'hashtags'
                  ? 'bg-orange-500 text-white shadow-lg'
                  : 'text-gray-300 hover:bg-white/10'
              }`}
            >
              <span className="text-lg">🔥</span>
              <span>Tags</span>
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
                        className="bg-white/10 backdrop-blur-lg rounded-xl md:rounded-2xl border border-white/20 p-3 md:p-6 hover:bg-white/15 transition-all"
                      >
                        <div className="flex flex-col md:flex-row md:items-start gap-3 md:gap-4">
                          <div className="flex items-start gap-3 md:gap-4">
                            {/* Avatar */}
                            <div className="w-12 h-12 md:w-16 md:h-16 bg-gradient-to-br from-cyan-400 to-blue-500 rounded-xl flex items-center justify-center text-xl md:text-2xl font-bold text-white flex-shrink-0">
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
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center flex-wrap gap-1.5 md:gap-2 mb-1">
                                <h3 className="text-base md:text-lg font-bold text-white truncate">
                                  {suggestion.user.displayName}
                                </h3>
                                {suggestion.user.profile.profileVerified && (
                                  <span className="text-blue-400 flex-shrink-0">✓</span>
                                )}
                                <span className="px-1.5 md:px-2 py-0.5 md:py-1 bg-yellow-500/20 text-yellow-300 rounded-full text-xs flex-shrink-0">
                                  Level {suggestion.user.level}
                                </span>
                              </div>

                              <p className="text-gray-300 text-xs md:text-sm mb-1.5 md:mb-2 truncate">@{suggestion.user.username}</p>

                              <p className="text-cyan-300 text-xs md:text-sm mb-2 md:mb-3 line-clamp-2">
                                {suggestion.reason}
                              </p>

                              <div className="flex items-center flex-wrap gap-2 md:gap-4 text-xs text-gray-300 mb-2 md:mb-4">
                                <span>👥 {suggestion.user.profile.followersCount}</span>
                                <span>📝 {suggestion.user.profile.postsCount}</span>
                                {suggestion.mutualConnections > 0 && (
                                  <span>🤝 {suggestion.mutualConnections}</span>
                                )}
                              </div>

                              {suggestion.commonInterests.length > 0 && (
                                <div className="flex flex-wrap gap-1 mb-2 md:mb-4">
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
                          </div>

                          {/* Actions */}
                          <div className="flex md:flex-col flex-wrap gap-2 w-full md:w-auto md:flex-shrink-0">
                            <Link
                              href={`/profile/${suggestion.user.id}`}
                              className="flex-1 md:flex-none bg-white/20 text-white px-3 md:px-4 py-2 rounded-lg hover:bg-white/30 transition-colors text-center text-xs md:text-sm whitespace-nowrap"
                            >
                              View Profile
                            </Link>
                            <div className="flex-1 md:flex-none w-full md:w-auto">
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

              {activeTab === 'projects' && (
                <>
                  {verifiedProjects.length === 0 ? (
                    <div className="text-center text-white py-12">
                      <div className="text-6xl mb-4">🏢</div>
                      <p className="text-xl mb-2">No Verified Projects Yet</p>
                      <p className="text-gray-300 mb-4">Be the first to get your project verified!</p>
                      <a
                        href="/apply-project-verification"
                        className="inline-block bg-gradient-to-r from-cyan-500 to-blue-500 text-white px-6 py-3 rounded-xl hover:from-cyan-600 hover:to-blue-600 transition-colors font-semibold"
                      >
                        Apply for Verification
                      </a>
                    </div>
                  ) : (
                    <div className="grid gap-4">
                      {verifiedProjects.map((project: any) => (
                        <div
                          key={project.id}
                          className="bg-gradient-to-r from-blue-500/10 to-cyan-500/10 backdrop-blur-lg rounded-2xl border border-blue-500/30 p-6 hover:border-blue-500/50 transition-all"
                        >
                          <div className="flex items-start gap-4">
                            {/* Avatar */}
                            <Link href={`/profile/${project.id}`}>
                              {project.avatar ? (
                                <img
                                  src={project.avatar}
                                  alt={project.displayName}
                                  className="w-16 h-16 rounded-full object-cover border-2 border-blue-400"
                                />
                              ) : (
                                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-400 to-cyan-400 flex items-center justify-center text-2xl font-bold text-white border-2 border-blue-400">
                                  {project.displayName.charAt(0)}
                                </div>
                              )}
                            </Link>

                            {/* Project Info */}
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <Link href={`/profile/${project.id}`} className="text-xl font-bold text-white hover:text-cyan-400 transition-colors">
                                  {project.displayName}
                                </Link>
                                <span className="text-blue-400" title="Verified Project">✓</span>
                                {project.profile?.projectType && (
                                  <span className="bg-blue-500/30 text-blue-200 text-xs px-2 py-1 rounded">
                                    {project.profile.projectType.toUpperCase()}
                                  </span>
                                )}
                              </div>

                              <p className="text-sm text-gray-400 mb-1">@{project.username}</p>

                              {project.bio && (
                                <p className="text-gray-300 mb-3">{project.bio}</p>
                              )}

                              {/* Project Links */}
                              <div className="flex flex-wrap gap-3 mb-3">
                                {project.profile?.projectWebsite && (
                                  <a
                                    href={project.profile.projectWebsite}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-sm text-cyan-400 hover:text-cyan-300 flex items-center gap-1"
                                  >
                                    🌐 Website
                                  </a>
                                )}
                                {project.profile?.projectTwitter && (
                                  <a
                                    href={`https://twitter.com/${project.profile.projectTwitter.replace('@', '')}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-sm text-cyan-400 hover:text-cyan-300 flex items-center gap-1"
                                  >
                                    𝕏 Twitter
                                  </a>
                                )}
                                {project.profile?.projectDiscord && (
                                  <a
                                    href={project.profile.projectDiscord}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-sm text-cyan-400 hover:text-cyan-300 flex items-center gap-1"
                                  >
                                    💬 Discord
                                  </a>
                                )}
                                {project.profile?.contractAddress && (
                                  <span className="text-sm text-gray-400 font-mono">
                                    {project.profile.contractAddress.slice(0, 6)}...{project.profile.contractAddress.slice(-4)}
                                  </span>
                                )}
                              </div>

                              {/* Stats */}
                              <div className="flex gap-4 text-sm text-gray-400">
                                <span>{project.profile?.followersCount || 0} followers</span>
                                <span>{project.profile?.postsCount || 0} posts</span>
                              </div>
                            </div>

                            {/* Follow Button */}
                            <div className="flex-shrink-0">
                              <UserActions
                                targetUserId={project.id}
                                targetUser={{
                                  username: project.username,
                                  displayName: project.displayName
                                }}
                                showMessageButton={true}
                                showFriendButton={false}
                                showBlockButton={false}
                                compact={true}
                              />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
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