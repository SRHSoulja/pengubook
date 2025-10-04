'use client'

import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { useTheme } from '@/providers/ThemeProvider'
import Link from 'next/link'
import Navbar from '@/components/Navbar'

interface SearchResult {
  id: string
  username: string
  displayName: string
  avatar?: string
  bio?: string
  level: number
  isAdmin: boolean
  discordName?: string
  twitterHandle?: string
  walletAddress?: string
  joinedAt: string
  profile: {
    followersCount: number
    followingCount: number
    postsCount: number
    profileVerified: boolean
  }
}

export default function SearchPage() {
  const searchParams = useSearchParams()
  const query = searchParams?.get('q') || ''
  const { currentTheme } = useTheme()
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
      const response = await fetch(`/api/users/search?q=${encodeURIComponent(searchQuery)}&limit=50`)
      const data = await response.json()

      if (response.ok) {
        setResults(data.results || [])
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
      window.history.pushState({}, '', `/search?q=${encodeURIComponent(searchQuery.trim())}`)
      performSearch(searchQuery.trim())
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short'
    })
  }

  return (
    <div style={{ background: `linear-gradient(135deg, ${currentTheme.colors.from}, ${currentTheme.colors.via}, ${currentTheme.colors.to})` }} className="min-h-screen transition-all duration-500">
      <Navbar />

      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          {/* Search Header */}
          <div className="text-center mb-8">
            <div className="text-5xl mb-4">🔍</div>
            <h1 className="text-3xl font-bold text-white mb-2">Search Penguins</h1>
            <p className="text-gray-300">Find other penguins by username, display name, or social handles</p>
          </div>

          {/* Search Form */}
          <form onSubmit={handleSearch} className="mb-8">
            <div className="relative max-w-2xl mx-auto">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search penguins..."
                className="w-full bg-black/30 text-white placeholder-gray-400 border border-white/20 rounded-xl px-6 py-4 pl-14 text-lg focus:outline-none focus:border-cyan-400 focus:shadow-lg transition-all"
              />
              <div className="absolute left-5 top-1/2 transform -translate-y-1/2 text-gray-300">
                {loading ? (
                  <div className="w-6 h-6 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  <span className="text-xl">🔍</span>
                )}
              </div>
              <button
                type="submit"
                className="absolute right-2 top-1/2 transform -translate-y-1/2 bg-cyan-500 hover:bg-cyan-600 text-white px-6 py-2 rounded-lg transition-colors"
              >
                Search
              </button>
            </div>
          </form>

          {/* Search Results */}
          {query && (
            <div className="bg-black/20 backdrop-blur-lg border border-white/20 rounded-2xl overflow-hidden">
              {/* Results Header */}
              <div className="p-6 border-b border-white/10">
                <h2 className="text-xl font-bold text-white">
                  {loading ? 'Searching...' : `Search Results for "${query}"`}
                </h2>
                {!loading && (
                  <p className="text-gray-300 text-sm mt-1">
                    Found {results.length} penguin{results.length !== 1 ? 's' : ''}
                  </p>
                )}
              </div>

              {/* Results List */}
              <div className="divide-y divide-white/5">
                {loading ? (
                  <div className="p-8 text-center">
                    <div className="w-12 h-12 border-4 border-cyan-400 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                    <p className="text-gray-300">Searching for penguins...</p>
                  </div>
                ) : results.length === 0 ? (
                  <div className="p-8 text-center">
                    <div className="text-4xl mb-4">🔍</div>
                    <h3 className="text-xl font-bold text-white mb-2">No penguins found</h3>
                    <p className="text-gray-300">
                      Try searching for a different username, display name, or social handle
                    </p>
                  </div>
                ) : (
                  results.map((user) => (
                    <Link
                      key={user.id}
                      href={`/profile/${user.walletAddress || user.id}`}
                      className="flex items-center gap-4 p-6 hover:bg-white/5 transition-colors"
                    >
                      {/* Avatar */}
                      <div className="w-16 h-16 bg-gradient-to-br from-cyan-400 to-blue-500 rounded-xl flex items-center justify-center text-lg font-bold text-white flex-shrink-0">
                        {user.avatar ? (
                          <img
                            src={user.avatar}
                            alt={user.displayName}
                            className="w-full h-full rounded-xl object-cover"
                          />
                        ) : (
                          user.displayName.charAt(0).toUpperCase()
                        )}
                      </div>

                      {/* User Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-white font-bold text-lg truncate">
                            {user.displayName}
                          </h3>
                          {user.profile.profileVerified && (
                            <span className="text-blue-400 text-lg">✓</span>
                          )}
                          {user.isAdmin && (
                            <span className="bg-yellow-500/20 text-yellow-300 px-2 py-1 rounded text-xs font-medium">
                              ADMIN
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-3 text-sm text-gray-300 mb-2">
                          <span>@{user.username}</span>
                          <span>•</span>
                          <span>Level {user.level}</span>
                          <span>•</span>
                          <span>Joined {formatDate(user.joinedAt)}</span>
                        </div>

                        <div className="flex items-center gap-4 text-sm text-gray-300 mb-3">
                          <span>{user.profile.followersCount} followers</span>
                          <span>{user.profile.followingCount} following</span>
                          <span>{user.profile.postsCount} posts</span>
                        </div>

                        {user.bio && (
                          <p className="text-gray-300 text-sm mb-3 line-clamp-2">
                            {user.bio}
                          </p>
                        )}

                        {(user.discordName || user.twitterHandle) && (
                          <div className="flex items-center gap-4">
                            {user.discordName && (
                              <span className="text-sm text-purple-300 flex items-center gap-1">
                                <span>📟</span> {user.discordName}
                              </span>
                            )}
                            {user.twitterHandle && (
                              <span className="text-sm text-blue-300 flex items-center gap-1">
                                <span>🐦</span> {user.twitterHandle}
                              </span>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Wallet Address Preview */}
                      <div className="hidden sm:block text-right">
                        <div className="text-xs text-gray-500 font-mono">
                          {user.walletAddress?.slice(0, 6)}...{user.walletAddress?.slice(-4)}
                        </div>
                      </div>
                    </Link>
                  ))
                )}
              </div>
            </div>
          )}

          {/* No Search Query State */}
          {!query && (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">🐧</div>
              <h2 className="text-2xl font-bold text-white mb-2">Start Your Search</h2>
              <p className="text-gray-300">
                Enter a username, display name, or social handle to find other penguins
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}