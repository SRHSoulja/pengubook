'use client'

import { useEffect, useState } from 'react'
import { useToast } from '@/components/ui/Toast'

interface QueueItem {
  id: string
  authorId: string
  content: string
  mediaUrls: string[]
  contentWarnings: string[]
  moderationStatus: string
  moderationData: any
  isNSFW: boolean
  createdAt: string
  author: {
    id: string
    username: string
    displayName: string
    avatar?: string
  }
}

export default function ReviewQueue() {
  const { toast } = useToast()
  const [items, setItems] = useState<QueueItem[]>([])
  const [cursor, setCursor] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [hasMore, setHasMore] = useState(true)

  async function load(initial = false) {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        take: '25',
        ...(cursor && !initial ? { cursor } : {}),
      })
      const res = await fetch(`/api/admin/moderation/queue?${params.toString()}`, {
        cache: 'no-store',
        credentials: 'include'
      })
      const data = await res.json()

      if (data.success) {
        if (initial) {
          setItems(data.items)
        } else {
          setItems(prev => [...prev, ...data.items])
        }
        setCursor(data.nextCursor)
        setHasMore(data.hasMore)
      }
    } catch (error) {
      console.error('Error loading review queue:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load(true)
  }, [])

  async function approve(id: string) {
    if (!confirm('Approve this post? It will remain NSFW-tagged but be visible in feeds.')) {
      return
    }

    try {
      const res = await fetch('/api/admin/moderation/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ id })
      })

      if (res.ok) {
        setItems(prev => prev.filter(p => p.id !== id))
        toast('Post approved', 'success')
      } else {
        const error = await res.json()
        toast(`Error: ${error.error}`, 'error')
      }
    } catch (error) {
      console.error('Error approving post:', error)
      toast('Failed to approve post', 'error')
    }
  }

  async function reject(id: string) {
    const reason = prompt('Rejection reason (optional):')
    if (reason === null) return // User cancelled

    try {
      const res = await fetch('/api/admin/moderation/reject', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ id, reason })
      })

      if (res.ok) {
        setItems(prev => prev.filter(p => p.id !== id))
        toast('Post rejected and hidden from feed', 'success')
      } else {
        const error = await res.json()
        toast(`Error: ${error.error}`, 'error')
      }
    } catch (error) {
      console.error('Error rejecting post:', error)
      toast('Failed to reject post', 'error')
    }
  }

  if (loading && items.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="text-4xl mb-4">👀</div>
        <p className="text-white">Loading review queue...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-2xl font-bold text-white flex items-center gap-2">
              👀 Content Review Queue
            </h2>
            <p className="text-gray-300 text-sm mt-1">
              Posts flagged by AI moderation for manual review
            </p>
          </div>
          <button
            onClick={() => {
              setCursor(null)
              load(true)
            }}
            disabled={loading}
            className="bg-cyan-600 hover:bg-cyan-700 disabled:bg-gray-600 text-white px-4 py-2 rounded-xl font-semibold transition-colors"
          >
            {loading ? 'Refreshing...' : '🔄 Refresh'}
          </button>
        </div>

        <div className="bg-black/30 px-4 py-2 rounded-lg">
          <p className="text-white text-sm">
            <strong>{items.length}</strong> item{items.length !== 1 ? 's' : ''} in queue
          </p>
        </div>
      </div>

      {/* Queue Items */}
      {items.length === 0 ? (
        <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-12 border border-white/20 text-center">
          <div className="text-6xl mb-4">✨</div>
          <h3 className="text-xl font-bold text-white mb-2">All Clear!</h3>
          <p className="text-gray-300">No posts pending review</p>
        </div>
      ) : (
        <ul className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {items.map(post => (
            <li
              key={post.id}
              className="rounded-xl border border-white/10 bg-white/5 overflow-hidden hover:bg-white/10 transition-all"
            >
              {/* Media Preview */}
              {post.mediaUrls && post.mediaUrls.length > 0 && (
                <div className="relative">
                  {post.mediaUrls[0].includes('/video/') || /\.(mp4|webm|mov)$/i.test(post.mediaUrls[0]) ? (
                    <video
                      src={post.mediaUrls[0]}
                      className="w-full h-56 object-cover bg-black blur-md"
                    />
                  ) : (
                    <img
                      src={post.mediaUrls[0]}
                      alt=""
                      className="w-full h-56 object-cover blur-md"
                    />
                  )}
                  <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                    <div className="text-center">
                      <div className="text-4xl mb-2">⚠️</div>
                      <div className="bg-red-600 text-white px-3 py-1 rounded-lg font-bold text-sm">
                        NSFW - BLURRED
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Post Details */}
              <div className="p-4 space-y-3">
                {/* Author */}
                <div className="flex items-center gap-2">
                  {post.author.avatar && (
                    <img
                      src={post.author.avatar}
                      alt=""
                      className="w-8 h-8 rounded-full"
                    />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-white font-semibold truncate">
                      {post.author.displayName || post.author.username}
                    </p>
                    <p className="text-gray-300 text-xs">
                      {new Date(post.createdAt).toLocaleString()}
                    </p>
                  </div>
                </div>

                {/* Content Warnings */}
                {post.contentWarnings && post.contentWarnings.length > 0 && (
                  <div>
                    <p className="text-gray-300 text-xs font-semibold mb-1">
                      AI Detected:
                    </p>
                    <div className="flex flex-wrap gap-1">
                      {post.contentWarnings.map((warning, idx) => (
                        <span
                          key={idx}
                          className="bg-orange-600/80 text-white px-2 py-0.5 rounded text-xs font-semibold"
                        >
                          {warning}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Post Content */}
                {post.content && (
                  <p className="text-gray-200 text-sm line-clamp-3">
                    {post.content}
                  </p>
                )}

                {/* Moderation Info */}
                <div className="text-xs text-gray-300">
                  <p>Status: <strong className="text-orange-400">{post.moderationStatus}</strong></p>
                  {post.moderationData?.confidence && (
                    <p>Confidence: {Math.round(post.moderationData.confidence)}%</p>
                  )}
                </div>

                {/* Actions */}
                <div className="flex gap-2 pt-2 border-t border-white/10">
                  <button
                    onClick={() => approve(post.id)}
                    className="flex-1 px-3 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-sm transition-colors"
                  >
                    ✅ Approve
                  </button>
                  <button
                    onClick={() => reject(post.id)}
                    className="flex-1 px-3 py-2 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-semibold text-sm transition-colors"
                  >
                    🚫 Reject
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      {/* Load More */}
      {hasMore && items.length > 0 && (
        <div className="text-center pt-4">
          <button
            onClick={() => load(false)}
            disabled={loading}
            className="px-6 py-3 rounded-xl bg-white/10 hover:bg-white/20 disabled:opacity-50 text-white font-semibold transition-colors"
          >
            {loading ? 'Loading...' : 'Load More'}
          </button>
        </div>
      )}
    </div>
  )
}
