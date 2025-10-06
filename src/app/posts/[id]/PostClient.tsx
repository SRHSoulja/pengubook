'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/providers/AuthProvider'
import Navbar from '@/components/Navbar'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import ReportButton from '@/components/ReportButton'

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
    avatar: string
    walletAddress?: string
    level: number
    isAdmin: boolean
    discordName?: string
    twitterHandle?: string
  }
  likes: Array<{
    userId: string
    user: {
      id: string
      username: string
      displayName: string
      avatar: string
    }
    createdAt: string
  }>
  comments: Array<{
    id: string
    content: string
    createdAt: string
    updatedAt: string
    author: {
      id: string
      username: string
      displayName: string
      avatar: string
      level: number
      isAdmin: boolean
    }
  }>
  shares: Array<{
    id: string
    userId: string
    createdAt: string
  }>
  stats: {
    likes: number
    comments: number
    shares: number
  }
}

export default function PostClient({ params }: { params: { id: string } }) {
  const { user, isAuthenticated } = useAuth()
  const router = useRouter()
  const [post, setPost] = useState<Post | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [newComment, setNewComment] = useState('')
  const [submittingComment, setSubmittingComment] = useState(false)
  const [showEditHistory, setShowEditHistory] = useState(false)
  const [editHistory, setEditHistory] = useState<any[]>([])
  const [loadingHistory, setLoadingHistory] = useState(false)
  const [reactionEmojis, setReactionEmojis] = useState<{ [key: string]: string }>(defaultReactionEmojis)
  const [reactions, setReactions] = useState<{ counts: { [key: string]: number }, userReactions: Set<string> }>({ counts: {}, userReactions: new Set() })
  const [reactingTo, setReactingTo] = useState(false)
  const [isBookmarked, setIsBookmarked] = useState(false)
  const [showReportModal, setShowReportModal] = useState(false)
  const [reportReason, setReportReason] = useState('')
  const [submittingReport, setSubmittingReport] = useState(false)

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
      }
    }
    loadReactionEmojis()
  }, [])

  useEffect(() => {
    fetchPost()
  }, [params.id])

  // Load reactions for this post
  useEffect(() => {
    if (post) {
      fetchReactions()
      checkBookmarkStatus()
    }
  }, [post?.id])

  const checkBookmarkStatus = async () => {
    if (!user) return

    try {
      const headers: Record<string, string> = {}
      if (user.walletAddress) headers['x-wallet-address'] = user.walletAddress
      if (user.id) headers['x-user-id'] = user.id

      const response = await fetch('/api/bookmarks', {
        headers,
        credentials: 'include'
      })

      const data = await response.json()
      if (data.success) {
        const bookmarked = data.bookmarks.some((b: any) => b.post?.id === params.id)
        setIsBookmarked(bookmarked)
      }
    } catch (error) {
      console.error('Failed to check bookmark status:', error)
    }
  }

  const toggleBookmark = async () => {
    if (!user) {
      alert('Please sign in to bookmark posts')
      return
    }

    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json'
      }
      if (user.walletAddress) headers['x-wallet-address'] = user.walletAddress
      if (user.id) headers['x-user-id'] = user.id

      const response = await fetch('/api/bookmarks', {
        method: 'POST',
        headers,
        body: JSON.stringify({ postId: params.id }),
        credentials: 'include'
      })

      const data = await response.json()
      if (data.success) {
        setIsBookmarked(data.isBookmarked)
      } else {
        alert(data.error || 'Failed to toggle bookmark')
      }
    } catch (error) {
      console.error('Failed to toggle bookmark:', error)
      alert('Failed to toggle bookmark')
    }
  }

  const submitReport = async () => {
    if (!user || !reportReason.trim()) return

    try {
      setSubmittingReport(true)
      const headers: Record<string, string> = {
        'Content-Type': 'application/json'
      }
      if (user.walletAddress) headers['x-wallet-address'] = user.walletAddress
      if (user.id) headers['x-user-id'] = user.id

      const response = await fetch('/api/reports', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          reportedContentId: params.id,
          reportedContentType: 'POST',
          reason: reportReason
        }),
        credentials: 'include'
      })

      const data = await response.json()
      if (data.success) {
        alert('Report submitted successfully. Our team will review it.')
        setShowReportModal(false)
        setReportReason('')
      } else {
        alert(data.error || 'Failed to submit report')
      }
    } catch (error) {
      console.error('Failed to submit report:', error)
      alert('Failed to submit report')
    } finally {
      setSubmittingReport(false)
    }
  }

  const fetchPost = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/posts/${params.id}`)
      const data = await response.json()

      if (response.ok) {
        setPost(data.post)
      } else {
        setError(data.error || 'Failed to load post')
      }
    } catch (error) {
      console.error('Failed to fetch post:', error)
      setError('Failed to load post')
    } finally {
      setLoading(false)
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

  const fetchEditHistory = async () => {
    if (!post) return

    try {
      setLoadingHistory(true)
      const response = await fetch(`/api/posts/${params.id}/edits`)
      const data = await response.json()

      if (response.ok) {
        setEditHistory(data.edits || [])
        setShowEditHistory(true)
      } else {
        alert(data.error || 'Failed to load edit history')
      }
    } catch (error) {
      console.error('Failed to fetch edit history:', error)
      alert('Failed to load edit history')
    } finally {
      setLoadingHistory(false)
    }
  }

  const fetchReactions = async () => {
    try {
      const response = await fetch(`/api/posts/${params.id}/reactions`)
      const data = await response.json()

      if (data.success) {
        const userReactionTypes = new Set<string>()
        if (user) {
          data.data.reactions.forEach((r: any) => {
            if (r.userId === user.id) {
              userReactionTypes.add(r.reactionType)
            }
          })
        }
        setReactions({
          counts: data.data.counts,
          userReactions: userReactionTypes
        })
      }
    } catch (error) {
      console.error('Failed to fetch reactions:', error)
    }
  }

  const handleReaction = async (reactionType: string) => {
    if (!user) {
      alert('Please sign in to react to posts')
      return
    }

    try {
      setReactingTo(true)

      const headers: Record<string, string> = {
        'Content-Type': 'application/json'
      }

      if (user.walletAddress) {
        headers['x-wallet-address'] = user.walletAddress
      }
      if (user.id) {
        headers['x-user-id'] = user.id
      }

      const response = await fetch(`/api/posts/${params.id}/reactions`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ reactionType }),
        credentials: 'include'
      })

      const data = await response.json()

      if (data.success) {
        // Update local state
        const userReacted = reactions.userReactions.has(reactionType)
        const newUserReactions = new Set(reactions.userReactions)

        if (userReacted) {
          newUserReactions.delete(reactionType)
        } else {
          newUserReactions.add(reactionType)
        }

        setReactions({
          counts: data.data.counts,
          userReactions: newUserReactions
        })
      } else {
        alert(data.error || 'Failed to react')
      }
    } catch (error) {
      console.error('Failed to react:', error)
      alert('Failed to react')
    } finally {
      setReactingTo(false)
    }
  }

  const submitComment = async () => {
    if (!user || !newComment.trim()) return

    try {
      setSubmittingComment(true)
      const headers: Record<string, string> = {
        'Content-Type': 'application/json'
      }

      if (user.walletAddress) {
        headers['x-wallet-address'] = user.walletAddress
      }
      if (user.id) {
        headers['x-user-id'] = user.id
      }

      const response = await fetch(`/api/posts/${params.id}/comments`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ content: newComment }),
        credentials: 'include'
      })

      const data = await response.json()

      if (response.ok) {
        setNewComment('')
        fetchPost() // Refresh post to show new comment
      } else {
        alert(data.error || 'Failed to post comment')
      }
    } catch (error) {
      console.error('Failed to submit comment:', error)
      alert('Failed to post comment')
    } finally {
      setSubmittingComment(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-900 via-purple-900 to-indigo-900">
        <Navbar />
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-4xl mx-auto">
            <div className="bg-white/10 backdrop-blur-lg rounded-2xl border border-white/20 p-6 animate-pulse">
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
                <div className="h-4 bg-white/20 rounded w-3/4"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (error || !post) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-900 via-purple-900 to-indigo-900">
        <Navbar />
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-4xl mx-auto text-center text-white">
            <div className="text-6xl mb-4">🐧</div>
            <h1 className="text-2xl font-bold mb-4">Post Not Found</h1>
            <p className="text-gray-300 mb-6">{error || 'This post may have been deleted or moved.'}</p>
            <Link href="/feed" className="bg-cyan-500 text-white px-6 py-3 rounded-xl hover:bg-cyan-600 transition-colors">
              Back to Feed
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
          {/* Back Button */}
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 text-white/70 hover:text-white mb-6 transition-colors"
          >
            <span>←</span>
            <span>Back</span>
          </button>

          {/* Post */}
          <div className="bg-white/10 backdrop-blur-lg rounded-2xl border border-white/20 p-6 mb-8">
            {/* Post Header */}
            <div className="flex items-center gap-3 mb-4">
              <Link href={`/profile/${post.author.walletAddress || post.author.id}`} className="flex items-center gap-3 hover:opacity-80">
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
                    {post.author.isAdmin && (
                      <span className="text-blue-400 text-sm">✓</span>
                    )}
                    <span className="px-2 py-1 bg-yellow-500/20 text-yellow-300 rounded-full text-xs">
                      Level {post.author.level}
                    </span>
                    {post.isPromoted && (
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
                        <button
                          onClick={fetchEditHistory}
                          disabled={loadingHistory}
                          className="text-yellow-400 hover:text-yellow-300 underline transition-colors"
                        >
                          {loadingHistory ? 'Loading...' : `Edited ${formatTimeAgo(post.updatedAt)}`}
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </Link>

              {/* Edit Button for Post Owner */}
              {user && user.id === post.author.id && (
                <button className="text-gray-300 hover:text-white p-2 rounded-lg hover:bg-white/10 transition-colors">
                  <span>✏️</span>
                </button>
              )}
            </div>

            {/* Post Content */}
            <div className="mb-6">
              <p className="text-gray-200 whitespace-pre-wrap leading-relaxed text-lg">
                {renderTextWithHashtags(post.content)}
              </p>
            </div>

            {/* Post Images */}
            {post.mediaUrls && post.mediaUrls.length > 0 && (
              <div className="mb-6">
                <div className={`grid gap-2 ${
                  post.mediaUrls.length === 1 ? 'grid-cols-1' :
                  post.mediaUrls.length === 2 ? 'grid-cols-2' :
                  'grid-cols-2 md:grid-cols-3'
                }`}>
                  {post.mediaUrls.map((image, index) => (
                    <img
                      key={index}
                      src={image}
                      alt=""
                      className="w-full h-64 object-cover rounded-lg"
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Emoji Reactions */}
            <div className="mb-4 pb-4 border-b border-white/10">
              <div className="flex items-center flex-wrap gap-2">
                {['HAPPY', 'LAUGH', 'LOVE', 'SHOCK', 'CRY', 'ANGER', 'THUMBS_UP', 'THUMBS_DOWN'].map((reactionType) => {
                  const count = reactions.counts[reactionType] || 0
                  const userReacted = reactions.userReactions.has(reactionType)

                  return (
                    <button
                      key={reactionType}
                      onClick={() => handleReaction(reactionType)}
                      disabled={reactingTo}
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

            {/* Post Stats */}
            <div className="flex items-center gap-6 pt-4 border-t border-white/10 text-gray-300">
              <div className="flex items-center gap-2">
                <span>💬</span>
                <span>{post.stats.comments} comments</span>
              </div>
              <div className="flex items-center gap-2">
                <span>🔄</span>
                <span>{post.stats.shares} shares</span>
              </div>
              <div className="flex-1"></div>
              {isAuthenticated && user && (
                <>
                  <button
                    onClick={toggleBookmark}
                    className="flex items-center gap-2 text-gray-300 hover:text-cyan-400 transition-colors"
                    title={isBookmarked ? 'Remove bookmark' : 'Bookmark post'}
                  >
                    <span className="text-lg">🔖</span>
                    <span className="text-sm">{isBookmarked ? 'Saved' : 'Save'}</span>
                  </button>
                  {post.author.id !== user.id && (
                    <button
                      onClick={() => setShowReportModal(true)}
                      className="flex items-center gap-2 text-gray-300 hover:text-red-400 transition-colors"
                      title="Report post"
                    >
                      <span className="text-lg">⚠️</span>
                      <span className="text-sm">Report</span>
                    </button>
                  )}
                </>
              )}
              <span className="text-xs capitalize">
                {post.visibility.toLowerCase().replace('_', ' ')}
              </span>
            </div>
          </div>

          {/* Edit History Modal */}
          {showEditHistory && (
            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
              <div className="bg-white/10 backdrop-blur-lg rounded-2xl border border-white/20 p-6 max-w-4xl w-full max-h-[80vh] overflow-y-auto">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-bold text-white">Edit History</h2>
                  <button
                    onClick={() => setShowEditHistory(false)}
                    className="text-gray-300 hover:text-white p-2 rounded-lg hover:bg-white/10 transition-colors"
                  >
                    ✕
                  </button>
                </div>

                {editHistory.length === 0 ? (
                  <div className="text-center text-gray-300 py-8">
                    <div className="text-3xl mb-2">📝</div>
                    <p>No edit history available</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {editHistory.map((edit, index) => (
                      <div key={edit.id} className="bg-white/5 rounded-xl p-4">
                        <div className="flex items-center gap-3 mb-3">
                          <div className="w-8 h-8 bg-gradient-to-br from-cyan-400 to-blue-500 rounded-lg flex items-center justify-center text-white font-bold text-sm">
                            {edit.editor.avatar ? (
                              <img
                                src={edit.editor.avatar}
                                alt={edit.editor.displayName}
                                className="w-full h-full rounded-lg object-cover"
                              />
                            ) : (
                              edit.editor.displayName.charAt(0)
                            )}
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-white">{edit.editor.displayName}</span>
                              <span className="text-gray-300 text-sm">@{edit.editor.username}</span>
                              {edit.editor.isAdmin && (
                                <span className="text-blue-400 text-sm">✓</span>
                              )}
                              <span className="text-gray-300 text-sm">•</span>
                              <span className="text-gray-300 text-sm">{formatTimeAgo(edit.editedAt)}</span>
                            </div>
                          </div>
                        </div>

                        <div className="space-y-3">
                          <div>
                            <h4 className="text-red-400 font-medium mb-2">Previous Content:</h4>
                            <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3">
                              <p className="text-gray-200 whitespace-pre-wrap">{edit.previousContent}</p>
                            </div>
                          </div>
                          <div>
                            <h4 className="text-green-400 font-medium mb-2">New Content:</h4>
                            <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-3">
                              <p className="text-gray-200 whitespace-pre-wrap">{edit.newContent}</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Comments Section */}
          <div className="bg-white/10 backdrop-blur-lg rounded-2xl border border-white/20 p-6">
            <h2 className="text-xl font-bold text-white mb-6">Comments ({post.stats.comments})</h2>

            {/* Add Comment */}
            {isAuthenticated && user && (
              <div className="mb-6 p-4 bg-white/5 rounded-xl">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-cyan-400 to-blue-500 rounded-lg flex items-center justify-center text-white font-bold text-sm">
                    {user.avatar ? (
                      <img
                        src={user.avatar}
                        alt={user.displayName}
                        className="w-full h-full rounded-lg object-cover"
                      />
                    ) : (
                      user.displayName?.charAt(0) || 'P'
                    )}
                  </div>
                  <div className="flex-1">
                    <textarea
                      value={newComment}
                      onChange={(e) => setNewComment(e.target.value)}
                      placeholder="Share your thoughts..."
                      rows={3}
                      className="w-full px-3 py-2 rounded-lg bg-white/10 border border-white/20 text-white placeholder-gray-300 focus:outline-none focus:border-cyan-400 resize-none"
                    />
                    <div className="flex justify-end mt-2">
                      <button
                        onClick={submitComment}
                        disabled={!newComment.trim() || submittingComment}
                        className="bg-cyan-500 hover:bg-cyan-600 disabled:bg-gray-500 disabled:cursor-not-allowed text-white px-4 py-2 rounded-lg transition-colors"
                      >
                        {submittingComment ? 'Posting...' : 'Comment'}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Comments List */}
            <div className="space-y-4">
              {post.comments.length === 0 ? (
                <div className="text-center text-gray-300 py-8">
                  <div className="text-3xl mb-2">💭</div>
                  <p>No comments yet. Be the first to share your thoughts!</p>
                </div>
              ) : (
                post.comments.map((comment) => (
                  <div key={comment.id} className="bg-white/5 rounded-xl p-4">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 bg-gradient-to-br from-cyan-400 to-blue-500 rounded-lg flex items-center justify-center text-white font-bold text-sm">
                        {comment.author.avatar ? (
                          <img
                            src={comment.author.avatar}
                            alt={comment.author.displayName}
                            className="w-full h-full rounded-lg object-cover"
                          />
                        ) : (
                          comment.author.displayName.charAt(0)
                        )}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-semibold text-white">{comment.author.displayName}</span>
                          <span className="text-gray-300 text-sm">@{comment.author.username}</span>
                          {comment.author.isAdmin && (
                            <span className="text-blue-400 text-sm">✓</span>
                          )}
                          <span className="px-2 py-1 bg-yellow-500/20 text-yellow-300 rounded-full text-xs">
                            Level {comment.author.level}
                          </span>
                          <span className="text-gray-300 text-sm">•</span>
                          <span className="text-gray-300 text-sm">{formatTimeAgo(comment.createdAt)}</span>
                        </div>
                        <p className="text-gray-200 whitespace-pre-wrap">{comment.content}</p>
                        <div className="flex items-center gap-4 mt-2">
                          <button className="text-gray-300 hover:text-red-300 text-sm transition-colors">
                            ❤️ 0
                          </button>
                          <button className="text-gray-300 hover:text-white text-sm transition-colors">
                            Reply
                          </button>
                          {comment.author.id !== user?.id && (
                            <ReportButton
                              commentId={comment.id}
                              targetName={`Comment by ${comment.author.displayName}`}
                              size="sm"
                            />
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Report Modal */}
          {showReportModal && (
            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
              <div className="bg-white/10 backdrop-blur-lg rounded-2xl border border-white/20 p-6 max-w-md w-full">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-bold text-white">Report Post</h2>
                  <button
                    onClick={() => setShowReportModal(false)}
                    className="text-gray-300 hover:text-white p-2 rounded-lg hover:bg-white/10 transition-colors"
                  >
                    ✕
                  </button>
                </div>

                <div className="mb-6">
                  <label className="block text-white mb-3 font-medium">Why are you reporting this post?</label>
                  <div className="space-y-2">
                    {[
                      'Spam or misleading',
                      'Harassment or hate speech',
                      'Violence or dangerous content',
                      'Inappropriate content',
                      'Copyright violation',
                      'Other'
                    ].map((reason) => (
                      <button
                        key={reason}
                        onClick={() => setReportReason(reason)}
                        className={`w-full text-left px-4 py-3 rounded-lg transition-all ${
                          reportReason === reason
                            ? 'bg-red-500/20 text-red-300 border border-red-500/30'
                            : 'bg-white/5 text-gray-300 hover:bg-white/10 border border-transparent'
                        }`}
                      >
                        {reason}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => {
                      setShowReportModal(false)
                      setReportReason('')
                    }}
                    className="flex-1 px-4 py-3 bg-white/10 text-white rounded-lg hover:bg-white/20 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={submitReport}
                    disabled={!reportReason || submittingReport}
                    className="flex-1 px-4 py-3 bg-red-500 text-white rounded-lg hover:bg-red-600 disabled:bg-gray-500 disabled:cursor-not-allowed transition-colors"
                  >
                    {submittingReport ? 'Submitting...' : 'Submit Report'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}