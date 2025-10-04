'use client'

import { useState, useEffect, useRef } from 'react'
import { Post, PostInteractionRequest } from '@/types'
import { useAbstractClient } from '@abstract-foundation/agw-react'
import TipButton from '@/components/TipButton'
import BookmarkButton from '@/components/BookmarkButton'
import ReportButton from '@/components/ReportButton'
import FilteredContent from '@/components/FilteredContent'
import { detectMediaType, getYouTubeEmbedUrl, isYouTubeUrl, getGiphyEmbedUrl, isGiphyUrl } from '@/lib/media-utils'
import { getEffectiveAvatar, getAvatarFallback } from '@/lib/avatar-utils'
import PostInteractionsModal from '@/components/PostInteractionsModal'
import PostEditHistoryModal from '@/components/PostEditHistoryModal'

interface PostCardProps {
  post: Post
  currentUserId?: string
  onPostUpdate?: (post: Post) => void
  className?: string
}

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
        className="text-pengu-green hover:text-pengu-400 cursor-pointer font-semibold hover:underline transition-colors"
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

function renderContentWithEmbeds(content: string): JSX.Element {
  // Client-side only debug - UPDATED
  if (typeof window !== 'undefined') {
    console.log('🎬 CLIENT-SIDE: RENDER CONTENT WITH EMBEDS CALLED:', content)
  }

  const urls = extractUrlsFromContent(content)

  if (typeof window !== 'undefined') {
    console.log('🔗 CLIENT-SIDE: URLs extracted:', urls)
  }

  const mediaUrls = urls.filter(url => isYouTubeUrl(url) || isGiphyUrl(url))

  if (mediaUrls.length === 0) {
    return (
      <p className="text-white text-lg leading-relaxed whitespace-pre-wrap">
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
          <p key={`text-${index}`} className="text-white text-lg leading-relaxed whitespace-pre-wrap">
            {renderTextWithHashtags(textBefore)}
          </p>
        )
      }

      // Add YouTube embed
      if (isYouTubeUrl(url)) {
        const embedUrl = getYouTubeEmbedUrl(url)
        if (embedUrl) {
          elements.push(
            <div key={`youtube-${index}`} className="w-full aspect-video my-4">
              <iframe
                src={embedUrl}
                className="w-full h-full rounded-lg"
                sandbox="allow-scripts allow-same-origin allow-presentation"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                title={`YouTube video ${index + 1}`}
              />
            </div>
          )
        }
      }

      // Add Giphy embed
      else if (isGiphyUrl(url)) {
        const embedUrl = getGiphyEmbedUrl(url)
        if (embedUrl) {
          elements.push(
            <div key={`giphy-${index}`} className="w-full my-4">
              <iframe
                src={embedUrl}
                width="100%"
                height="270"
                className="rounded-lg"
                sandbox="allow-scripts allow-same-origin"
                allowFullScreen
                title={`Giphy ${index + 1}`}
              />
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
      <p key="text-end" className="text-white text-lg leading-relaxed whitespace-pre-wrap">
        {renderTextWithHashtags(remainingContent)}
      </p>
    )
  }

  return <div>{elements}</div>
}

export default function PostCard({ post, currentUserId, onPostUpdate, className = '' }: PostCardProps) {
  const { data: client } = useAbstractClient()
  const [isShared, setIsShared] = useState(
    currentUserId ? post.shares?.some(share => share.userId === currentUserId) : false
  )
  const [isBookmarked, setIsBookmarked] = useState(
    currentUserId ? (post as any).userInteractions?.hasBookmarked || false : false
  )
  const [commentsCount, setCommentsCount] = useState(post._count?.comments || 0)
  const [sharesCount, setSharesCount] = useState(post._count?.shares || 0)
  const [reactionCounts, setReactionCounts] = useState<{ [key: string]: number }>({})
  const [userReactions, setUserReactions] = useState<Set<string>>(new Set())
  const [showComments, setShowComments] = useState(false)
  const [newComment, setNewComment] = useState('')
  const [isSubmittingComment, setIsSubmittingComment] = useState(false)
  const [isInteracting, setIsInteracting] = useState<string | null>(null)
  const [showShareMenu, setShowShareMenu] = useState(false)
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [showInteractionsModal, setShowInteractionsModal] = useState(false)
  const [interactionsTab, setInteractionsTab] = useState<'likes' | 'shares'>('likes')
  const [showEditHistoryModal, setShowEditHistoryModal] = useState(false)
  const shareMenuRef = useRef<HTMLDivElement>(null)

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

  // Load initial reactions and current user
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

    const loadCurrentUser = async () => {
      if (client?.account?.address) {
        try {
          const response = await fetch(`/api/users/profile?walletAddress=${client.account.address}`)
          const result = await response.json()
          if (result.success) {
            setCurrentUser(result.user)
          }
        } catch (error) {
          console.error('Error loading current user:', error)
        }
      }
    }

    loadReactions()
    loadCurrentUser()
  }, [post.id, client?.account?.address])

  // Handle click outside to close share menu
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (shareMenuRef.current && !shareMenuRef.current.contains(event.target as Node)) {
        setShowShareMenu(false)
      }
    }

    if (showShareMenu) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showShareMenu])

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
        setShowShareMenu(false)
      }
    } catch (error) {
      console.error('Error sharing post:', error)
    } finally {
      setIsInteracting(null)
    }
  }

  const handleShareToX = () => {
    const postUrl = `${window.location.origin}/posts/${post.id}`
    const text = `Check out this post by ${post.author.displayName}: "${post.content.slice(0, 100)}${post.content.length > 100 ? '...' : ''}"

via @PeBloq`
    const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(postUrl)}`
    const newWindow = window.open(twitterUrl, '_blank', 'width=550,height=420,noopener,noreferrer')
    if (newWindow) newWindow.opener = null // Extra security for older browsers
    setShowShareMenu(false)
  }

  const handleCopyLink = async () => {
    const postUrl = `${window.location.origin}/posts/${post.id}`
    try {
      await navigator.clipboard.writeText(postUrl)
      alert('Link copied to clipboard!')
    } catch (error) {
      console.error('Failed to copy link:', error)
      // Fallback for older browsers
      const textArea = document.createElement('textarea')
      textArea.value = postUrl
      document.body.appendChild(textArea)
      textArea.select()
      document.execCommand('copy')
      document.body.removeChild(textArea)
      alert('Link copied to clipboard!')
    }
    setShowShareMenu(false)
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
            {getEffectiveAvatar(post.author) ? (
              <img src={getEffectiveAvatar(post.author)!} alt={post.author.displayName} className="w-full h-full object-cover" />
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
            <span className="text-sm text-gray-300 font-mono">@{post.author.username}</span>
            {post.author.profile?.profileVerified && (
              <span className="text-neon-cyan animate-pulse">✓</span>
            )}
          </div>
          <div className="flex items-center space-x-2 text-sm text-gray-300">
            <span className="font-mono">{formatDate(post.createdAt)}</span>
            {post.updatedAt && new Date(post.updatedAt).getTime() !== new Date(post.createdAt).getTime() && (
              <>
                <span className="text-neon-cyan">•</span>
                <button
                  onClick={() => setShowEditHistoryModal(true)}
                  className="text-gray-300 hover:text-cyan-400 transition-colors cursor-pointer italic"
                  title="View edit history"
                >
                  (edited)
                </button>
              </>
            )}
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
        <FilteredContent
          shouldWarn={post.contentFilter?.shouldWarn || false}
          matchedPhrases={post.contentFilter?.matchedPhrases || []}
          contentType="post"
        >
          {renderContentWithEmbeds(post.content)}

          {/* Media attachments */}
          {post.mediaUrls && post.mediaUrls.length > 0 && (
            <div className="mt-4 space-y-2">
              {post.mediaUrls.map((url, index) => {
                const mediaType = detectMediaType(url)

                return (
                  <div key={index} className="rounded-lg overflow-hidden">
                    {mediaType === 'youtube' && (
                      <div className="w-full aspect-video">
                        <iframe
                          src={getYouTubeEmbedUrl(url) || ''}
                          className="w-full h-full rounded-lg"
                          sandbox="allow-scripts allow-same-origin allow-presentation"
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                          allowFullScreen
                          title={`YouTube video ${index + 1}`}
                        />
                      </div>
                    )}

                    {mediaType === 'video' && (
                      <video
                        src={url}
                        controls
                        className="w-full max-h-96 object-cover"
                        preload="metadata"
                      />
                    )}

                    {mediaType === 'image' && (
                      <img
                        src={url}
                        alt={`Media ${index + 1}`}
                        className="w-full max-h-96 object-cover"
                      />
                    )}

                    {mediaType === 'link' && (
                      <div className="bg-white/10 border border-white/20 rounded-lg p-4">
                        <a
                          href={url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-cyan-400 hover:text-cyan-300 break-all"
                        >
                          {url}
                        </a>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </FilteredContent>
      </div>

      {/* Engagement stats */}
      <div className="flex items-center space-x-6 text-sm text-gray-300 mb-4 pb-4 border-b border-white/10">
        <button
          onClick={() => {
            setInteractionsTab('likes')
            setShowInteractionsModal(true)
          }}
          className="hover:text-pink-400 transition-colors cursor-pointer"
        >
          {Object.values(reactionCounts).reduce((sum, count) => sum + count, 0)} reactions
        </button>
        <span>{commentsCount} {commentsCount === 1 ? 'comment' : 'comments'}</span>
        <button
          onClick={() => {
            setInteractionsTab('shares')
            setShowInteractionsModal(true)
          }}
          className="hover:text-blue-400 transition-colors cursor-pointer"
        >
          {sharesCount} {sharesCount === 1 ? 'share' : 'shares'}
        </button>
      </div>

      {/* Enhanced reaction buttons - Pengu brand colors */}
      <div className="mb-4">
        <div className="flex items-center flex-wrap gap-2">
          {['PENGUIN_REACT', 'LAUGH', 'CRY', 'SHOCK', 'ANGER', 'THUMBS_UP', 'THUMBS_DOWN'].map((reactionType) => (
            <button
              key={reactionType}
              onClick={() => handleReaction(reactionType)}
              disabled={isInteracting === reactionType}
              className={`flex items-center space-x-1 px-3 py-2 rounded-lg transition-all hover-glow click-scale font-medium ${
                userReactions.has(reactionType)
                  ? 'bg-pengu-green/20 text-pengu-green border border-pengu-green/30 shadow-neon-sm'
                  : 'glass-card text-gray-300 hover:text-pengu-green hover:border-pengu-green/20'
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

          {/* Share button with dropdown */}
          <div className="relative" ref={shareMenuRef}>
            <button
              onClick={() => setShowShareMenu(!showShareMenu)}
              className="cyber-button bg-gradient-to-r from-gray-500/20 to-gray-600/20 border-gray-400/50 text-gray-300 hover:text-green-300 hover:border-green-400/50"
            >
              <span className="hover:animate-float">📤</span>
              <span className="font-medium">Share</span>
            </button>

            {/* Share dropdown menu */}
            {showShareMenu && (
              <div className="absolute bottom-full left-0 mb-2 w-64 bg-gray-900/95 backdrop-blur-lg rounded-lg border border-white/20 shadow-xl z-[9999]">
                <div className="p-3 space-y-2">
                  {/* Internal share */}
                  <button
                    onClick={handleShare}
                    disabled={isInteracting === 'share' || isShared}
                    className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg transition-all ${
                      isShared
                        ? 'bg-green-500/20 text-green-300 cursor-not-allowed'
                        : 'hover:bg-white/10 text-white'
                    }`}
                  >
                    <span className="text-lg">{isShared ? '✅' : '🔄'}</span>
                    <div className="text-left">
                      <div className="font-medium">{isShared ? 'Shared to Feed' : 'Share to Feed'}</div>
                      <div className="text-xs text-gray-300">Share within PeBloq</div>
                    </div>
                  </button>

                  {/* Share to X (Twitter) - only if user has linked X account */}
                  {currentUser?.twitterHandle && (
                    <button
                      onClick={handleShareToX}
                      className="w-full flex items-center space-x-3 px-3 py-2 rounded-lg hover:bg-white/10 text-white transition-all"
                    >
                      <span className="text-lg">🐦</span>
                      <div className="text-left">
                        <div className="font-medium">Share to X</div>
                        <div className="text-xs text-gray-300">Post to @{currentUser.twitterHandle}</div>
                      </div>
                    </button>
                  )}

                  {/* Copy link */}
                  <button
                    onClick={handleCopyLink}
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
                        setShowShareMenu(false)
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
            isBookmarked={isBookmarked}
            onToggle={setIsBookmarked}
            showLabel={true}
          />

          {/* Report button */}
          <ReportButton
            postId={post.id}
            targetName={`Post by ${post.author.displayName}`}
            size="md"
            className="ml-2"
          />
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
                  {getEffectiveAvatar(comment.user || comment.author) ? (
                    <img src={getEffectiveAvatar(comment.user || comment.author)!} alt={(comment.user || comment.author)?.displayName} className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-sm">🐧</span>
                  )}
                </div>
              </div>
              <div className="flex-1">
                <div className="bg-white/5 rounded-lg p-3">
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center space-x-2">
                      <span className="font-medium text-white text-sm">{(comment.user || comment.author)?.displayName}</span>
                      <span className="text-xs text-gray-300">{formatDate(comment.createdAt)}</span>
                    </div>
                    {(comment.user || comment.author)?.id !== currentUserId && (
                      <ReportButton
                        commentId={comment.id}
                        targetName={`Comment by ${(comment.user || comment.author)?.displayName}`}
                        size="sm"
                      />
                    )}
                  </div>
                  <FilteredContent
                    shouldWarn={(comment as any).contentFilter?.shouldWarn || false}
                    matchedPhrases={(comment as any).contentFilter?.matchedPhrases || []}
                    contentType="comment"
                  >
                    <p className="text-gray-200 text-sm">{comment.content}</p>
                  </FilteredContent>
                </div>
              </div>
            </div>
          ))}

          {/* Show more comments */}
          {commentsCount > 3 && (
            <button className="text-pengu-green text-sm hover:text-pengu-400 min-h-[44px] min-w-[44px] py-2 px-3">
              View all {commentsCount} comments
            </button>
          )}
        </div>
      )}

      {/* Post Interactions Modal */}
      <PostInteractionsModal
        postId={post.id}
        isOpen={showInteractionsModal}
        onClose={() => setShowInteractionsModal(false)}
        initialTab={interactionsTab}
      />

      {/* Post Edit History Modal */}
      <PostEditHistoryModal
        postId={post.id}
        isOpen={showEditHistoryModal}
        onClose={() => setShowEditHistoryModal(false)}
      />
    </div>
  )
}