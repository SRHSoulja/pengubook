'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

interface Post {
  id: string
  title?: string
  content: string
  images: string[]
  visibility: string
  isPinned: boolean
  likesCount: number
  commentsCount: number
  isLiked: boolean
  createdAt: string
  updatedAt: string
  author: {
    id: string
    username: string
    displayName: string
    avatar?: string
    level: number
    profile?: {
      profileVerified: boolean
    }
  }
  community?: {
    id: string
    name: string
    displayName: string
    avatar?: string
  }
}

interface SocialFeedProps {
  userId?: string
  communityId?: string
  authorId?: string
  limit?: number
}

export default function SocialFeed({ userId, communityId, authorId, limit = 10 }: SocialFeedProps) {
  const [posts, setPosts] = useState<Post[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)
  const [editingPost, setEditingPost] = useState<string | null>(null)
  const [editContent, setEditContent] = useState('')

  // DEBUG: Log component mount and userId
  useEffect(() => {
    console.log('SocialFeed mounted with userId:', userId)
  }, [userId])

  useEffect(() => {
    fetchPosts(1, true)
  }, [userId, communityId, authorId])

  const fetchPosts = async (pageNum: number, reset = false) => {
    try {
      setLoading(true)

      const params = new URLSearchParams()
      if (userId) params.append('userId', userId)
      if (communityId) params.append('communityId', communityId)
      if (authorId) params.append('authorId', authorId)
      params.append('page', pageNum.toString())
      params.append('limit', limit.toString())

      const response = await fetch(`/api/posts?${params}`)
      const data = await response.json()

      if (response.ok) {
        const newPosts = (data.posts || []).map((post: any) => ({
          id: post.id,
          title: post.title,
          content: post.content,
          images: post.mediaUrls || [],
          visibility: post.visibility,
          isPinned: post.isPromoted || false,
          likesCount: post.stats?.likes || 0,
          commentsCount: post.stats?.comments || 0,
          isLiked: false, // TODO: Implement user-specific like status
          createdAt: new Date(post.createdAt).toISOString(),
          updatedAt: new Date(post.updatedAt).toISOString(),
          author: {
            id: post.author.id,
            username: post.author.username,
            displayName: post.author.displayName,
            avatar: post.author.avatar,
            level: post.author.level,
            profile: {
              profileVerified: post.author.isAdmin || false
            }
          },
          community: post.community
        }))

        if (reset) {
          setPosts(newPosts)
        } else {
          setPosts(prev => [...prev, ...newPosts])
        }

        setHasMore(data.pagination?.hasMore || false)
        setPage(pageNum)
      }
    } catch (error) {
      console.error('Failed to fetch posts:', error)
    } finally {
      setLoading(false)
    }
  }

  const likePost = async (postId: string) => {
    if (!userId) return

    try {
      const response = await fetch(`/api/posts/${postId}/like`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId })
      })

      if (response.ok) {
        setPosts(prev => prev.map(post => {
          if (post.id === postId) {
            return {
              ...post,
              isLiked: !post.isLiked,
              likesCount: post.isLiked ? post.likesCount - 1 : post.likesCount + 1
            }
          }
          return post
        }))
      }
    } catch (error) {
      console.error('Failed to like post:', error)
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
    if (!userId || !editContent.trim()) return

    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json'
      }

      // Add authentication headers
      if (userId) {
        headers['x-user-id'] = userId
      }

      const response = await fetch(`/api/posts/${postId}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify({ content: editContent.trim() }),
        credentials: 'include'
      })

      if (response.ok) {
        const data = await response.json()
        setPosts(prev => prev.map(post =>
          post.id === postId
            ? { ...post, content: data.post.content, updatedAt: data.post.updatedAt }
            : post
        ))
        setEditingPost(null)
        setEditContent('')
      } else {
        const errorData = await response.json()
        alert(errorData.error || 'Failed to update post')
      }
    } catch (error) {
      console.error('Failed to edit post:', error)
      alert('Failed to update post')
    }
  }

  const sharePost = async (post: Post) => {
    const postUrl = `${window.location.origin}/posts/${post.id}`

    // Try native Web Share API first
    if (navigator.share) {
      try {
        await navigator.share({
          title: `${post.author.displayName}'s Post`,
          text: post.content.slice(0, 100) + (post.content.length > 100 ? '...' : ''),
          url: postUrl
        })
        return
      } catch (error) {
        // User cancelled or API not available, fall back to clipboard
      }
    }

    // Fallback to clipboard
    try {
      await navigator.clipboard.writeText(postUrl)
      alert('Post link copied to clipboard!')
    } catch (error) {
      // Final fallback - show URL in alert
      alert(`Share this post: ${postUrl}`)
    }
  }

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000)

    if (diffInSeconds < 60) return 'Just now'
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`
    if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`

    return date.toLocaleDateString()
  }

  if (loading && posts.length === 0) {
    return (
      <div className="space-y-6">
        {[...Array(3)].map((_, index) => (
          <div key={index} className="bg-white/10 backdrop-blur-lg rounded-2xl border border-white/20 p-6 animate-pulse">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-white/20 rounded-xl"></div>
              <div className="flex-1">
                <div className="h-4 bg-white/20 rounded mb-2 w-1/3"></div>
                <div className="h-3 bg-white/20 rounded w-1/4"></div>
              </div>
            </div>
            <div className="space-y-2 mb-4">
              <div className="h-4 bg-white/20 rounded"></div>
              <div className="h-4 bg-white/20 rounded w-5/6"></div>
            </div>
          </div>
        ))}
      </div>
    )
  }

  if (posts.length === 0) {
    return (
      <div className="text-center text-white py-12">
        <div className="text-4xl mb-4">📝</div>
        <p className="text-xl mb-2">No posts yet</p>
        <p className="text-gray-300">Be the first to share something with the colony!</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {posts.map((post) => (
        <div
          key={post.id}
          className="bg-white/10 backdrop-blur-lg rounded-2xl border border-white/20 p-6 hover:bg-white/15 transition-all"
        >
          {/* Post Header */}
          <div className="flex items-center gap-3 mb-4">
            <Link href={`/profile/${post.author.id}`} className="flex items-center gap-3 hover:opacity-80">
              <div className="w-12 h-12 bg-gradient-to-br from-cyan-400 to-blue-500 rounded-xl flex items-center justify-center text-white font-bold">
                {post.author.avatar ? (
                  <img
                    src={post.author.avatar}
                    alt={post.author.displayName}
                    className="w-full h-full rounded-xl object-cover"
                  />
                ) : (
                  post.author.displayName.charAt(0)
                )}
              </div>

              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-white">{post.author.displayName}</h3>
                  {post.author.profile?.profileVerified && (
                    <span className="text-blue-400 text-sm">✓</span>
                  )}
                  <span className="px-2 py-1 bg-yellow-500/20 text-yellow-300 rounded-full text-xs">
                    Level {post.author.level}
                  </span>
                  {post.isPinned && (
                    <span className="text-yellow-400 text-sm">📌</span>
                  )}
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-300">
                  <span>@{post.author.username}</span>
                  <span>•</span>
                  <span>{formatTimeAgo(post.createdAt)}</span>
                  {post.createdAt !== post.updatedAt && (
                    <>
                      <span>•</span>
                      <span className="text-yellow-400">Edited</span>
                    </>
                  )}
                  {post.community && (
                    <>
                      <span>•</span>
                      <Link
                        href={`/communities/${post.community.id}`}
                        className="text-purple-300 hover:text-purple-200"
                      >
                        #{post.community.name}
                      </Link>
                    </>
                  )}
                </div>
              </div>
            </Link>

            {/* Edit Button for Post Owner */}
            {userId && userId === post.author.id && (
              <button
                onClick={() => startEditing(post)}
                className="text-gray-300 hover:text-white p-2 rounded-lg hover:bg-white/10 transition-colors"
                title="Edit post"
              >
                ✏️
              </button>
            )}
            {/* Debug: Show user ID comparison */}
            {process.env.NODE_ENV === 'development' && (
              <div className="text-xs text-yellow-300 bg-black/20 p-1 rounded">
                User: {userId} | Author: {post.author.id} | Match: {userId === post.author.id ? 'YES' : 'NO'}
              </div>
            )}
          </div>

          {/* Post Content */}
          <div className="mb-4">
            {post.title && (
              <h2 className="text-lg font-bold text-white mb-2">{post.title}</h2>
            )}
            {editingPost === post.id ? (
              <div className="space-y-3">
                <textarea
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                  rows={4}
                  className="w-full px-3 py-2 rounded-lg bg-white/10 border border-white/20 text-white placeholder-gray-300 focus:outline-none focus:border-cyan-400 resize-none"
                  placeholder="Edit your post..."
                />
                <div className="flex gap-2">
                  <button
                    onClick={() => saveEdit(post.id)}
                    disabled={!editContent.trim()}
                    className="bg-green-500 hover:bg-green-600 disabled:bg-gray-500 disabled:cursor-not-allowed text-white px-4 py-2 rounded-lg transition-colors"
                  >
                    Save
                  </button>
                  <button
                    onClick={cancelEditing}
                    className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-lg transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <p className="text-gray-200 whitespace-pre-wrap leading-relaxed">
                {post.content}
              </p>
            )}
          </div>

          {/* Post Images */}
          {post.images && post.images.length > 0 && (
            <div className="mb-4">
              <div className={`grid gap-2 ${
                post.images.length === 1 ? 'grid-cols-1' :
                post.images.length === 2 ? 'grid-cols-2' :
                'grid-cols-2 md:grid-cols-3'
              }`}>
                {post.images.map((image, index) => (
                  <img
                    key={index}
                    src={image}
                    alt=""
                    className="w-full h-48 object-cover rounded-lg"
                  />
                ))}
              </div>
            </div>
          )}

          {/* Post Actions */}
          <div className="flex items-center gap-6 pt-4 border-t border-white/10">
            <button
              onClick={() => likePost(post.id)}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors ${
                post.isLiked
                  ? 'bg-red-500/20 text-red-300'
                  : 'bg-white/10 text-gray-300 hover:bg-white/20'
              }`}
            >
              <span>{post.isLiked ? '❤️' : '🤍'}</span>
              <span>{post.likesCount}</span>
            </button>

            <Link
              href={`/posts/${post.id}`}
              className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/10 text-gray-300 hover:bg-white/20 transition-colors"
            >
              <span>💬</span>
              <span>{post.commentsCount}</span>
            </Link>

            <button
              onClick={() => sharePost(post)}
              className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/10 text-gray-300 hover:bg-white/20 transition-colors"
            >
              <span>🔄</span>
              <span>Share</span>
            </button>

            <div className="flex-1"></div>

            <span className="text-xs text-gray-400 capitalize">
              {post.visibility.toLowerCase().replace('_', ' ')}
            </span>
          </div>
        </div>
      ))}

      {/* Load More */}
      {hasMore && !loading && (
        <div className="text-center">
          <button
            onClick={() => fetchPosts(page + 1)}
            className="bg-cyan-500 text-white px-6 py-3 rounded-xl hover:bg-cyan-600 transition-colors"
          >
            Load More Posts
          </button>
        </div>
      )}

      {loading && posts.length > 0 && (
        <div className="text-center text-white py-4">
          <div className="text-2xl mb-2">🔄</div>
          <p>Loading more posts...</p>
        </div>
      )}
    </div>
  )
}