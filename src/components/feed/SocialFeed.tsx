'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { Post, FeedAlgorithmOptions } from '@/types'
import { useAbstractClient } from '@abstract-foundation/agw-react'
import PostCard from './PostCard'
import PostCreator from './PostCreator'
import { useRealtimeFeed, useFeedRefresh } from '@/hooks/useRealtimeFeed'
import { SkeletonList } from '@/components/skeletons/SkeletonCard'
import { EmptyFeed } from '@/components/empty-states'

interface SocialFeedProps {
  className?: string
  showPostCreator?: boolean
}

export default function SocialFeed({ className = '', showPostCreator = true }: SocialFeedProps) {
  const { data: client } = useAbstractClient()
  const [posts, setPosts] = useState<Post[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(true)
  const [algorithm, setAlgorithm] = useState<'chronological' | 'trending' | 'personalized'>('chronological')
  const [followingOnly, setFollowingOnly] = useState(false)
  const [offset, setOffset] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)

  // Infinite scroll
  const observerRef = useRef<IntersectionObserver | null>(null)
  const loadingTriggerRef = useRef<HTMLDivElement | null>(null)

  // Real-time updates
  const { hasNewPosts, markAsChecked, refreshCheck } = useRealtimeFeed({
    userId: currentUserId || undefined,
    algorithm,
    followingOnly,
    walletAddress: client?.account?.address,
    enabled: !!currentUserId
  })

  // Feed refresh management
  const { isRefreshing, refresh } = useFeedRefresh()

  // Fetch current user
  useEffect(() => {
    const fetchCurrentUser = async () => {
      if (client?.account?.address) {
        try {
          const response = await fetch(`/api/users/profile?walletAddress=${client.account.address}`)
          const result = await response.json()
          if (result.success) {
            setCurrentUserId(result.data.user.id)
          }
        } catch (error) {
          console.error('Error fetching current user:', error)
        }
      }
    }

    fetchCurrentUser()
  }, [client?.account?.address])

  // Load posts
  const loadPosts = useCallback(async (reset = false) => {
    if (!client?.account?.address || (!reset && !hasMore)) return

    const currentOffset = reset ? 0 : offset

    if (reset) {
      setLoading(true)
      setError(null)
    } else {
      setLoadingMore(true)
    }

    try {
      const params = new URLSearchParams({
        userId: currentUserId || 'anonymous',
        algorithm,
        limit: '20',
        offset: currentOffset.toString(),
        followingOnly: followingOnly.toString()
      })

      const response = await fetch(`/api/posts?${params}`, {
        headers: {
          'x-wallet-address': client.account.address
        }
      })

      const result = await response.json()

      if (result.success) {
        const newPosts = result.data.posts

        if (reset) {
          setPosts(newPosts)
          setOffset(newPosts.length)
        } else {
          setPosts(prev => [...prev, ...newPosts])
          setOffset(prev => prev + newPosts.length)
        }

        setHasMore(result.data.hasMore)
      } else {
        setError(result.error || 'Failed to load posts')
      }
    } catch (error) {
      console.error('Error loading posts:', error)
      setError('Failed to load posts')
    } finally {
      setLoading(false)
      setLoadingMore(false)
    }
  }, [client?.account?.address, currentUserId, algorithm, followingOnly, offset, hasMore])

  // Initial load
  useEffect(() => {
    if (client?.account?.address && currentUserId) {
      loadPosts(true)
    }
  }, [client?.account?.address, currentUserId, algorithm, followingOnly])

  // Infinite scroll observer
  useEffect(() => {
    if (observerRef.current) {
      observerRef.current.disconnect()
    }

    observerRef.current = new IntersectionObserver(
      (entries) => {
        const target = entries[0]
        if (target.isIntersecting && hasMore && !loadingMore && !loading) {
          loadPosts(false)
        }
      },
      {
        threshold: 0.1,
        rootMargin: '100px'
      }
    )

    if (loadingTriggerRef.current) {
      observerRef.current.observe(loadingTriggerRef.current)
    }

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect()
      }
    }
  }, [loadPosts, hasMore, loadingMore, loading])

  const handlePostCreated = (newPost: Post) => {
    setPosts(prev => [newPost, ...prev])
    setOffset(prev => prev + 1)
    markAsChecked() // Mark as checked since we just added a new post
  }

  const handleRefresh = async () => {
    await refresh(() => loadPosts(true))
    markAsChecked()
  }

  const handleAlgorithmChange = (newAlgorithm: typeof algorithm) => {
    if (newAlgorithm !== algorithm) {
      setAlgorithm(newAlgorithm)
      setOffset(0)
      setHasMore(true)
    }
  }

  const handleFilterChange = (newFollowingOnly: boolean) => {
    if (newFollowingOnly !== followingOnly) {
      setFollowingOnly(newFollowingOnly)
      setOffset(0)
      setHasMore(true)
    }
  }

  if (!client?.account?.address) {
    return (
      <div className="text-center text-white py-12">
        <div className="text-6xl mb-4">🐧</div>
        <h2 className="text-2xl font-bold mb-2">Welcome to the Antarctic Colony!</h2>
        <p className="text-gray-300">Connect your wallet to join the social ice floe</p>
      </div>
    )
  }

  return (
    <div className={`max-w-2xl mx-auto space-y-6 ${className}`}>
      {/* Feed Controls */}
      <div className="bg-white/10 backdrop-blur-lg rounded-2xl border border-white/20 p-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
          {/* Algorithm selector */}
          <div className="flex items-center space-x-2">
            <span className="text-white font-medium">Feed:</span>
            <div className="flex bg-white/10 rounded-lg p-1">
              {(['chronological', 'trending', 'personalized'] as const).map((algo) => (
                <button
                  key={algo}
                  onClick={() => handleAlgorithmChange(algo)}
                  className={`px-3 py-1 rounded-md text-sm font-medium transition-all capitalize ${
                    algorithm === algo
                      ? 'bg-cyan-500 text-white'
                      : 'text-gray-300 hover:text-white hover:bg-white/10'
                  }`}
                >
                  {algo === 'chronological' && '🕒 Latest'}
                  {algo === 'trending' && '🔥 Trending'}
                  {algo === 'personalized' && '⭐ For You'}
                </button>
              ))}
            </div>
          </div>

          {/* Filter toggle */}
          <div className="flex items-center space-x-3">
            <span className="text-white font-medium">Show:</span>
            <button
              onClick={() => handleFilterChange(!followingOnly)}
              className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-all ${
                followingOnly
                  ? 'bg-cyan-500 text-white'
                  : 'bg-white/10 text-gray-300 hover:bg-white/20'
              }`}
            >
              <span>{followingOnly ? '👥' : '🌍'}</span>
              <span>{followingOnly ? 'Following' : 'Everyone'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* New Posts Notification */}
      {hasNewPosts && (
        <div className="bg-cyan-500/20 border border-cyan-500/50 rounded-2xl p-4 text-center">
          <div className="flex items-center justify-center space-x-3">
            <div className="animate-pulse text-cyan-400">🆕</div>
            <p className="text-cyan-200">New posts are available!</p>
            <button
              onClick={handleRefresh}
              disabled={isRefreshing}
              className={`px-4 py-2 rounded-lg font-medium transition-all ${
                isRefreshing
                  ? 'bg-gray-500 text-gray-300 cursor-not-allowed'
                  : 'bg-cyan-500 text-white hover:bg-cyan-600'
              }`}
            >
              {isRefreshing ? (
                <div className="flex items-center space-x-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Loading...</span>
                </div>
              ) : (
                'Load New Posts'
              )}
            </button>
          </div>
        </div>
      )}

      {/* Post Creator */}
      {showPostCreator && (
        <PostCreator onPostCreated={handlePostCreated} />
      )}

      {/* Error state */}
      {error && (
        <div className="bg-red-500/20 border border-red-500/50 rounded-2xl p-4 text-center">
          <p className="text-red-200">{error}</p>
          <button
            onClick={() => loadPosts(true)}
            className="mt-2 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
          >
            Try Again
          </button>
        </div>
      )}

      {/* Loading state - Skeleton screens for better UX */}
      {loading && posts.length === 0 && (
        <SkeletonList count={5} />
      )}

      {/* Empty state - Better UX with actionable empty state */}
      {!loading && posts.length === 0 && !error && (
        <EmptyFeed followingOnly={followingOnly} />
      )}

      {/* Posts */}
      <div className="space-y-6">
        {posts.map((post, index) => (
          <PostCard
            key={`${post.id}-${index}`}
            post={post}
            currentUserId={currentUserId || undefined}
          />
        ))}
      </div>

      {/* Load more trigger */}
      {hasMore && !loading && (
        <div ref={loadingTriggerRef} className="py-8 text-center">
          {loadingMore ? (
            <div className="inline-flex items-center space-x-2 text-gray-300">
              <div className="w-5 h-5 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin"></div>
              <span>Loading more posts...</span>
            </div>
          ) : (
            <div className="text-gray-300">Scroll for more posts</div>
          )}
        </div>
      )}

      {/* End of feed */}
      {!hasMore && posts.length > 0 && (
        <div className="text-center py-8">
          <div className="text-4xl mb-2">🐧</div>
          <p className="text-gray-300">You've reached the end of the ice floe!</p>
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className={`mt-4 px-4 py-2 rounded-lg transition-colors ${
              isRefreshing
                ? 'bg-gray-500 text-gray-300 cursor-not-allowed'
                : 'bg-cyan-500 text-white hover:bg-cyan-600'
            }`}
          >
            {isRefreshing ? 'Refreshing...' : 'Refresh Feed'}
          </button>
        </div>
      )}
    </div>
  )
}