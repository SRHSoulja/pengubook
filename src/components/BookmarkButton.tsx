'use client'

import { useState } from 'react'
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

  const sizeClasses = {
    sm: 'w-4 h-4 p-1 text-xs',
    md: 'w-5 h-5 p-1.5 text-sm',
    lg: 'w-6 h-6 p-2 text-base'
  }

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

  return (
    <button
      onClick={handleToggleBookmark}
      disabled={loading}
      className={`
        ${sizeClasses[size]}
        ${bookmarked
          ? 'text-yellow-400 hover:text-yellow-500'
          : 'text-gray-400 hover:text-yellow-400'
        }
        transition-colors duration-200 disabled:opacity-50 rounded-full
        hover:bg-yellow-400/10 flex items-center space-x-1
      `}
      title={bookmarked ? 'Remove bookmark' : 'Save post'}
    >
      {loading ? (
        <div className="animate-spin rounded-full border-2 border-current border-t-transparent" />
      ) : (
        <>
          <svg
            className={`${size === 'sm' ? 'w-4 h-4' : size === 'md' ? 'w-5 h-5' : 'w-6 h-6'}`}
            viewBox="0 0 24 24"
            fill={bookmarked ? 'currentColor' : 'none'}
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
          </svg>
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