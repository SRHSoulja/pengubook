'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/providers/AuthProvider'
import Navbar from '@/components/Navbar'
import Link from 'next/link'

interface BookmarkedPost {
  id: string
  createdAt: string
  post: {
    id: string
    content: string
    contentType: string
    mediaUrls: string[]
    visibility: string
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
    isLiked: boolean
    isBookmarked: boolean
    stats: {
      likes: number
      comments: number
      shares: number
      reactions: number
    }
    reactions: any[]
  }
}

export default function BookmarksPage() {
  const { user, isAuthenticated, loading: authLoading } = useAuth()
  const [bookmarks, setBookmarks] = useState<BookmarkedPost[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)

  const formatDate = (date: string) => {
    const postDate = new Date(date)
    const now = new Date()
    const diffInMinutes = Math.floor((now.getTime() - postDate.getTime()) / (1000 * 60))

    if (diffInMinutes < 1) return 'Just now'
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`
    if (diffInMinutes < 10080) return `${Math.floor(diffInMinutes / 1440)}d ago`
    return postDate.toLocaleDateString()
  }

  const fetchBookmarks = async (pageNum = 1) => {
    if (!user) return

    try {
      setLoading(true)
      const response = await fetch(`/api/bookmarks?page=${pageNum}&limit=20`, {
        headers: {
          'x-wallet-address': user.walletAddress || ''
        }
      })

      const data = await response.json()

      if (response.ok) {
        if (pageNum === 1) {
          setBookmarks(data.bookmarks)
        } else {
          setBookmarks(prev => [...prev, ...data.bookmarks])
        }
        setHasMore(data.pagination.hasNext)
        setError('')
      } else {
        setError(data.error || 'Failed to fetch bookmarks')
      }
    } catch (err) {
      console.error('Error fetching bookmarks:', err)
      setError('Error fetching bookmarks')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (user) {
      fetchBookmarks()
    }
  }, [user])

  const handleLoadMore = () => {
    if (!loading && hasMore) {
      const nextPage = page + 1
      setPage(nextPage)
      fetchBookmarks(nextPage)
    }
  }

  if (authLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-900 via-purple-900 to-indigo-900">
        <Navbar />
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center text-white">
            <div className="text-6xl mb-4">🐧</div>
            <h1 className="text-2xl font-bold mb-4">Loading...</h1>
            <div className="w-8 h-8 border-4 border-white border-t-transparent rounded-full animate-spin mx-auto"></div>
          </div>
        </div>
      </div>
    )
  }

  if (!isAuthenticated || !user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-900 via-purple-900 to-indigo-900">
        <Navbar />
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center text-white">
            <div className="text-6xl mb-4">🐧</div>
            <h1 className="text-2xl font-bold mb-4">Access Denied</h1>
            <p className="text-gray-300 mb-6">You need to connect your wallet to view bookmarks!</p>
            <Link href="/" className="bg-cyan-500 text-white px-6 py-3 rounded-xl hover:bg-cyan-600 transition-colors">
              Back to Home
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
        <div className="max-w-2xl mx-auto">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="text-5xl mb-4">🔖</div>
            <h1 className="text-3xl font-bold text-white mb-2">Your Bookmarks</h1>
            <p className="text-gray-300">Posts you've saved for later</p>
          </div>

          {/* Error message */}
          {error && (
            <div className="mb-6 p-4 bg-red-500/20 border border-red-500/50 rounded-lg text-red-300">
              {error}
            </div>
          )}

          {/* Bookmarks list */}
          {loading && bookmarks.length === 0 ? (
            <div className="text-center py-8">
              <div className="w-8 h-8 border-4 border-cyan-400 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-gray-400">Loading your bookmarks...</p>
            </div>
          ) : bookmarks.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">📚</div>
              <h3 className="text-xl font-bold text-white mb-2">No bookmarks yet</h3>
              <p className="text-gray-400 mb-6">
                Save posts by clicking the bookmark button to build your reading list
              </p>
              <Link
                href="/feed"
                className="bg-cyan-500 hover:bg-cyan-600 text-white px-6 py-3 rounded-lg transition-colors"
              >
                Explore Feed
              </Link>
            </div>
          ) : (
            <div className="space-y-6">
              {bookmarks.map((bookmark) => (
                <div
                  key={bookmark.id}
                  className="bg-white/10 backdrop-blur-lg rounded-2xl border border-white/20 p-6"
                >
                  {/* Bookmark header */}
                  <div className="flex items-center justify-between mb-4">
                    <div className="text-xs text-gray-400">
                      Saved {formatDate(bookmark.createdAt)}
                    </div>
                    <div className="text-yellow-400">
                      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
                      </svg>
                    </div>
                  </div>

                  {/* Post author */}
                  <div className="flex items-center space-x-3 mb-4">
                    <div className="w-10 h-10 bg-gradient-to-r from-cyan-400 to-blue-500 rounded-full flex items-center justify-center text-white font-bold">
                      {bookmark.post.author.avatar ? (
                        <img
                          src={bookmark.post.author.avatar}
                          alt={bookmark.post.author.displayName}
                          className="w-10 h-10 rounded-full"
                        />
                      ) : (
                        bookmark.post.author.displayName.charAt(0)
                      )}
                    </div>
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="font-medium text-white">
                          {bookmark.post.author.displayName}
                        </span>
                        {bookmark.post.author.isAdmin && (
                          <span className="text-yellow-400">👑</span>
                        )}
                      </div>
                      <div className="text-sm text-gray-400">
                        @{bookmark.post.author.username} • Level {bookmark.post.author.level}
                      </div>
                    </div>
                  </div>

                  {/* Post content */}
                  <div className="mb-4">
                    <p className="text-white whitespace-pre-wrap">{bookmark.post.content}</p>

                    {/* Media */}
                    {bookmark.post.mediaUrls.length > 0 && (
                      <div className="mt-4 grid grid-cols-1 gap-2">
                        {bookmark.post.mediaUrls.map((url: string, index: number) => (
                          <img
                            key={index}
                            src={url}
                            alt="Post media"
                            className="rounded-lg max-w-full h-auto"
                          />
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Post stats */}
                  <div className="flex items-center justify-between text-sm text-gray-400">
                    <div className="flex items-center space-x-4">
                      <span>{bookmark.post.stats.likes} likes</span>
                      <span>{bookmark.post.stats.comments} comments</span>
                      <span>{bookmark.post.stats.shares} shares</span>
                    </div>
                    <Link
                      href={`/posts/${bookmark.post.id}`}
                      className="text-cyan-400 hover:text-cyan-300 transition-colors"
                    >
                      View Post →
                    </Link>
                  </div>
                </div>
              ))}

              {/* Load more button */}
              {hasMore && (
                <div className="text-center py-6">
                  <button
                    onClick={handleLoadMore}
                    disabled={loading}
                    className="bg-cyan-500 hover:bg-cyan-600 disabled:bg-cyan-400 text-white px-6 py-3 rounded-lg transition-colors"
                  >
                    {loading ? 'Loading...' : 'Load More'}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}