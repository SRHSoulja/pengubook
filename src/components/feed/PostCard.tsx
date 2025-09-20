'use client'

import { useState, useEffect } from 'react'
import { Post, PostInteractionRequest } from '@/types'
import { useAbstractClient } from '@abstract-foundation/agw-react'
import TipButton from '@/components/TipButton'

interface PostCardProps {
  post: Post
  currentUserId?: string
  onPostUpdate?: (post: Post) => void
  className?: string
}

export default function PostCard({ post, currentUserId, onPostUpdate, className = '' }: PostCardProps) {
  const { data: client } = useAbstractClient()
  const [isShared, setIsShared] = useState(
    currentUserId ? post.shares?.some(share => share.userId === currentUserId) : false
  )
  const [commentsCount, setCommentsCount] = useState(post._count?.comments || 0)
  const [sharesCount, setSharesCount] = useState(post._count?.shares || 0)
  const [reactionCounts, setReactionCounts] = useState<{ [key: string]: number }>({})
  const [userReactions, setUserReactions] = useState<Set<string>>(new Set())
  const [showComments, setShowComments] = useState(false)
  const [newComment, setNewComment] = useState('')
  const [isSubmittingComment, setIsSubmittingComment] = useState(false)
  const [isInteracting, setIsInteracting] = useState<string | null>(null)

  const formatDate = (date: Date | string) => {
    const postDate = new Date(date)
    const now = new Date()
    const diffInMinutes = Math.floor((now.getTime() - postDate.getTime()) / (1000 * 60))

    if (diffInMinutes < 1) return 'Just now'
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`
    if (diffInMinutes < 10080) return `${Math.floor(diffInMinutes / 1440)}d ago`
    return postDate.toLocaleDateString()
  }

  const getContentTypeEmoji = (contentType: string) => {
    switch (contentType) {
      case 'IMAGE': return '🖼️'
      case 'VIDEO': return '🎥'
      case 'TIP_ANNOUNCEMENT': return '💰'
      case 'ACHIEVEMENT': return '🏆'
      default: return '💬'
    }
  }

  const getVisibilityIcon = (visibility: string) => {
    switch (visibility) {
      case 'FOLLOWERS_ONLY': return '👥'
      case 'PRIVATE': return '🔒'
      default: return '🌍'
    }
  }

  const getReactionEmoji = (reactionType: string) => {
    switch (reactionType) {
      case 'PENGUIN_REACT': return '🐧'
      case 'LAUGH': return '😂'
      case 'CRY': return '😢'
      case 'SHOCK': return '😲'
      case 'ANGER': return '😡'
      case 'THUMBS_UP': return '👍'
      case 'THUMBS_DOWN': return '👎'
      default: return '🐧'
    }
  }

  // Load initial reactions
  useEffect(() => {
    const loadReactions = async () => {
      try {
        const response = await fetch(`/api/posts/${post.id}/reactions`)
        const result = await response.json()
        if (result.success) {
          setReactionCounts(result.data.counts || {})
        }
      } catch (error) {
        console.error('Error loading reactions:', error)
      }
    }

    loadReactions()
  }, [post.id])

  const handleReaction = async (reactionType: string) => {
    if (!client?.account?.address || isInteracting) return

    setIsInteracting(reactionType)

    try {
      const response = await fetch(`/api/posts/${post.id}/reactions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-wallet-address': client.account.address
        },
        body: JSON.stringify({ reactionType })
      })

      const result = await response.json()

      if (result.success) {
        setReactionCounts(result.data.counts || {})

        // Update user reactions
        const newUserReactions = new Set(userReactions)
        if (result.data.toggled) {
          newUserReactions.add(reactionType)
        } else {
          newUserReactions.delete(reactionType)
        }
        setUserReactions(newUserReactions)
      }
    } catch (error) {
      console.error(`Error reacting to post:`, error)
    } finally {
      setIsInteracting(null)
    }
  }

  const handleShare = async () => {
    if (!client?.account?.address || isInteracting) return

    setIsInteracting('share')

    try {
      const response = await fetch(`/api/posts/${post.id}/interactions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-wallet-address': client.account.address
        },
        body: JSON.stringify({ action: 'share' })
      })

      const result = await response.json()

      if (result.success) {
        setIsShared(true)
        setSharesCount(prev => prev + 1)
      }
    } catch (error) {
      console.error('Error sharing post:', error)
    } finally {
      setIsInteracting(null)
    }
  }

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!newComment.trim() || !client?.account?.address || isSubmittingComment) return

    setIsSubmittingComment(true)

    try {
      const response = await fetch(`/api/posts/${post.id}/comments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-wallet-address': client.account.address
        },
        body: JSON.stringify({ content: newComment.trim() })
      })

      const result = await response.json()

      if (result.success) {
        setNewComment('')
        setCommentsCount(prev => prev + 1)
        // Optionally refresh comments here
      }
    } catch (error) {
      console.error('Error adding comment:', error)
    } finally {
      setIsSubmittingComment(false)
    }
  }

  return (
    <div className={`glass-card hover-lift click-scale p-6 group ${className}`}>
      {/* Post header with enhanced styling */}
      <div className="flex items-start space-x-4 mb-4">
        <div className="flex-shrink-0 relative">
          <div className="w-12 h-12 bg-gradient-to-r from-neon-cyan to-neon-purple rounded-full flex items-center justify-center overflow-hidden border-2 border-white/20 hover:border-neon-cyan/50 transition-colors">
            {post.author.avatar ? (
              <img src={post.author.avatar} alt={post.author.displayName} className="w-full h-full object-cover" />
            ) : (
              <span className="text-xl animate-float">🐧</span>
            )}
          </div>
          {/* Online status indicator */}
          <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-neon-green rounded-full border-2 border-gray-900 animate-pulse"></div>
        </div>

        <div className="flex-1">
          <div className="flex items-center space-x-2 mb-1">
            <h3 className="font-display font-semibold text-white group-hover:text-gradient transition-all">
              {post.author.displayName}
            </h3>
            <span className="text-sm text-gray-400 font-mono">@{post.author.username}</span>
            {post.author.profile?.profileVerified && (
              <span className="text-neon-cyan animate-pulse">✓</span>
            )}
          </div>
          <div className="flex items-center space-x-2 text-sm text-gray-400">
            <span className="font-mono">{formatDate(post.createdAt)}</span>
            <span className="text-neon-cyan">•</span>
            <span className="hover:animate-float">{getContentTypeEmoji(post.contentType || 'TEXT')}</span>
            <span className="text-neon-cyan">•</span>
            <span className="hover:animate-float">{getVisibilityIcon(post.visibility)}</span>
            {post.isPromoted && (
              <>
                <span className="text-neon-cyan">•</span>
                <span className="text-yellow-400 font-bold animate-glow">⭐ Promoted</span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Post content */}
      <div className="mb-4">
        <p className="text-white text-lg leading-relaxed whitespace-pre-wrap">
          {post.content}
        </p>

        {/* Media attachments */}
        {post.mediaUrls && post.mediaUrls.length > 0 && (
          <div className="mt-4 space-y-2">
            {post.mediaUrls.map((url, index) => (
              <div key={index} className="rounded-lg overflow-hidden">
                {post.contentType === 'VIDEO' ? (
                  <video
                    src={url}
                    controls
                    className="w-full max-h-96 object-cover"
                    preload="metadata"
                  />
                ) : (
                  <img
                    src={url}
                    alt={`Media ${index + 1}`}
                    className="w-full max-h-96 object-cover"
                  />
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Engagement stats */}
      <div className="flex items-center space-x-6 text-sm text-gray-400 mb-4 pb-4 border-b border-white/10">
        <span>{Object.values(reactionCounts).reduce((sum, count) => sum + count, 0)} reactions</span>
        <span>{commentsCount} {commentsCount === 1 ? 'comment' : 'comments'}</span>
        <span>{sharesCount} {sharesCount === 1 ? 'share' : 'shares'}</span>
      </div>

      {/* Enhanced reaction buttons */}
      <div className="mb-4">
        <div className="flex items-center flex-wrap gap-2">
          {['PENGUIN_REACT', 'LAUGH', 'CRY', 'SHOCK', 'ANGER', 'THUMBS_UP', 'THUMBS_DOWN'].map((reactionType) => (
            <button
              key={reactionType}
              onClick={() => handleReaction(reactionType)}
              disabled={isInteracting === reactionType}
              className={`flex items-center space-x-1 px-3 py-2 rounded-lg transition-all hover-glow click-scale font-medium ${
                userReactions.has(reactionType)
                  ? 'bg-neon-cyan/20 text-neon-cyan border border-neon-cyan/30 shadow-neon-sm'
                  : 'glass-card text-gray-300 hover:text-neon-cyan hover:border-neon-cyan/20'
              }`}
            >
              <span className="text-lg hover:animate-float">{getReactionEmoji(reactionType)}</span>
              <span className="text-sm font-mono">{reactionCounts[reactionType] || 0}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Enhanced action buttons */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          {/* Comment button */}
          <button
            onClick={() => setShowComments(!showComments)}
            className="cyber-button bg-gradient-to-r from-blue-500/20 to-purple-500/20 border-blue-400/50 text-blue-300 hover:text-blue-200"
          >
            <span className="hover:animate-float">💬</span>
            <span className="font-medium">Comment</span>
          </button>

          {/* Share button */}
          <button
            onClick={handleShare}
            disabled={isInteracting === 'share' || isShared}
            className={`cyber-button transition-all ${
              isShared
                ? 'bg-gradient-to-r from-green-500/20 to-emerald-500/20 border-green-400/50 text-green-300'
                : 'bg-gradient-to-r from-gray-500/20 to-gray-600/20 border-gray-400/50 text-gray-300 hover:text-green-300 hover:border-green-400/50'
            }`}
          >
            <span className="hover:animate-float">{isShared ? '✅' : '🔄'}</span>
            <span className="font-medium">{isShared ? 'Shared' : 'Share'}</span>
          </button>
        </div>

        {/* Tip button */}
        <TipButton
          userId={post.author.id}
        />
      </div>

      {/* Comments section */}
      {showComments && (
        <div className="mt-6 pt-6 border-t border-white/10 space-y-4">
          {/* Add comment form */}
          <form onSubmit={handleAddComment} className="flex space-x-3">
            <input
              type="text"
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder="Add a comment..."
              className="flex-1 bg-white/5 text-white placeholder-gray-300 rounded-lg px-4 py-2 border border-white/10 outline-none focus:border-cyan-400"
              maxLength={500}
            />
            <button
              type="submit"
              disabled={!newComment.trim() || isSubmittingComment}
              className={`px-4 py-2 rounded-lg font-medium transition-all ${
                !newComment.trim() || isSubmittingComment
                  ? 'bg-gray-500 text-gray-300 cursor-not-allowed'
                  : 'bg-cyan-500 text-white hover:bg-cyan-600'
              }`}
            >
              {isSubmittingComment ? '...' : 'Post'}
            </button>
          </form>

          {/* Recent comments */}
          {post.comments && post.comments.slice(0, 3).map((comment) => (
            <div key={comment.id} className="flex space-x-3">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-gradient-to-r from-purple-400 to-pink-400 rounded-full flex items-center justify-center overflow-hidden">
                  {(comment.user || comment.author)?.avatar ? (
                    <img src={(comment.user || comment.author)?.avatar} alt={(comment.user || comment.author)?.displayName} className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-sm">🐧</span>
                  )}
                </div>
              </div>
              <div className="flex-1">
                <div className="bg-white/5 rounded-lg p-3">
                  <div className="flex items-center space-x-2 mb-1">
                    <span className="font-medium text-white text-sm">{(comment.user || comment.author)?.displayName}</span>
                    <span className="text-xs text-gray-400">{formatDate(comment.createdAt)}</span>
                  </div>
                  <p className="text-gray-200 text-sm">{comment.content}</p>
                </div>
              </div>
            </div>
          ))}

          {/* Show more comments */}
          {commentsCount > 3 && (
            <button className="text-cyan-400 text-sm hover:text-cyan-300">
              View all {commentsCount} comments
            </button>
          )}
        </div>
      )}
    </div>
  )
}