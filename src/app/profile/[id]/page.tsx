'use client'

import React, { useState, useEffect } from 'react'
import { useAuth } from '@/providers/AuthProvider'
import TipButton from '@/components/TipButton'
import FollowButton from '@/components/FollowButton'
import FriendButton from '@/components/FriendButton'
import UserActions from '@/components/UserActions'
import WalletBalance from '@/components/WalletBalance'
import Navbar from '@/components/Navbar'
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
    theme: string
    bannerImage: string | null
    profileVerified: boolean
  }
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
            <div className="flex justify-center mb-4"><img src="https://gmgnrepeat.com/icons/pengubookicon1.png" alt="PenguBook" className="w-24 h-24" /></div>
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
          <div className="bg-white/10 backdrop-blur-lg rounded-2xl border border-white/20 p-8 mb-8">
            <div className="flex flex-col md:flex-row items-start gap-6">
              <div className="w-32 h-32 bg-gradient-to-br from-cyan-400 to-blue-500 rounded-2xl flex items-center justify-center text-5xl font-bold text-white">
                {profile.avatar ? (
                  <img src={profile.avatar} alt={profile.displayName} className="w-full h-full object-cover rounded-2xl" />
                ) : (
                  <span>🐧</span>
                )}
              </div>

              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <h1 className="text-3xl font-bold text-white">{profile.displayName}</h1>
                  {(profile.isAdmin || profile.profile?.profileVerified) && (
                    <span className="text-blue-400 text-xl">✓</span>
                  )}
                </div>

                <p className="text-gray-300 mb-4">@{profile.username}</p>

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

                <div className="flex flex-wrap gap-4 mb-6">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-cyan-400">Lvl {profile.level}</div>
                    <div className="text-sm text-gray-300">{profile.xp} XP</div>
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
              <WalletBalance
                walletAddress={profile.walletAddress}
                userId={profile.id}
                isOwnProfile={currentUser?.id === profile.id}
              />
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
              <div className="space-y-6">
                {posts.length > 0 ? (
                  posts.map((post) => (
                    <div key={post.id} className="bg-white/10 backdrop-blur-lg rounded-2xl border border-white/20 p-6">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 bg-gradient-to-br from-cyan-400 to-blue-500 rounded-xl flex items-center justify-center text-white font-bold">
                            {post.author.avatar ? (
                              <img src={post.author.avatar} alt={post.author.displayName} className="w-full h-full object-cover rounded-xl" />
                            ) : (
                              <span>🐧</span>
                            )}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-white">{post.author.displayName}</span>
                              {post.author.isAdmin && <span className="text-blue-400">✓</span>}
                            </div>
                            <div className="text-sm text-gray-300">
                              @{post.author.username} • {new Date(post.createdAt).toLocaleDateString()}
                            </div>
                          </div>
                        </div>

                        {currentUser && currentUser.id === post.author.id && (
                          <div className="flex gap-2">
                            <button
                              onClick={() => startEditing(post)}
                              className="text-gray-400 hover:text-white p-1"
                            >
                              ✏️
                            </button>
                            <button
                              onClick={() => viewEditHistory(post.id)}
                              className="text-gray-400 hover:text-white p-1"
                              title="View edit history"
                            >
                              📝
                            </button>
                            <button
                              onClick={() => deletePost(post.id)}
                              disabled={deleting === post.id}
                              className="text-red-400 hover:text-red-300 p-1 disabled:opacity-50"
                            >
                              {deleting === post.id ? '⏳' : '🗑️'}
                            </button>
                          </div>
                        )}
                      </div>

                      {editingPost === post.id ? (
                        <div className="space-y-4">
                          <textarea
                            value={editContent}
                            onChange={(e) => setEditContent(e.target.value)}
                            className="w-full p-4 bg-black/20 border border-white/20 rounded-xl text-white placeholder-gray-400 resize-none"
                            rows={4}
                          />
                          <div className="flex gap-2">
                            <button
                              onClick={() => saveEdit(post.id)}
                              className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600"
                            >
                              Save
                            </button>
                            <button
                              onClick={cancelEditing}
                              className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="text-white whitespace-pre-wrap">{post.content}</div>
                      )}

                      <div className="flex items-center justify-between mt-4 pt-4 border-t border-white/10">
                        <div className="flex items-center gap-6">
                          <button
                            onClick={() => toggleLike(post.id)}
                            className={`flex items-center gap-2 transition-colors ${
                              post.isLiked ? 'text-red-400' : 'text-gray-400 hover:text-red-400'
                            }`}
                          >
                            <span>{post.isLiked ? '❤️' : '🤍'}</span>
                            <span>{post.stats.likes}</span>
                          </button>
                          <span className="text-gray-400">💬 {post.stats.comments}</span>
                          <span className="text-gray-400">🔄 {post.stats.shares}</span>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center text-gray-400 py-12">
                    <div className="text-6xl mb-4">📝</div>
                    <h3 className="text-xl font-semibold mb-2">No posts yet</h3>
                    <p>This penguin hasn't shared anything yet!</p>
                  </div>
                )}
              </div>
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