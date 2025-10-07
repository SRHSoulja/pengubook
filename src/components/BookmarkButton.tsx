'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/providers/AuthProvider'

interface BookmarkButtonProps {
  postId: string
  isBookmarked: boolean
  onToggle?: (isBookmarked: boolean) => void
  size?: 'sm' | 'md' | 'lg'
  showLabel?: boolean
}

export default function BookmarkButton({
  postId,
  isBookmarked,
  onToggle,
  size = 'md',
  showLabel = false
}: BookmarkButtonProps) {
  const { user } = useAuth()
  const [bookmarked, setBookmarked] = useState(isBookmarked)
  const [loading, setLoading] = useState(false)

  // Sync internal state with prop when it changes
  useEffect(() => {
    setBookmarked(isBookmarked)
  }, [isBookmarked])

  const handleToggleBookmark = async () => {
    if (!user || loading) return

    setLoading(true)

    try {
      const response = await fetch('/api/bookmarks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-wallet-address': user.walletAddress || ''
        },
        body: JSON.stringify({ postId })
      })

      const data = await response.json()

      if (response.ok) {
        setBookmarked(data.isBookmarked)
        onToggle?.(data.isBookmarked)
      } else {
        console.error('Failed to toggle bookmark:', data.error)
      }
    } catch (error) {
      console.error('Error toggling bookmark:', error)
    } finally {
      setLoading(false)
    }
  }

  if (!user) return null

  // Icon size based on prop
  const iconSize = size === 'sm' ? 'w-5 h-5' : size === 'md' ? 'w-6 h-6' : 'w-7 h-7'

  return (
    <button
      onClick={handleToggleBookmark}
      disabled={loading}
      className={`
        flex items-center gap-2 px-3 py-2 rounded-lg transition-colors
        ${bookmarked
          ? 'bg-yellow-500/20 text-yellow-300 hover:bg-yellow-500/30'
          : 'bg-white/10 text-gray-300 hover:bg-white/20'
        }
        disabled:opacity-50
      `}
      title={bookmarked ? 'Remove bookmark' : 'Save post'}
    >
      {loading ? (
        <div className={`${iconSize} animate-spin rounded-full border-2 border-current border-t-transparent`} />
      ) : (
        <>
          {bookmarked ? (
            <svg
              className={iconSize}
              fill="currentColor"
              viewBox="0 0 24 24"
            >
              <path d="M17 3H7c-1.1 0-2 .9-2 2v16l7-3 7 3V5c0-1.1-.9-2-2-2z"/>
            </svg>
          ) : (
            <svg
              className={iconSize}
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              viewBox="0 0 24 24"
            >
              <path d="M17 3H7c-1.1 0-2 .9-2 2v16l7-3 7 3V5c0-1.1-.9-2-2-2z"/>
            </svg>
          )}
          {showLabel && (
            <span className="hidden sm:inline">
              {bookmarked ? 'Saved' : 'Save'}
            </span>
          )}
        </>
      )}
    </button>
  )
}