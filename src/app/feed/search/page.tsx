'use client'

import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { useTheme } from '@/providers/ThemeProvider'
import { useAuth } from '@/providers/AuthProvider'
import Navbar from '@/components/Navbar'
import PostCard from '@/components/feed/PostCard'
import PenguinLoadingScreen from '@/components/PenguinLoadingScreen'
import { Post } from '@/types'

interface SearchResult extends Omit<Post, 'createdAt' | 'updatedAt'> {
  createdAt: string
  updatedAt: string
  hashtags: string[]
  stats: {
    likes: number
    comments: number
    shares: number
  }
}

export default function FeedSearchPage() {
  const searchParams = useSearchParams()
  const query = searchParams?.get('q') || ''
  // Theme handled by ThemeWrapper
  const { user, isAuthenticated, loading: authLoading } = useAuth()
  const [results, setResults] = useState<SearchResult[]>([])
  const [loading, setLoading] = useState(false)
  const [searchQuery, setSearchQuery] = useState(query)

  useEffect(() => {
    if (query) {
      performSearch(query)
    }
  }, [query])

  const performSearch = async (searchQuery: string) => {
    if (searchQuery.trim().length < 2) {
      setResults([])
      return
    }

    setLoading(true)
    try {
      const response = await fetch(`/api/posts/search?q=${encodeURIComponent(searchQuery)}&limit=50`)
      const data = await response.json()

      if (response.ok) {
        setResults(data.posts || [])
      } else {
        console.error('Search failed:', data.error)
        setResults([])
      }
    } catch (error) {
      console.error('Search error:', error)
      setResults([])
    } finally {
      setLoading(false)
    }
  }

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (searchQuery.trim()) {
      window.history.pushState({}, '', `/feed/search?q=${encodeURIComponent(searchQuery.trim())}`)
      performSearch(searchQuery.trim())
    }
  }

  if (authLoading) {
    return <PenguinLoadingScreen />
  }

  return (
    <div className="min-h-screen transition-all duration-500">
      <Navbar />

      <div className="container mx-auto px-4 py-8">
        <div className="max-w-3xl mx-auto">
          {/* Search Header */}
          <div className="text-center mb-8">
            <div className="text-5xl mb-4">🔍</div>
            <h1 className="text-3xl font-bold text-white mb-2">Search Posts</h1>
            <p className="text-gray-300">Search posts by keywords or hashtags</p>
          </div>

          {/* Search Form */}
          <form onSubmit={handleSearch} className="mb-8">
            <div className="relative max-w-2xl mx-auto">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search for posts, keywords, or #hashtags..."
                className="w-full px-6 py-4 bg-white/10 backdrop-blur-lg border border-white/20 rounded-2xl text-white placeholder-gray-400 focus:outline-none focus:border-cyan-400 transition-all text-lg"
              />
              <button
                type="submit"
                className="absolute right-2 top-1/2 -translate-y-1/2 bg-cyan-500 hover:bg-cyan-600 text-white px-6 py-2 rounded-xl transition-colors font-semibold"
              >
                Search
              </button>
            </div>
          </form>

          {/* Search Results */}
          {loading ? (
            <div className="text-center text-white py-12">
              <div className="w-16 h-16 border-4 border-cyan-400 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-lg">Searching posts...</p>
            </div>
          ) : query ? (
            <>
              <div className="mb-6">
                <p className="text-gray-300 text-center">
                  {results.length > 0 ? (
                    <>
                      Found <span className="text-cyan-400 font-bold">{results.length}</span> {results.length === 1 ? 'post' : 'posts'} for{' '}
                      <span className="text-white font-semibold">"{query}"</span>
                    </>
                  ) : (
                    <>
                      No posts found for <span className="text-white font-semibold">"{query}"</span>
                    </>
                  )}
                </p>
              </div>

              {results.length > 0 ? (
                <div className="space-y-4">
                  {results.map((post) => (
                    <PostCard
                      key={post.id}
                      post={{
                        ...post,
                        createdAt: new Date(post.createdAt),
                        updatedAt: new Date(post.updatedAt)
                      }}
                      currentUserId={user?.id}
                      onPostUpdate={() => performSearch(query)}
                    />
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <div className="bg-white/10 backdrop-blur-lg rounded-2xl border border-white/20 p-8">
                    <div className="text-6xl mb-4">🔎</div>
                    <h3 className="text-xl font-bold text-white mb-2">No Results Found</h3>
                    <p className="text-gray-300 mb-6">
                      Try different keywords or hashtags
                    </p>
                    <div className="flex flex-wrap gap-2 justify-center">
                      <button
                        onClick={() => {
                          setSearchQuery('#abstract')
                          performSearch('#abstract')
                          window.history.pushState({}, '', `/feed/search?q=%23abstract`)
                        }}
                        className="px-4 py-2 bg-purple-500/20 text-purple-200 rounded-full text-sm hover:bg-purple-500/30 transition-colors"
                      >
                        #abstract
                      </button>
                      <button
                        onClick={() => {
                          setSearchQuery('#web3')
                          performSearch('#web3')
                          window.history.pushState({}, '', `/feed/search?q=%23web3`)
                        }}
                        className="px-4 py-2 bg-purple-500/20 text-purple-200 rounded-full text-sm hover:bg-purple-500/30 transition-colors"
                      >
                        #web3
                      </button>
                      <button
                        onClick={() => {
                          setSearchQuery('#pengubook')
                          performSearch('#pengubook')
                          window.history.pushState({}, '', `/feed/search?q=%23pengubook`)
                        }}
                        className="px-4 py-2 bg-purple-500/20 text-purple-200 rounded-full text-sm hover:bg-purple-500/30 transition-colors"
                      >
                        #pengubook
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-12">
              <div className="bg-white/10 backdrop-blur-lg rounded-2xl border border-white/20 p-8">
                <div className="text-6xl mb-4">📝</div>
                <h3 className="text-xl font-bold text-white mb-2">Start Searching</h3>
                <p className="text-gray-300 mb-6">
                  Enter keywords or hashtags to find posts
                </p>
                <p className="text-sm text-gray-300">
                  Tip: Start with # to search for specific hashtags
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
