'use client'

import React, { useState, useEffect } from 'react'
import { useAuth } from '@/providers/AuthProvider'
import TipButton from '@/components/TipButton'
import FollowButton from '@/components/FollowButton'
import FriendButton from '@/components/FriendButton'
import UserActions from '@/components/UserActions'
import WalletBalance from '@/components/WalletBalance'
import Navbar from '@/components/Navbar'
import SocialFeed from '@/components/SocialFeed'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

interface ProfilePageProps {
  params: { id: string }
}

interface UserProfile {
  id: string
  username: string
  displayName: string
  walletAddress: string
  avatar: string | null
  level: number
  xp: number
  isAdmin: boolean
  bio: string | null
  discordName: string | null
  twitterHandle: string | null
  profile: {
    socialLinks: string[]
    interests: string[]
    location: string | null
    website: string | null
    company: string | null
    timezone: string | null
    languages: string[]
    skills: string[]
    isPrivate: boolean
    showActivity: boolean
    showTips: boolean
    showDiscord: boolean
    showTwitter: boolean
    allowDirectMessages: boolean
    featuredCommunityId: string | null
    theme: string
    bannerImage: string | null
    profileVerified: boolean
  }
  featuredCommunity?: {
    id: string
    name: string
    displayName: string
    avatar: string | null
    isOfficial: boolean
    membersCount: number
  } | null
  stats: {
    posts: number
    followers: number
    following: number
    tips: number
  }
}

interface Tip {
  id: string
  amount: number
  message: string | null
  isPublic: boolean
  createdAt: string
}

interface Post {
  id: string
  content: string
  contentType: string
  mediaUrls: string[]
  visibility: string
  isPromoted: boolean
  createdAt: string
  updatedAt: string
  author: {
    id: string
    username: string
    displayName: string
    avatar: string | null
    level: number
    isAdmin: boolean
    discordName?: string
    twitterHandle?: string
  }
  stats: {
    likes: number
    comments: number
    shares: number
  }
  isLiked?: boolean
  isShared?: boolean
}

interface PostEdit {
  id: string
  postId: string
  previousContent: string
  newContent: string
  editedAt: string
  editedBy: string
}

export default function ProfilePage({ params }: ProfilePageProps) {
  const { user: currentUser, isAuthenticated } = useAuth()
  const router = useRouter()
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [tips, setTips] = useState<Tip[]>([])
  const [posts, setPosts] = useState<Post[]>([])
  const [sharedPosts, setSharedPosts] = useState<any[]>([])
  const [activeTab, setActiveTab] = useState<'posts' | 'shared'>('posts')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [editingPost, setEditingPost] = useState<string | null>(null)
  const [editContent, setEditContent] = useState('')
  const [deleting, setDeleting] = useState<string | null>(null)
  const [walletBalanceCollapsed, setWalletBalanceCollapsed] = useState(false)
  const [viewingHistory, setViewingHistory] = useState<string | null>(null)
  const [editHistory, setEditHistory] = useState<PostEdit[]>([])
  const [loadingHistory, setLoadingHistory] = useState(false)

  useEffect(() => {
    fetchProfile()
  }, [params.id])

  const fetchProfile = async () => {
    try {
      const response = await fetch(`/api/users/${params.id}`)
      const data = await response.json()
      if (response.ok) {
        setProfile(data.data)
        // Fetch related data using the actual user ID
        fetchTips(data.data.id)
        fetchPosts(data.data.id)
        fetchSharedPosts(data.data.id)
      } else {
        setError(data.error || 'Failed to load profile')
      }
    } catch (err) {
      setError('Failed to load profile')
    } finally {
      setLoading(false)
    }
  }

  const fetchTips = async (userId: string) => {
    try {
      const response = await fetch(`/api/tips?userId=${userId}&type=received&limit=10`)
      if (response.ok) {
        const data = await response.json()
        setTips(data.tips || [])
      }
    } catch (err) {
      console.error('Failed to fetch tips:', err)
    }
  }

  const fetchPosts = async (userId: string) => {
    try {
      const response = await fetch(`/api/posts?authorId=${userId}&limit=10`)
      if (response.ok) {
        const data = await response.json()
        setPosts(data.posts || [])
      } else {
        console.error('Failed to fetch posts')
      }
    } catch (err) {
      console.error('Failed to fetch posts:', err)
    }
  }

  const fetchSharedPosts = async (userId: string) => {
    try {
      const response = await fetch(`/api/users/${userId}/shares?limit=10`)
      if (response.ok) {
        const data = await response.json()
        setSharedPosts(data.shares || [])
      }
    } catch (err) {
      console.error('Failed to fetch shared posts:', err)
    }
  }

  const startEditing = (post: Post) => {
    setEditingPost(post.id)
    setEditContent(post.content)
  }

  const cancelEditing = () => {
    setEditingPost(null)
    setEditContent('')
  }

  const saveEdit = async (postId: string) => {
    if (!currentUser) return

    try {
      const response = await fetch(`/api/posts/${postId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': currentUser.id
        },
        body: JSON.stringify({
          content: editContent
        })
      })

      if (response.ok) {
        const data = await response.json()
        setPosts(prev => prev.map(post =>
          post.id === postId
            ? { ...post, content: editContent, updatedAt: data.post.updatedAt }
            : post
        ))
        cancelEditing()
      } else {
        const errorData = await response.json()
        console.error('Failed to update post:', errorData.error)
        alert('Failed to update post: ' + errorData.error)
      }
    } catch (error) {
      console.error('Error updating post:', error)
      alert('Error updating post')
    }
  }

  const deletePost = async (postId: string) => {
    if (!currentUser) return
    if (!confirm('Are you sure you want to delete this post?')) return

    setDeleting(postId)
    try {
      const response = await fetch(`/api/posts/${postId}?userId=${currentUser.id}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        setPosts(prev => prev.filter(post => post.id !== postId))
      } else {
        const errorData = await response.json()
        alert('Failed to delete post: ' + errorData.error)
      }
    } catch (error) {
      console.error('Error deleting post:', error)
      alert('Error deleting post')
    } finally {
      setDeleting(null)
    }
  }

  const toggleLike = async (postId: string) => {
    if (!currentUser || !isAuthenticated) {
      router.push('/auth/login')
      return
    }

    try {
      const post = posts.find(p => p.id === postId)
      if (!post) return

      if (!post.isLiked) {
        const likeResponse = await fetch(`/api/posts/${postId}/like`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-user-id': currentUser.id
          }
        })

        if (likeResponse.ok) {
          setPosts(prev => prev.map(p =>
            p.id === postId
              ? { ...p, isLiked: true, stats: { ...p.stats, likes: p.stats.likes + 1 } }
              : p
          ))
        }
      } else {
        const unlikeResponse = await fetch(`/api/posts/${postId}/like?userId=${currentUser.id}`, {
          method: 'DELETE'
        })

        if (unlikeResponse.ok) {
          setPosts(prev => prev.map(p =>
            p.id === postId
              ? { ...p, isLiked: false, stats: { ...p.stats, likes: p.stats.likes - 1 } }
              : p
          ))
        }
      }
    } catch (error) {
      console.error('Error toggling like:', error)
    }
  }

  const viewEditHistory = async (postId: string) => {
    setViewingHistory(postId)
    setLoadingHistory(true)

    try {
      const response = await fetch(`/api/posts/${postId}/edits`)
      if (response.ok) {
        const data = await response.json()
        setEditHistory(data.editHistory || [])
      } else {
        console.error('Failed to fetch edit history')
        setEditHistory([])
      }
    } catch (error) {
      console.error('Error fetching edit history:', error)
      setEditHistory([])
    } finally {
      setLoadingHistory(false)
    }
  }

  const closeEditHistory = () => {
    setViewingHistory(null)
    setEditHistory([])
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-900 via-purple-900 to-indigo-900">
        <Navbar />
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center text-white">
            <div className="flex justify-center mb-4"><img src="https://gmgnrepeat.com/icons/pengubookicon1.png" alt="PeBloq" className="w-24 h-24" /></div>
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-purple-900 to-indigo-900">
      <Navbar />

      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          {/* Banner Image */}
          {profile.profile?.bannerImage && (
            <div className="w-full h-48 md:h-64 rounded-t-2xl overflow-hidden bg-gradient-to-r from-purple-500 via-pink-500 to-blue-500 -mb-16 relative group">
              <img
                src={profile.profile.bannerImage.includes('cloudinary.com')
                  ? profile.profile.bannerImage.replace('/upload/', '/upload/w_1600,f_auto,q_auto/')
                  : profile.profile.bannerImage}
                alt={`${profile.displayName}'s banner`}
                className="w-full h-full object-cover object-center md:object-top"
                loading="lazy"
                srcSet={profile.profile.bannerImage.includes('cloudinary.com')
                  ? `${profile.profile.bannerImage.replace('/upload/', '/upload/w_768,f_auto,q_auto/')} 768w, ${profile.profile.bannerImage.replace('/upload/', '/upload/w_1600,f_auto,q_auto/')} 1600w`
                  : undefined}
                sizes="(max-width: 768px) 768px, 1600px"
              />
              {/* Gradient mask for text readability */}
              <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-black/60 via-black/30 to-transparent pointer-events-none" />

              {/* Edit overlay for own profile */}
              {currentUser?.id === profile.id && (
                <Link href="/profile/edit">
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center cursor-pointer">
                    <div className="bg-white/20 backdrop-blur-sm border border-white/30 rounded-xl px-4 py-2 flex items-center gap-2">
                      <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                      </svg>
                      <span className="text-white font-medium">Edit Banner</span>
                    </div>
                  </div>
                </Link>
              )}
            </div>
          )}

          <div className={`bg-white/10 backdrop-blur-lg ${profile.profile?.bannerImage ? 'rounded-b-2xl pt-20' : 'rounded-2xl'} border border-white/20 p-8 mb-8`}>
            <div className="flex flex-col md:flex-row items-start gap-6">
              <div className="w-32 h-32 bg-gradient-to-br from-cyan-400 to-blue-500 rounded-2xl flex items-center justify-center text-5xl font-bold text-white border-4 border-white/20">
                {profile.avatar ? (
                  <img
                    src={profile.avatar}
                    alt={profile.displayName}
                    className="w-full h-full object-cover rounded-2xl"
                    loading="lazy"
                  />
                ) : (
                  <span>🐧</span>
                )}
              </div>

              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <h1 className="text-3xl font-bold text-white" style={{ textShadow: '0 2px 4px rgba(0,0,0,0.3)' }}>{profile.displayName}</h1>
                  {(profile.isAdmin || profile.profile?.profileVerified) && (
                    <span className="text-blue-400 text-xl animate-in fade-in zoom-in duration-500 delay-300">✓</span>
                  )}
                </div>

                <p className="text-gray-200 mb-4" style={{ textShadow: '0 1px 3px rgba(0,0,0,0.4)' }}>@{profile.username}</p>

                {profile.bio && (
                  <p className="text-gray-100 mb-4">{profile.bio}</p>
                )}

                {/* Social Accounts Section */}
                {((profile.discordName && profile.profile?.showDiscord) || (profile.twitterHandle && profile.profile?.showTwitter)) && (
                  <div className="flex flex-wrap gap-3 mb-4">
                    {profile.discordName && profile.profile?.showDiscord && (
                      <div className="flex items-center gap-2 bg-indigo-500/20 border border-indigo-500/30 px-3 py-1.5 rounded-lg">
                        <svg className="w-5 h-5 text-indigo-400" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515a.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0a12.64 12.64 0 0 0-.617-1.25a.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057a19.9 19.9 0 0 0 5.993 3.03a.078.078 0 0 0 .084-.028a14.09 14.09 0 0 0 1.226-1.994a.076.076 0 0 0-.041-.106a13.107 13.107 0 0 1-1.872-.892a.077.077 0 0 1-.008-.128a10.2 10.2 0 0 0 .372-.292a.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127a12.299 12.299 0 0 1-1.873.892a.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028a19.839 19.839 0 0 0 6.002-3.03a.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419c0-1.333.956-2.419 2.157-2.419c1.21 0 2.176 1.096 2.157 2.42c0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419c0-1.333.955-2.419 2.157-2.419c1.21 0 2.176 1.096 2.157 2.42c0 1.333-.946 2.418-2.157 2.418z"/>
                        </svg>
                        <span className="text-indigo-200 text-sm font-medium">{profile.discordName}</span>
                      </div>
                    )}
                    {profile.twitterHandle && profile.profile?.showTwitter && (
                      <div className="flex items-center gap-2 bg-sky-500/20 border border-sky-500/30 px-3 py-1.5 rounded-lg">
                        <svg className="w-5 h-5 text-sky-400" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                        </svg>
                        <span className="text-sky-200 text-sm font-medium">@{profile.twitterHandle}</span>
                      </div>
                    )}
                  </div>
                )}

                {/* Featured Community */}
                {profile.featuredCommunity && (
                  <Link
                    href={`/communities/${profile.featuredCommunity.id}`}
                    className="inline-flex items-center gap-3 bg-purple-500/20 border border-purple-500/30 px-4 py-2 rounded-lg mb-4 hover:bg-purple-500/30 transition-colors group"
                  >
                    <div className="w-8 h-8 bg-gradient-to-br from-purple-400 to-pink-500 rounded-lg flex items-center justify-center flex-shrink-0">
                      {profile.featuredCommunity.avatar ? (
                        <img
                          src={profile.featuredCommunity.avatar}
                          alt={profile.featuredCommunity.displayName}
                          className="w-full h-full rounded-lg object-cover"
                        />
                      ) : (
                        <span className="text-white font-bold text-sm">{profile.featuredCommunity.displayName.charAt(0)}</span>
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-purple-200 text-sm font-semibold group-hover:text-purple-100">{profile.featuredCommunity.displayName}</span>
                        {profile.featuredCommunity.isOfficial && (
                          <span className="text-yellow-400 text-xs">✨</span>
                        )}
                      </div>
                      <p className="text-purple-300/70 text-xs">{profile.featuredCommunity.membersCount.toLocaleString()} members</p>
                    </div>
                    <svg className="w-4 h-4 text-purple-300 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </Link>
                )}

                <div className="flex flex-wrap gap-4 mb-6">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-cyan-300" style={{ textShadow: '0 1px 3px rgba(0,0,0,0.4)' }}>Lvl {profile.level}</div>
                    <div className="text-sm text-gray-100" style={{ textShadow: '0 1px 2px rgba(0,0,0,0.3)' }}>{profile.xp} XP</div>
                  </div>
                  <div className="text-center">
                    <div className="text-xl font-bold text-white">{profile.stats.followers}</div>
                    <div className="text-sm text-gray-300">Followers</div>
                  </div>
                  <div className="text-center">
                    <div className="text-xl font-bold text-white">{profile.stats.following}</div>
                    <div className="text-sm text-gray-300">Following</div>
                  </div>
                  <div className="text-center">
                    <div className="text-xl font-bold text-white">{profile.stats.posts}</div>
                    <div className="text-sm text-gray-300">Posts</div>
                  </div>
                </div>

                {currentUser && currentUser.id !== profile.id && (
                  <div className="flex gap-3">
                    <FollowButton
                      targetUserId={profile.id}
                      currentUserId={currentUser.id}
                      initialIsFollowing={false}
                    />
                    <UserActions
                      targetUserId={profile.id}
                      targetUser={{
                        username: profile.username,
                        displayName: profile.displayName
                      }}
                      showMessageButton={true}
                      showFriendButton={true}
                      showBlockButton={true}
                      compact={false}
                    />
                    <TipButton userId={profile.id} />
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Wallet Balance */}
          {profile.walletAddress && (
            <div className="mb-8">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-lg font-semibold text-white">💰 Wallet Balance</h3>
                <button
                  onClick={() => setWalletBalanceCollapsed(!walletBalanceCollapsed)}
                  className="text-cyan-400 hover:text-cyan-300 transition-colors text-sm font-medium"
                >
                  {walletBalanceCollapsed ? '▼ Expand' : '▲ Collapse'}
                </button>
              </div>
              {!walletBalanceCollapsed && (
                <WalletBalance
                  walletAddress={profile.walletAddress}
                  userId={profile.id}
                  isOwnProfile={currentUser?.id === profile.id}
                />
              )}
            </div>
          )}

          {/* Tabs */}
          <div className="flex space-x-1 mb-6">
            <button
              className={`px-6 py-3 rounded-lg font-semibold transition-colors ${
                activeTab === 'posts'
                  ? 'bg-cyan-500 text-white'
                  : 'bg-white/10 text-gray-300 hover:bg-white/20'
              }`}
              onClick={() => setActiveTab('posts')}
            >
              Posts ({posts.length})
            </button>
            <button
              className={`px-6 py-3 rounded-lg font-semibold transition-colors ${
                activeTab === 'shared'
                  ? 'bg-cyan-500 text-white'
                  : 'bg-white/10 text-gray-300 hover:bg-white/20'
              }`}
              onClick={() => setActiveTab('shared')}
            >
              Shared ({sharedPosts.length})
            </button>
          </div>

          {/* Content */}
          <div className="space-y-6">
            {activeTab === 'posts' && (
              <SocialFeed userId={currentUser?.id} authorId={profile?.id} limit={20} />
            )}

            {activeTab === 'shared' && (
              <div className="space-y-6">
                {sharedPosts.length > 0 ? (
                  sharedPosts.map((share) => (
                    <div key={share.id} className="bg-white/10 backdrop-blur-lg rounded-2xl border border-white/20 p-6">
                      <div className="text-sm text-gray-400 mb-3">
                        🔄 Shared on {new Date(share.sharedAt).toLocaleDateString()}
                      </div>
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 bg-gradient-to-br from-cyan-400 to-blue-500 rounded-xl flex items-center justify-center text-white font-bold">
                            {share.post.author.avatar ? (
                              <img src={share.post.author.avatar} alt={share.post.author.displayName} className="w-full h-full object-cover rounded-xl" />
                            ) : (
                              <span>🐧</span>
                            )}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-white">{share.post.author.displayName}</span>
                              {share.post.author.isAdmin && <span className="text-blue-400">✓</span>}
                            </div>
                            <div className="text-sm text-gray-300">
                              @{share.post.author.username} • {new Date(share.post.createdAt).toLocaleDateString()}
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="text-white whitespace-pre-wrap">{share.post.content}</div>

                      <div className="flex items-center justify-between mt-4 pt-4 border-t border-white/10">
                        <div className="flex items-center gap-6">
                          <span className="text-gray-400">❤️ {share.post.stats.likes}</span>
                          <span className="text-gray-400">💬 {share.post.stats.comments}</span>
                          <span className="text-gray-400">🔄 {share.post.stats.shares}</span>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center text-gray-400 py-12">
                    <div className="text-6xl mb-4">🔄</div>
                    <h3 className="text-xl font-semibold mb-2">No shared posts</h3>
                    <p>This penguin hasn't shared any posts yet!</p>
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