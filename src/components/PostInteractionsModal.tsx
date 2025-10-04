'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useKeyboardNavigation } from '@/hooks/useKeyboardNavigation'

interface User {
  id: string
  username: string
  displayName: string
  avatar: string | null
  level: number
  isAdmin: boolean
}

interface InteractionUser {
  id: string
  type: 'LIKE' | 'SHARE'
  createdAt: string
  user: User
}

interface PostInteractionsModalProps {
  postId: string
  isOpen: boolean
  onClose: () => void
  initialTab?: 'likes' | 'shares'
}

export default function PostInteractionsModal({
  postId,
  isOpen,
  onClose,
  initialTab = 'likes'
}: PostInteractionsModalProps) {
  const [activeTab, setActiveTab] = useState<'likes' | 'shares'>(initialTab)
  const [interactions, setInteractions] = useState<InteractionUser[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (isOpen && postId) {
      fetchInteractions()
    }
  }, [isOpen, postId, activeTab])

  // Keyboard navigation: ESC to close
  useKeyboardNavigation(isOpen, onClose)

  const fetchInteractions = async () => {
    try {
      setLoading(true)
      setError('')

      const response = await fetch(`/api/posts/${postId}/interactions?type=${activeTab.toUpperCase()}`)
      const data = await response.json()

      if (response.ok) {
        setInteractions(data.interactions || [])
      } else {
        setError(data.error || 'Failed to fetch interactions')
      }
    } catch (err) {
      console.error('Error fetching interactions:', err)
      setError('Failed to fetch interactions')
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60))

    if (diffInMinutes < 1) return 'Just now'
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`
    if (diffInMinutes < 10080) return `${Math.floor(diffInMinutes / 1440)}d ago`
    return date.toLocaleDateString()
  }

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-gradient-to-br from-gray-900 to-gray-800 border border-white/20 rounded-2xl p-6 max-w-md w-full max-h-[80vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-bold text-white">Post Interactions</h3>
          <button
            onClick={onClose}
            className="text-gray-300 hover:text-white transition-colors"
            aria-label="Close modal"
          >
            ✕
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-4">
          <button
            onClick={() => setActiveTab('likes')}
            className={`flex-1 py-2 px-4 rounded-lg font-medium transition-all ${
              activeTab === 'likes'
                ? 'bg-pink-500/20 text-pink-400 border border-pink-500/50'
                : 'bg-gray-700/50 text-gray-300 hover:bg-gray-700'
            }`}
          >
            ❤️ Likes
          </button>
          <button
            onClick={() => setActiveTab('shares')}
            className={`flex-1 py-2 px-4 rounded-lg font-medium transition-all ${
              activeTab === 'shares'
                ? 'bg-blue-500/20 text-blue-400 border border-blue-500/50'
                : 'bg-gray-700/50 text-gray-300 hover:bg-gray-700'
            }`}
          >
            🔄 Shares
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="text-center py-8">
              <div className="w-8 h-8 border-4 border-cyan-400 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-gray-300">Loading...</p>
            </div>
          ) : error ? (
            <div className="text-center py-8">
              <p className="text-red-400">{error}</p>
            </div>
          ) : interactions.length === 0 ? (
            <div className="text-center py-8">
              <div className="text-4xl mb-2">
                {activeTab === 'likes' ? '❤️' : '🔄'}
              </div>
              <p className="text-gray-300">
                No {activeTab} yet
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {interactions.map((interaction) => (
                <Link
                  key={interaction.id}
                  href={`/profile/${interaction.user.id}`}
                  onClick={onClose}
                  className="flex items-center gap-3 p-3 rounded-lg bg-gray-700/30 hover:bg-gray-700/50 transition-colors group"
                >
                  {/* Avatar */}
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-cyan-400 to-blue-500 flex items-center justify-center flex-shrink-0">
                    {interaction.user.avatar ? (
                      <img
                        src={interaction.user.avatar}
                        alt={interaction.user.displayName}
                        className="w-12 h-12 rounded-full object-cover"
                      />
                    ) : (
                      <span className="text-white font-bold">
                        {interaction.user.displayName.charAt(0).toUpperCase()}
                      </span>
                    )}
                  </div>

                  {/* User Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-white group-hover:text-cyan-400 transition-colors truncate">
                        {interaction.user.displayName}
                      </span>
                      {interaction.user.isAdmin && (
                        <span className="text-yellow-400">👑</span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <span className="text-gray-300 truncate">
                        @{interaction.user.username}
                      </span>
                      <span className="text-gray-500">•</span>
                      <span className="text-gray-500">
                        Level {interaction.user.level}
                      </span>
                    </div>
                  </div>

                  {/* Time */}
                  <div className="text-xs text-gray-500 flex-shrink-0">
                    {formatDate(interaction.createdAt)}
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
