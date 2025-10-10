'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { Post, PostInteractionRequest } from '@/types'
import { useAbstractClient } from '@abstract-foundation/agw-react'
import TipButton from '@/components/TipButton'
import FilteredContent from '@/components/FilteredContent'
import { detectMediaType, getYouTubeEmbedUrl, isYouTubeUrl, getGiphyEmbedUrl, isGiphyUrl } from '@/lib/media-utils'
import { getEffectiveAvatar, getAvatarFallback } from '@/lib/avatar-utils'
import PostInteractionsModal from '@/components/PostInteractionsModal'
import PostEditHistoryModal from '@/components/PostEditHistoryModal'
import { useToast } from '@/components/ui/Toast'

interface PostCardProps {
  post: Post
  currentUserId?: string
  onPostUpdate?: (post: Post) => void
  className?: string
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

function extractUrlsFromContent(content: string): string[] {
  const urlRegex = /(https?:\/\/[^\s]+)/g
  const matches = content.match(urlRegex)
  return matches || []
}

// Helper function to decode HTML entities
function decodeHtmlEntities(text: string): string {
  if (typeof window === 'undefined') return text
  const textarea = document.createElement('textarea')
  textarea.innerHTML = text
  return textarea.value
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
  // Decode HTML entities first (e.g., &lt;3 becomes <3)
  const decodedContent = decodeHtmlEntities(content)

  // Client-side only debug - UPDATED
  if (typeof window !== 'undefined') {
    console.log('🎬 CLIENT-SIDE: RENDER CONTENT WITH EMBEDS CALLED:', decodedContent)
  }

  const urls = extractUrlsFromContent(decodedContent)

  if (typeof window !== 'undefined') {
    console.log('🔗 CLIENT-SIDE: URLs extracted:', urls)
  }

  const mediaUrls = urls.filter(url => isYouTubeUrl(url) || isGiphyUrl(url))

  if (mediaUrls.length === 0) {
    return (
      <p className="text-white text-lg leading-relaxed whitespace-pre-wrap">
        {renderTextWithHashtags(decodedContent)}
      </p>
    )
  }

  // Split content and embed media
  let remainingContent = decodedContent
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
  const { success, error, info } = useToast()
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
  const [isInteracting, setIsInteracting] = useState<string | null>(null)
  const [showShareMenu, setShowShareMenu] = useState(false)
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [showInteractionsModal, setShowInteractionsModal] = useState(false)
  const [interactionsTab, setInteractionsTab] = useState<'likes' | 'shares'>('likes')
  const [showEditHistoryModal, setShowEditHistoryModal] = useState(false)
  const [reactionEmojis, setReactionEmojis] = useState<{ [key: string]: string }>(defaultReactionEmojis)
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

  // Load initial reactions and current user
  useEffect(() => {
    const loadReactions = async () => {
      try {
        const response = await fetch(`/api/posts/${post.id}/reactions`)
        const result = await response.json()
        if (result.success) {
          setReactionCounts(result.data.counts || {})

          // Load user's reactions if we have a current user
          if (currentUser && result.data.reactions) {
            const userReactionTypes = result.data.reactions
              .filter((r: any) => r.userId === currentUser.id)
              .map((r: any) => r.reactionType)
            setUserReactions(new Set(userReactionTypes))
          }
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

    loadCurrentUser().then(() => loadReactions())
  }, [post.id, client?.account?.address, currentUser?.id])

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
    if (!currentUser?.id || isInteracting) {
      console.log('Cannot react:', { hasCurrentUser: !!currentUser, hasUserId: !!currentUser?.id, isInteracting })
      return
    }

    setIsInteracting(reactionType)

    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json'
      }

      if (currentUser.id) {
        headers['x-user-id'] = currentUser.id
      }

      const response = await fetch(`/api/posts/${post.id}/reactions`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ reactionType }),
        credentials: 'include'
      })

      const result = await response.json()

      if (result.success) {
        setReactionCounts(result.data.counts || {})
        // Update user reactions from API response
        setUserReactions(new Set(result.data.userReactions || []))
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
      success('Link copied to clipboard!')
    } catch (error) {
      console.error('Failed to copy link:', error)
      // Fallback for older browsers
      const textArea = document.createElement('textarea')
      textArea.value = postUrl
      document.body.appendChild(textArea)
      textArea.select()
      document.execCommand('copy')
      document.body.removeChild(textArea)
      success('Link copied to clipboard!')
    }
    setShowShareMenu(false)
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

      {/* Emoji Reactions */}
      <div className="mb-4 pb-4 border-b border-white/10">
        <div className="flex items-center flex-wrap gap-2">
          {['HAPPY', 'LAUGH', 'LOVE', 'SHOCK', 'CRY', 'ANGER', 'THUMBS_UP', 'THUMBS_DOWN'].map((reactionType) => {
            const count = reactionCounts[reactionType] || 0
            const userReacted = userReactions.has(reactionType)

            return (
              <button
                key={reactionType}
                onClick={() => handleReaction(reactionType)}
                disabled={isInteracting === reactionType}
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
            <span>{commentsCount}</span>
          </Link>

          {/* Share button with dropdown */}
          <div className="relative" ref={shareMenuRef}>
            <button
              onClick={() => setShowShareMenu(!showShareMenu)}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors ${
                isShared
                  ? 'bg-green-500/20 text-green-300'
                  : 'bg-white/10 text-gray-300 hover:bg-white/20'
              }`}
            >
              <span>🔄</span>
              <span>{sharesCount}</span>
            </button>

            {/* Share dropdown menu */}
            {showShareMenu && (
              <div className="fixed md:absolute bottom-0 md:bottom-full left-0 right-0 md:left-0 md:right-auto mb-0 md:mb-2 w-full md:w-64 bg-gray-900/95 backdrop-blur-lg rounded-t-lg md:rounded-lg border border-white/20 shadow-xl z-[9999]">
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
          <button
            onClick={async () => {
              if (!currentUser?.id) return
              try {
                const response = await fetch('/api/bookmarks', {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                    'x-user-id': currentUser.id
                  },
                  body: JSON.stringify({ postId: post.id })
                })

                if (response.ok) {
                  const data = await response.json()
                  setIsBookmarked(data.isBookmarked)
                }
              } catch (error) {
                console.error('Failed to toggle bookmark:', error)
              }
            }}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors ${
              isBookmarked
                ? 'bg-yellow-500/20 text-yellow-300'
                : 'bg-white/10 text-gray-300 hover:bg-white/20'
            }`}
            title={isBookmarked ? 'Remove bookmark' : 'Bookmark post'}
          >
            <span>🔖</span>
          </button>

          {/* Report button */}
          {currentUser?.id && currentUser.id !== post.author.id && (
            <button
              onClick={async () => {
                const reason = prompt('Select a reason for reporting:\n\n1. SPAM\n2. HARASSMENT\n3. INAPPROPRIATE_CONTENT\n4. COPYRIGHT\n5. IMPERSONATION\n6. VIOLENCE\n7. HATE_SPEECH\n8. SELF_HARM\n9. FALSE_INFORMATION\n10. OTHER\n\nEnter the number (1-10):')
                if (!reason) return

                const reasons = ['SPAM', 'HARASSMENT', 'INAPPROPRIATE_CONTENT', 'COPYRIGHT', 'IMPERSONATION', 'VIOLENCE', 'HATE_SPEECH', 'SELF_HARM', 'FALSE_INFORMATION', 'OTHER']
                const selectedReason = reasons[parseInt(reason) - 1]
                if (!selectedReason) {
                  error('Invalid selection')
                  return
                }

                const description = prompt('Additional details (optional):')

                try {
                  const response = await fetch('/api/reports', {
                    method: 'POST',
                    headers: {
                      'Content-Type': 'application/json',
                      'x-user-id': currentUser.id
                    },
                    body: JSON.stringify({
                      postId: post.id,
                      targetId: post.author.id,
                      reason: selectedReason,
                      description
                    })
                  })

                  if (response.ok) {
                    success('Report submitted successfully. Our team will review it.')
                  } else {
                    const data = await response.json()
                    error(data.error || 'Failed to submit report')
                  }
                } catch (err) {
                  console.error('Failed to submit report:', err)
                  error('Failed to submit report')
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
        <TipButton
          userId={post.author.id}
        />
      </div>

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