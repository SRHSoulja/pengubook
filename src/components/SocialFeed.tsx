'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { detectMediaType, getYouTubeEmbedUrl, isYouTubeUrl, getGiphyEmbedUrl, isGiphyUrl } from '@/lib/media-utils'
import NSFWBlurOverlay from '@/components/NSFWBlurOverlay'
import { useAuth } from '@/providers/AuthProvider'
import TipButton from '@/components/TipButton'
import { SkeletonPostGrid } from '@/components/skeletons/SkeletonPostCard'
import { useToast } from '@/components/ui/Toast'
import BookmarkButton from '@/components/BookmarkButton'

// Function to extract URLs from content
function extractUrlsFromContent(content: string): string[] {
  const urlRegex = /(https?:\/\/[^\s]+)/g
  const matches = content.match(urlRegex)
  return matches || []
}

// Helper function to render text with clickable hashtags
function renderTextWithHashtags(text: string): JSX.Element[] {
  const hashtagRegex = /#[\w]+/g
  const parts: JSX.Element[] = []
  let lastIndex = 0
  let match

  while ((match = hashtagRegex.exec(text)) !== null) {
    // Add text before hashtag
    if (match.index > lastIndex) {
      parts.push(
        <span key={`text-${lastIndex}`}>
          {text.substring(lastIndex, match.index)}
        </span>
      )
    }

    // Add clickable hashtag
    const hashtag = match[0]
    parts.push(
      <span
        key={`hashtag-${match.index}`}
        className="text-cyan-400 hover:text-cyan-300 cursor-pointer font-semibold hover:underline transition-colors"
        onClick={(e) => {
          e.stopPropagation()
          window.location.href = `/feed/search?q=${encodeURIComponent(hashtag)}`
        }}
      >
        {hashtag}
      </span>
    )

    lastIndex = match.index + hashtag.length
  }

  // Add remaining text
  if (lastIndex < text.length) {
    parts.push(
      <span key={`text-${lastIndex}`}>
        {text.substring(lastIndex)}
      </span>
    )
  }

  return parts
}

// Function to render content with YouTube and Giphy embeds
function renderContentWithEmbeds(content: string): JSX.Element {
  const urls = extractUrlsFromContent(content)
  const mediaUrls = urls.filter(url => isYouTubeUrl(url) || isGiphyUrl(url))

  if (mediaUrls.length === 0) {
    return (
      <p className="text-gray-200 whitespace-pre-wrap leading-relaxed">
        {renderTextWithHashtags(content)}
      </p>
    )
  }

  // Split content and embed media
  let remainingContent = content
  const elements: JSX.Element[] = []

  mediaUrls.forEach((url, index) => {
    const urlIndex = remainingContent.indexOf(url)
    if (urlIndex !== -1) {
      // Add text before the URL
      if (urlIndex > 0) {
        const textBefore = remainingContent.substring(0, urlIndex)
        elements.push(
          <p key={`text-before-${index}`} className="text-gray-200 whitespace-pre-wrap leading-relaxed">
            {renderTextWithHashtags(textBefore)}
          </p>
        )
      }

      // Add YouTube embed
      if (isYouTubeUrl(url)) {
        const embedUrl = getYouTubeEmbedUrl(url)
        if (embedUrl) {
          elements.push(
            <div key={`youtube-${index}`} className="my-4">
              <iframe
                src={embedUrl}
                width="100%"
                height="315"
                frameBorder="0"
                sandbox="allow-scripts allow-same-origin allow-presentation"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                className="rounded-lg"
              ></iframe>
            </div>
          )
        }
      }

      // Add Giphy embed
      else if (isGiphyUrl(url)) {
        const embedUrl = getGiphyEmbedUrl(url)
        if (embedUrl) {
          elements.push(
            <div key={`giphy-${index}`} className="my-4">
              <iframe
                src={embedUrl}
                width="100%"
                height="270"
                frameBorder="0"
                sandbox="allow-scripts allow-same-origin"
                className="rounded-lg"
                allowFullScreen
              ></iframe>
            </div>
          )
        }
      }

      // Update remaining content
      remainingContent = remainingContent.substring(urlIndex + url.length)
    }
  })

  // Add any remaining text
  if (remainingContent.trim()) {
    elements.push(
      <p key="remaining-text" className="text-gray-200 whitespace-pre-wrap leading-relaxed">
        {renderTextWithHashtags(remainingContent)}
      </p>
    )
  }

  return <div>{elements}</div>
}

interface Post {
  id: string
  title?: string
  content: string
  images: string[]
  visibility: string
  isPinned: boolean
  likesCount: number
  commentsCount: number
  sharesCount: number
  isLiked: boolean
  isShared: boolean
  isBookmarked?: boolean
  isNSFW?: boolean
  contentWarnings?: string[]
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

interface PostEdit {
  id: string
  previousContent: string
  newContent: string
  editedAt: string
  editor: {
    id: string
    username: string
    displayName: string
    avatar: string
    isAdmin: boolean
  }
}

interface SocialFeedProps {
  userId?: string
  communityId?: string
  authorId?: string
  limit?: number
}

// Default reaction emojis
const defaultReactionEmojis: { [key: string]: string } = {
  HAPPY: '😀',
  LAUGH: '😂',
  LOVE: '😍',
  SHOCK: '😮',
  CRY: '😢',
  ANGER: '😡',
  THUMBS_UP: '👍',
  THUMBS_DOWN: '👎'
}

export default function SocialFeed({ userId, communityId, authorId, limit = 10 }: SocialFeedProps) {
  const { user } = useAuth()
  const { toast } = useToast()
  const [posts, setPosts] = useState<Post[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)
  const [editingPost, setEditingPost] = useState<string | null>(null)
  const [editContent, setEditContent] = useState('')
  const [viewingHistory, setViewingHistory] = useState<string | null>(null)
  const [editHistory, setEditHistory] = useState<PostEdit[]>([])
  const [loadingHistory, setLoadingHistory] = useState(false)
  const [showShareMenu, setShowShareMenu] = useState<string | null>(null)
  const [currentUser, setCurrentUser] = useState<any>(null)
  const shareMenuRef = useRef<HTMLDivElement>(null)
  const [postReactions, setPostReactions] = useState<{ [postId: string]: { counts: { [key: string]: number }, userReactions: Set<string> } }>({})
  const [reactingTo, setReactingTo] = useState<string | null>(null)
  const [reactionEmojis, setReactionEmojis] = useState<{ [key: string]: string }>(defaultReactionEmojis)
  const sentinelRef = useRef<HTMLDivElement>(null)
  const loadingRef = useRef(false)

  // DEBUG: Log component mount and userId
  useEffect(() => {
    console.log('SocialFeed mounted with userId:', userId)
  }, [userId])

  // Load custom reaction emojis
  useEffect(() => {
    const loadReactionEmojis = async () => {
      try {
        const response = await fetch('/api/admin/reaction-emojis')
        const data = await response.json()
        if (data.success && data.config) {
          setReactionEmojis(data.config)
        }
      } catch (error) {
        console.error('Failed to load reaction emojis:', error)
        // Use defaults on error
      }
    }
    loadReactionEmojis()
  }, [])

  useEffect(() => {
    fetchPosts(1, true)
  }, [userId, communityId, authorId])

  // Load current user for X integration
  useEffect(() => {
    const loadCurrentUser = async () => {
      if (userId) {
        try {
          const response = await fetch(`/api/users/${userId}`)
          const result = await response.json()
          if (result.success) {
            setCurrentUser(result.user)
          }
        } catch (error) {
          console.error('Error loading current user:', error)
        }
      }
    }
    loadCurrentUser()
  }, [userId])

  // Handle click outside to close share menu
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (shareMenuRef.current && !shareMenuRef.current.contains(event.target as Node)) {
        setShowShareMenu(null)
      }
    }
    if (showShareMenu) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showShareMenu])

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
          sharesCount: post.stats?.shares || 0,
          isLiked: false, // TODO: Implement user-specific like status
          isBookmarked: post.isBookmarked || false,
          isShared: userId ? (post.shares || []).some((share: any) => share.userId === userId) : false,
          isNSFW: post.isNSFW || false,
          contentWarnings: post.contentWarnings ? JSON.parse(post.contentWarnings) : [],
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

  // Infinite scroll observer
  useEffect(() => {
    const sentinel = sentinelRef.current
    if (!sentinel || !hasMore) return

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loadingRef.current) {
          loadingRef.current = true
          fetchPosts(page + 1).finally(() => {
            loadingRef.current = false
          })
        }
      },
      { threshold: 0.1 }
    )

    observer.observe(sentinel)
    return () => observer.disconnect()
  }, [hasMore, page])

  // Load reactions for all posts
  useEffect(() => {
    const loadReactions = async () => {
      for (const post of posts) {
        try {
          const response = await fetch(`/api/posts/${post.id}/reactions`)
          const result = await response.json()
          if (result.success) {
            setPostReactions(prev => ({
              ...prev,
              [post.id]: {
                counts: result.data.counts || {},
                userReactions: new Set()
              }
            }))
          }
        } catch (error) {
          console.error(`Error loading reactions for post ${post.id}:`, error)
        }
      }
    }

    if (posts.length > 0) {
      loadReactions()
    }
  }, [posts.length])

  const handleReaction = async (postId: string, reactionType: string) => {
    if (!userId || reactingTo) return

    setReactingTo(postId)

    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json'
      }

      if (userId) {
        headers['x-user-id'] = userId
      }

      const response = await fetch(`/api/posts/${postId}/reactions`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ reactionType }),
        credentials: 'include'
      })

      const result = await response.json()

      if (result.success) {
        setPostReactions(prev => {
          return {
            ...prev,
            [postId]: {
              counts: result.data.counts || {},
              userReactions: new Set(result.data.userReactions || [])
            }
          }
        })
      }
    } catch (error) {
      console.error('Error reacting to post:', error)
    } finally {
      setReactingTo(null)
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
        toast(errorData.error || 'Failed to update post', 'error')
      }
    } catch (error) {
      console.error('Failed to edit post:', error)
      toast('Failed to update post', 'error')
    }
  }

  const handleShare = async (postId: string) => {
    if (!userId) return

    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json'
      }

      // Add authentication headers
      if (userId) {
        headers['x-user-id'] = userId
      }

      const response = await fetch(`/api/posts/${postId}/interactions`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ action: 'share' }),
        credentials: 'include'
      })

      if (response.ok) {
        const data = await response.json()
        console.log('Post shared successfully:', data)
        toast('Post shared successfully!', 'success')

        // Update local state to reflect the share
        setPosts(prev => prev.map(post =>
          post.id === postId
            ? { ...post, isShared: true, sharesCount: post.sharesCount + 1 }
            : post
        ))
      } else {
        const errorData = await response.json()
        toast(errorData.error || 'Failed to share post', 'error')
      }
    } catch (error) {
      console.error('Failed to share post:', error)
      toast('Failed to share post', 'error')
    } finally {
      setShowShareMenu(null)
    }
  }

  const handleShareToX = (post: Post) => {
    const postUrl = `${window.location.origin}/posts/${post.id}`
    const text = `Check out this post by ${post.author.displayName}: "${post.content.slice(0, 100)}${post.content.length > 100 ? '...' : ''}"

via @PeBloq`
    const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(postUrl)}`
    const newWindow = window.open(twitterUrl, '_blank', 'width=550,height=420,noopener,noreferrer')
    if (newWindow) newWindow.opener = null // Extra security for older browsers
    setShowShareMenu(null)
  }

  const handleCopyLink = async (post: Post) => {
    const postUrl = `${window.location.origin}/posts/${post.id}`
    try {
      await navigator.clipboard.writeText(postUrl)
      toast('Link copied to clipboard!', 'success')
    } catch (error) {
      toast(`Share this post: ${postUrl}`, 'info')
    } finally {
      setShowShareMenu(null)
    }
  }

  const viewEditHistory = async (postId: string) => {
    setLoadingHistory(true)
    setViewingHistory(postId)

    try {
      const response = await fetch(`/api/posts/${postId}/edits`)
      if (response.ok) {
        const data = await response.json()
        setEditHistory(data.edits || [])
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
    return <SkeletonPostGrid count={3} />
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

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-semibold text-white truncate max-w-[150px] sm:max-w-none">{post.author.displayName}</h3>
                  {post.author.profile?.profileVerified && (
                    <span className="text-blue-400 text-sm shrink-0">✓</span>
                  )}
                  <span className="px-2 py-1 bg-yellow-500/20 text-yellow-300 rounded-full text-xs shrink-0">
                    Level {post.author.level}
                  </span>
                  {post.isPinned && (
                    <span className="text-yellow-400 text-sm shrink-0">📌</span>
                  )}
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-300 flex-wrap">
                  <span className="truncate max-w-[120px] sm:max-w-[200px]">@{post.author.username}</span>
                  <span className="shrink-0">•</span>
                  <span className="shrink-0">{formatTimeAgo(post.createdAt)}</span>
                  {post.createdAt !== post.updatedAt && (
                    <>
                      <span className="shrink-0">•</span>
                      <span className="text-yellow-400 shrink-0">Edited</span>
                    </>
                  )}
                  {post.community && (
                    <>
                      <span className="shrink-0">•</span>
                      <Link
                        href={`/communities/${post.community.id}`}
                        className="text-purple-300 hover:text-purple-200 truncate max-w-[100px] sm:max-w-none"
                      >
                        #{post.community.name}
                      </Link>
                    </>
                  )}
                </div>
              </div>
            </Link>

            {/* Post Actions */}
            <div className="flex items-center gap-2">
              {/* Edit History - Available for all posts */}
              <button
                onClick={() => viewEditHistory(post.id)}
                className="text-gray-300 hover:text-white p-2 rounded-lg hover:bg-white/10 transition-colors"
                title="View edit history"
              >
                📝
              </button>

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
            </div>
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
              renderContentWithEmbeds(post.content)
            )}
          </div>

          {/* Post Media (Images & Videos) */}
          {post.images && post.images.length > 0 && (
            <div className="mb-4">
              <div className={`grid gap-2 ${
                post.images.length === 1 ? 'grid-cols-1' :
                post.images.length === 2 ? 'grid-cols-2' :
                'grid-cols-2 md:grid-cols-3'
              }`}>
                {/* Wrap media in NSFW overlay if flagged */}
                {post.isNSFW ? (
                  <NSFWBlurOverlay
                    contentWarnings={post.contentWarnings || []}
                    autoShow={user?.profile?.showNSFW || false}
                    allowedCategories={
                      user?.profile?.allowedNSFWCategories
                        ? (typeof user.profile.allowedNSFWCategories === 'string'
                            ? JSON.parse(user.profile.allowedNSFWCategories)
                            : user.profile.allowedNSFWCategories)
                        : []
                    }
                  >
                    <div className={`grid gap-2 ${
                      post.images.length === 1 ? 'grid-cols-1' :
                      post.images.length === 2 ? 'grid-cols-2' :
                      'grid-cols-2 md:grid-cols-3'
                    }`}>
                      {post.images.map((mediaUrl, index) => {
                        // Detect if it's a video based on URL or extension
                        const isVideo = mediaUrl.includes('/video/') ||
                                       /\.(mp4|webm|mov|avi|mkv)$/i.test(mediaUrl)

                        return isVideo ? (
                          <video
                            key={index}
                            src={mediaUrl}
                            controls
                            className="w-full max-w-md mx-auto rounded-lg bg-black"
                            style={{ maxHeight: '500px' }}
                          >
                            Your browser does not support the video tag.
                          </video>
                        ) : (
                          <img
                            key={index}
                            src={mediaUrl}
                            alt=""
                            className="w-full max-w-md mx-auto rounded-lg"
                            style={{ height: 'auto' }}
                          />
                        )
                      })}
                    </div>
                  </NSFWBlurOverlay>
                ) : (
                  post.images.map((mediaUrl, index) => {
                    // Detect if it's a video based on URL or extension
                    const isVideo = mediaUrl.includes('/video/') ||
                                   /\.(mp4|webm|mov|avi|mkv)$/i.test(mediaUrl)

                    return isVideo ? (
                      <video
                        key={index}
                        src={mediaUrl}
                        controls
                        className="w-full max-w-md mx-auto rounded-lg bg-black"
                        style={{ maxHeight: '500px' }}
                      >
                        Your browser does not support the video tag.
                      </video>
                    ) : (
                      <img
                        key={index}
                        src={mediaUrl}
                        alt=""
                        className="w-full max-w-md mx-auto rounded-lg"
                        style={{ height: 'auto' }}
                      />
                    )
                  })
                )}
              </div>
            </div>
          )}

          {/* Emoji Reactions */}
          <div className="mb-4 pb-4 border-b border-white/10">
            <div className="flex items-center flex-wrap gap-2">
              {['HAPPY', 'LAUGH', 'LOVE', 'SHOCK', 'CRY', 'ANGER', 'THUMBS_UP', 'THUMBS_DOWN'].map((reactionType) => {
                const reactions = postReactions[post.id]
                const count = reactions?.counts[reactionType] || 0
                const userReacted = reactions?.userReactions.has(reactionType) || false

                return (
                  <button
                    key={reactionType}
                    onClick={() => handleReaction(post.id, reactionType)}
                    disabled={reactingTo === post.id}
                    className={`flex items-center gap-1.5 px-3 py-2 rounded-lg transition-all hover:scale-105 ${
                      userReacted
                        ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                        : 'bg-white/10 text-gray-300 hover:bg-white/20 border border-transparent'
                    }`}
                  >
                    {reactionEmojis[reactionType]?.startsWith('http') ? (
                      <img src={reactionEmojis[reactionType]} alt={reactionType} className="w-6 h-6 object-contain" />
                    ) : (
                      <span className="text-lg">{reactionEmojis[reactionType] || defaultReactionEmojis[reactionType]}</span>
                    )}
                    {count > 0 && <span className="text-sm font-mono">{count}</span>}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Post Actions */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 pt-4 border-t border-white/10">
            <div className="flex flex-wrap items-center gap-2 md:gap-3">
              <Link
                href={`/posts/${post.id}`}
                className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/10 text-gray-300 hover:bg-white/20 transition-colors"
              >
                <span>💬</span>
                <span>{post.commentsCount}</span>
              </Link>

              {/* Share button with dropdown */}
              <div className="relative" ref={showShareMenu === post.id ? shareMenuRef : null}>
              <button
                onClick={() => setShowShareMenu(showShareMenu === post.id ? null : post.id)}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors ${
                  post.isShared
                    ? 'bg-green-500/20 text-green-300'
                    : 'bg-white/10 text-gray-300 hover:bg-white/20'
                }`}
              >
                <span>🔄</span>
                <span>{post.sharesCount}</span>
              </button>

              {/* Share dropdown menu */}
              {showShareMenu === post.id && (
                <div className="fixed md:absolute bottom-0 md:bottom-full left-0 right-0 md:left-0 md:right-auto mb-0 md:mb-2 w-full md:w-64 bg-gray-900/95 backdrop-blur-lg rounded-t-lg md:rounded-lg border border-white/20 shadow-xl z-[9999]">
                  <div className="p-3 space-y-2">

                    {/* Internal share */}
                    <button
                      onClick={() => handleShare(post.id)}
                      disabled={post.isShared}
                      className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg transition-all ${
                        post.isShared
                          ? 'bg-green-500/20 text-green-300 cursor-not-allowed'
                          : 'hover:bg-white/10 text-white'
                      }`}
                    >
                      <span className="text-lg">📤</span>
                      <div className="text-left">
                        <div className="font-medium">
                          {post.isShared ? 'Already Shared' : 'Share Internally'}
                        </div>
                        <div className="text-xs text-gray-300">
                          {post.isShared ? 'You shared this post' : 'Share within PeBloq'}
                        </div>
                      </div>
                    </button>

                    {/* Share to X (Twitter) - only if user has linked X account */}
                    {currentUser?.twitterHandle && (
                      <button
                        onClick={() => handleShareToX(post)}
                        className="w-full flex items-center space-x-3 px-3 py-2 rounded-lg hover:bg-white/10 text-white transition-all"
                      >
                        <span className="text-lg">🐦</span>
                        <div className="text-left">
                          <div className="font-medium">Share to X</div>
                          <div className="text-xs text-gray-300">Share to @{currentUser.twitterHandle}</div>
                        </div>
                      </button>
                    )}

                    {/* Copy link */}
                    <button
                      onClick={() => handleCopyLink(post)}
                      className="w-full flex items-center space-x-3 px-3 py-2 rounded-lg hover:bg-white/10 text-white transition-all"
                    >
                      <span className="text-lg">🔗</span>
                      <div className="text-left">
                        <div className="font-medium">Copy Link</div>
                        <div className="text-xs text-gray-300">Copy post URL to clipboard</div>
                      </div>
                    </button>

                    {/* Share via Web Share API (if supported) */}
                    {typeof navigator !== 'undefined' && navigator.share && (
                      <button
                        onClick={() => {
                          const postUrl = `${window.location.origin}/posts/${post.id}`
                          navigator.share({
                            title: `Post by ${post.author.displayName}`,
                            text: post.content,
                            url: postUrl
                          })
                          setShowShareMenu(null)
                        }}
                        className="w-full flex items-center space-x-3 px-3 py-2 rounded-lg hover:bg-white/10 text-white transition-all"
                      >
                        <span className="text-lg">📱</span>
                        <div className="text-left">
                          <div className="font-medium">More Options</div>
                          <div className="text-xs text-gray-300">Use system share menu</div>
                        </div>
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Bookmark button */}
            <BookmarkButton
              postId={post.id}
              isBookmarked={post.isBookmarked || false}
              onToggle={(bookmarked) => {
                setPosts(prev => prev.map(p =>
                  p.id === post.id ? { ...p, isBookmarked: bookmarked } : p
                ))
              }}
              size="md"
              showLabel={false}
            />

            {/* Pin button - only show for own posts */}
            {post.author.id === userId && (
              <button
                onClick={async () => {
                  try {
                    const headers: Record<string, string> = {
                      'Content-Type': 'application/json'
                    }
                    if (userId) headers['x-user-id'] = userId

                    const response = await fetch('/api/profile/pin-post', {
                      method: 'POST',
                      headers,
                      body: JSON.stringify({ postId: post.id })
                    })

                    if (response.ok) {
                      const data = await response.json()
                      toast(data.isPinned ? 'Post pinned to your profile!' : 'Post unpinned from your profile', 'success')
                    }
                  } catch (error) {
                    console.error('Failed to pin post:', error)
                  }
                }}
                className="flex items-center gap-2 px-3 py-2 rounded-lg transition-colors bg-white/10 text-gray-300 hover:bg-purple-500/20 hover:text-purple-300"
                title="Pin to profile"
              >
                <span>📌</span>
              </button>
            )}

            {/* Report button - only show for other users' posts */}
            {post.author.id !== userId && (
              <button
                onClick={async () => {
                  const reason = prompt('Select a reason for reporting:\n\n1. SPAM\n2. HARASSMENT\n3. INAPPROPRIATE_CONTENT\n4. COPYRIGHT\n5. IMPERSONATION\n6. VIOLENCE\n7. HATE_SPEECH\n8. SELF_HARM\n9. FALSE_INFORMATION\n10. OTHER\n\nEnter the number (1-10):')
                  if (!reason) return

                  const reasons = ['SPAM', 'HARASSMENT', 'INAPPROPRIATE_CONTENT', 'COPYRIGHT', 'IMPERSONATION', 'VIOLENCE', 'HATE_SPEECH', 'SELF_HARM', 'FALSE_INFORMATION', 'OTHER']
                  const selectedReason = reasons[parseInt(reason) - 1]
                  if (!selectedReason) {
                    toast('Invalid selection', 'error')
                    return
                  }

                  const description = prompt('Additional details (optional):')

                  try {
                    const headers: Record<string, string> = {
                      'Content-Type': 'application/json'
                    }
                    if (userId) headers['x-user-id'] = userId

                    const response = await fetch('/api/reports', {
                      method: 'POST',
                      headers,
                      body: JSON.stringify({
                        postId: post.id,
                        targetId: post.author.id,
                        reason: selectedReason,
                        description
                      })
                    })

                    if (response.ok) {
                      toast('Report submitted successfully. Our team will review it.', 'success')
                    } else {
                      const data = await response.json()
                      toast(data.error || 'Failed to submit report', 'error')
                    }
                  } catch (error) {
                    console.error('Failed to submit report:', error)
                    toast('Failed to submit report', 'error')
                  }
                }}
                className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/10 text-gray-300 hover:bg-red-500/20 hover:text-red-300 transition-colors"
                title="Report post"
              >
                <span>⚠️</span>
              </button>
            )}
            </div>

            {/* Tip button */}
            <TipButton userId={post.author.id} />
          </div>
        </div>
      ))}

      {/* Infinite Scroll Sentinel */}
      {hasMore && (
        <div
          ref={sentinelRef}
          className="h-20 flex items-center justify-center"
        >
          {loading && (
            <div className="flex flex-col items-center gap-3">
              <div className="w-8 h-8 border-4 border-pengu-green border-t-transparent rounded-full animate-spin"></div>
              <p className="text-gray-400 text-sm">Loading more posts...</p>
            </div>
          )}
        </div>
      )}

      {/* End of Feed */}
      {!hasMore && posts.length > 0 && (
        <div className="text-center py-8 text-gray-400">
          <p className="text-sm">You've reached the end of the feed 🐧</p>
        </div>
      )}

      {/* Edit History Modal */}
      {viewingHistory && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white/10 backdrop-blur-lg rounded-2xl border border-white/20 shadow-2xl max-w-2xl w-full max-h-[80vh] overflow-hidden">
            <div className="p-6 border-b border-white/20">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold text-white">📝 Edit History</h3>
                <button
                  onClick={closeEditHistory}
                  className="text-gray-300 hover:text-white text-2xl"
                >
                  ×
                </button>
              </div>
            </div>

            <div className="p-6 max-h-96 overflow-y-auto">
              {loadingHistory ? (
                <div className="text-center text-white">
                  <div className="text-2xl mb-2">⏳</div>
                  <p>Loading edit history...</p>
                </div>
              ) : editHistory.length > 0 ? (
                <div className="space-y-4">
                  {editHistory.map((edit, index) => (
                    <div key={edit.id} className="bg-white/5 rounded-lg p-4 border border-white/10">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-gray-300">Edit #{editHistory.length - index}</span>
                          <span className="text-xs text-gray-500">•</span>
                          <span className="text-sm text-gray-300">
                            {new Date(edit.editedAt).toLocaleString()}
                          </span>
                        </div>
                        <div className="text-xs text-gray-300">
                          by {edit.editor.displayName}
                        </div>
                      </div>

                      <div className="space-y-3">
                        <div>
                          <div className="text-xs text-red-300 mb-1">- Previous:</div>
                          <div className="bg-red-500/10 border border-red-500/20 rounded p-2 text-sm text-gray-200">
                            {edit.previousContent}
                          </div>
                        </div>
                        <div>
                          <div className="text-xs text-green-300 mb-1">+ New:</div>
                          <div className="bg-green-500/10 border border-green-500/20 rounded p-2 text-sm text-gray-200">
                            {edit.newContent}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center text-gray-300 py-8">
                  <div className="text-4xl mb-4">📝</div>
                  <p>No edit history</p>
                  <p className="text-sm">This post hasn't been edited yet</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}