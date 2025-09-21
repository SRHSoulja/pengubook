'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/providers/AuthProvider'
import TipButton from '@/components/TipButton'
import FollowButton from '@/components/FollowButton'
import FriendButton from '@/components/FriendButton'
import Navbar from '@/components/Navbar'
import Link from 'next/link'

interface ProfilePageProps {
  params: { id: string }
}

interface UserProfile {
  id: string
  username: string
  displayName: string
  walletAddress: string
  bio: string | null
  avatar: string | null
  level: number
  xp: number
  isAdmin: boolean
  profile: {
    tipCount: number
    totalTipsReceived: number
    followersCount: number
    followingCount: number
    postsCount: number
    interests: string[]
    socialLinks: string[]
    profileVerified: boolean
  }
}

interface Tip {
  id: string
  amount: string
  createdAt: string
  message?: string
  isPublic: boolean
  token: {
    symbol: string
    logoUrl: string
  }
  fromUser: {
    username: string
    displayName: string
  }
}

interface Post {
  id: string
  content: string
  createdAt: string
  contentType: string
  mediaUrls: string[]
  visibility: string
  likesCount: number
  commentsCount: number
  sharesCount: number
  isLiked: boolean
}

export default function ProfilePage({ params }: ProfilePageProps) {
  const { user: currentUser, isAuthenticated } = useAuth()
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [tips, setTips] = useState<Tip[]>([])
  const [posts, setPosts] = useState<Post[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchProfile()
    fetchTips()
    fetchPosts()
  }, [params.id])

  const fetchProfile = async () => {
    try {
      const response = await fetch(`/api/users/${params.id}`)
      const data = await response.json()

      if (response.ok) {
        setProfile(data.data)
      } else {
        setError(data.error || 'Failed to fetch profile')
      }
    } catch (error) {
      console.error('Error fetching profile:', error)
      setError('Failed to fetch profile')
    }
  }

  const fetchTips = async () => {
    try {
      const response = await fetch(`/api/tips/received/${params.id}?limit=10`)
      if (response.ok) {
        const data = await response.json()
        setTips(data.data || [])
      }
    } catch (error) {
      console.error('Error fetching tips:', error)
    }
  }

  const fetchPosts = async () => {
    try {
      const response = await fetch(`/api/posts?authorId=${params.id}&limit=10`)
      if (response.ok) {
        const data = await response.json()
        setPosts(data.data || [])
      }
    } catch (error) {
      console.error('Error fetching posts:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-900 via-purple-900 to-indigo-900">
        <Navbar />
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center text-white">
            <div className="text-6xl mb-4">🐧</div>
            <h1 className="text-2xl font-bold mb-4">Loading Profile...</h1>
            <div className="w-8 h-8 border-4 border-white border-t-transparent rounded-full animate-spin mx-auto"></div>
          </div>
        </div>
      </div>
    )
  }

  if (error || !profile) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-900 via-purple-900 to-indigo-900">
        <Navbar />
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center text-white">
            <div className="text-6xl mb-4">❌</div>
            <h1 className="text-2xl font-bold mb-4">Profile Not Found</h1>
            <p className="text-gray-300 mb-6">{error || 'This penguin has wandered off!'}</p>
            <Link href="/discover" className="bg-cyan-500 text-white px-6 py-3 rounded-xl hover:bg-cyan-600 transition-colors">
              Discover Other Penguins
            </Link>
          </div>
        </div>
      </div>
    )
  }

  const interests = typeof profile.profile.interests === 'string'
    ? JSON.parse(profile.profile.interests || '[]')
    : profile.profile.interests || []
  const socialLinks = typeof profile.profile.socialLinks === 'string'
    ? JSON.parse(profile.profile.socialLinks || '[]')
    : profile.profile.socialLinks || []

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-purple-900 to-indigo-900">
      <Navbar />

      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          {/* Profile Header */}
          <div className="bg-white/10 backdrop-blur-lg rounded-2xl border border-white/20 p-8 mb-8">
            <div className="flex flex-col md:flex-row items-start gap-6">
              {/* Avatar */}
              <div className="w-32 h-32 bg-gradient-to-br from-cyan-400 to-blue-500 rounded-2xl flex items-center justify-center text-5xl font-bold text-white">
                {profile.avatar ? (
                  <img src={profile.avatar} alt={profile.displayName} className="w-full h-full rounded-2xl object-cover" />
                ) : (
                  profile.displayName.charAt(0)
                )}
              </div>

              {/* Profile Info */}
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <h1 className="text-3xl font-bold text-white">{profile.displayName}</h1>
                  {profile.profile.profileVerified && <span className="text-blue-400 text-2xl">✓</span>}
                  {profile.isAdmin && <span className="bg-yellow-500/20 text-yellow-300 px-2 py-1 rounded-full text-xs">ADMIN</span>}
                </div>

                <p className="text-gray-300 text-lg mb-2">@{profile.username}</p>

                {/* Wallet Address */}
                <div className="bg-black/30 rounded-lg p-2 mb-3">
                  <p className="text-xs text-gray-400 mb-1">Wallet Address:</p>
                  <p className="text-sm text-cyan-400 font-mono break-all select-all">
                    {profile.walletAddress || 'Not available'}
                  </p>
                </div>

                {profile.bio && (
                  <p className="text-gray-200 mb-4">{profile.bio}</p>
                )}

                {/* Level & XP */}
                <div className="flex items-center gap-4 mb-4">
                  <span className="bg-purple-500/20 text-purple-300 px-3 py-1 rounded-full text-sm">
                    Level {profile.level}
                  </span>
                  <span className="text-gray-300 text-sm">
                    {profile.xp} XP
                  </span>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                  <div>
                    <div className="text-2xl font-bold text-cyan-400">{profile.profile.postsCount}</div>
                    <div className="text-gray-400 text-sm">Posts</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-green-400">{profile.profile.followersCount}</div>
                    <div className="text-gray-400 text-sm">Followers</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-blue-400">{profile.profile.followingCount}</div>
                    <div className="text-gray-400 text-sm">Following</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-yellow-400">{profile.profile.tipCount || 0}</div>
                    <div className="text-gray-400 text-sm">Tips Received</div>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex flex-col gap-3">
                {currentUser && currentUser.id !== profile.id && (
                  <>
                    <TipButton userId={profile.id} />
                    <FollowButton
                      targetUserId={profile.id}
                      currentUserId={currentUser.id}
                      initialIsFollowing={false}
                    />
                    <FriendButton
                      targetUserId={profile.id}
                      currentUserId={currentUser.id}
                    />
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left Column */}
            <div className="lg:col-span-1 space-y-6">
              {/* Tips Summary */}
              <div className="bg-white/10 backdrop-blur-lg rounded-2xl border border-white/20 p-6">
                <h2 className="text-xl font-bold text-white mb-4">💰 Tips Summary</h2>
                <div className="space-y-3">
                  <div>
                    <div className="text-2xl font-bold text-green-400">{profile.profile.tipCount || 0}</div>
                    <div className="text-gray-400 text-sm">Tips Received</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-yellow-400">{(profile.profile.totalTipsReceived || 0).toFixed(4)}</div>
                    <div className="text-gray-400 text-sm">Total Value (mixed tokens)</div>
                  </div>
                </div>
              </div>

              {/* Interests */}
              {interests.length > 0 && (
                <div className="bg-white/10 backdrop-blur-lg rounded-2xl border border-white/20 p-6">
                  <h2 className="text-xl font-bold text-white mb-4">🎯 Interests</h2>
                  <div className="flex flex-wrap gap-2">
                    {interests.map((interest: string, index: number) => (
                      <span
                        key={index}
                        className="bg-purple-500/20 text-purple-200 px-3 py-1 rounded-full text-sm"
                      >
                        {interest}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Social Links */}
              {socialLinks.length > 0 && (
                <div className="bg-white/10 backdrop-blur-lg rounded-2xl border border-white/20 p-6">
                  <h2 className="text-xl font-bold text-white mb-4">🔗 Social Links</h2>
                  <div className="space-y-2">
                    {socialLinks.map((link: string, index: number) => (
                      <a
                        key={index}
                        href={link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-cyan-400 hover:text-cyan-300 block text-sm truncate"
                      >
                        {link}
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Right Column - User Feed & Tips */}
            <div className="lg:col-span-2 space-y-6">
              {/* User Feed Section */}
              <div className="bg-white/10 backdrop-blur-lg rounded-2xl border border-white/20 p-6">
                <h2 className="text-xl font-bold text-white mb-6">📝 Recent Posts</h2>
                {posts.length > 0 ? (
                  <div className="space-y-4">
                    {posts.map((post) => (
                      <div key={post.id} className="bg-white/5 rounded-xl p-4 border border-white/10">
                        <div className="space-y-3">
                          <div className="text-white">{post.content}</div>
                          {post.mediaUrls.length > 0 && (
                            <div className="grid grid-cols-2 gap-2">
                              {post.mediaUrls.map((url, index) => (
                                <img
                                  key={index}
                                  src={url}
                                  alt="Post media"
                                  className="rounded-lg w-full h-32 object-cover"
                                />
                              ))}
                            </div>
                          )}
                          <div className="flex items-center justify-between text-sm text-gray-400">
                            <div className="flex items-center gap-4">
                              <span>❤️ {post.likesCount}</span>
                              <span>💬 {post.commentsCount}</span>
                              <span>🔄 {post.sharesCount}</span>
                            </div>
                            <div>{new Date(post.createdAt).toLocaleDateString()}</div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center text-gray-400 py-8">
                    <div className="text-4xl mb-4">📝</div>
                    <p>No posts yet</p>
                    <p className="text-sm">This penguin hasn't shared anything yet!</p>
                  </div>
                )}
              </div>

              {/* Tips Section */}
              <div className="bg-white/10 backdrop-blur-lg rounded-2xl border border-white/20 p-6">
                <h2 className="text-xl font-bold text-white mb-6">🎁 Recent Tips Received</h2>

                {tips.length > 0 ? (
                  <div className="space-y-4">
                    {tips.map((tip) => (
                      <div key={tip.id} className="bg-white/5 rounded-xl p-4 border border-white/10">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-3">
                            <span className="text-2xl">{tip.token.logoUrl}</span>
                            <div>
                              <div className="text-white font-semibold">
                                +{tip.amount} {tip.token.symbol}
                              </div>
                              <div className="text-gray-400 text-sm">
                                from @{tip.fromUser.username}
                              </div>
                            </div>
                          </div>
                          <div className="text-gray-400 text-sm">
                            {new Date(tip.createdAt).toLocaleDateString()}
                          </div>
                        </div>
                        {tip.message && tip.isPublic && (
                          <div className="mt-3 p-3 bg-white/5 rounded-lg border-l-4 border-emerald-400">
                            <div className="text-gray-300 text-sm">💬 Public Note:</div>
                            <div className="text-white mt-1">"{tip.message}"</div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center text-gray-400 py-8">
                    <div className="text-4xl mb-4">🎁</div>
                    <p>No tips received yet</p>
                    <p className="text-sm">Be the first to send this penguin a tip!</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}