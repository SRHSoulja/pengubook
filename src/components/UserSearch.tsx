'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'

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
  profile: {
    followersCount: number
    postsCount: number
    profileVerified: boolean
  }
}

export default function UserSearch() {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [loading, setLoading] = useState(false)
  const [showResults, setShowResults] = useState(false)
  const searchRef = useRef<HTMLDivElement>(null)

  // Close search results when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowResults(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Debounced search
  useEffect(() => {
    const delayedSearch = setTimeout(() => {
      if (query.trim().length >= 2) {
        performSearch(query.trim())
      } else {
        setResults([])
        setShowResults(false)
      }
    }, 300)

    return () => clearTimeout(delayedSearch)
  }, [query])

  const performSearch = async (searchQuery: string) => {
    setLoading(true)
    try {
      const response = await fetch(`/api/users/search?q=${encodeURIComponent(searchQuery)}&limit=5`)
      const data = await response.json()

      if (response.ok) {
        setResults(data.results || [])
        setShowResults(true)
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

  const handleResultClick = () => {
    setShowResults(false)
    setQuery('')
  }

  return (
    <div ref={searchRef} className="relative">
      {/* Search Input */}
      <div className="relative">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search penguins..."
          className="w-64 bg-black/30 text-white placeholder-gray-400 border border-white/20 rounded-xl px-4 py-2 pl-10 focus:outline-none focus:border-cyan-400 focus:shadow-lg transition-all"
        />
        <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">
          {loading ? (
            <div className="w-4 h-4 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin"></div>
          ) : (
            <span>🔍</span>
          )}
        </div>
      </div>

      {/* Search Results Dropdown */}
      {showResults && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-black/90 backdrop-blur-lg border border-white/20 rounded-xl shadow-2xl z-50 max-h-96 overflow-y-auto">
          {results.length === 0 ? (
            <div className="p-4 text-center text-gray-400">
              <div className="text-2xl mb-2">🔍</div>
              <p>No penguins found for "{query}"</p>
            </div>
          ) : (
            <>
              <div className="p-3 border-b border-white/10">
                <p className="text-xs text-gray-400">Found {results.length} penguin{results.length !== 1 ? 's' : ''}</p>
              </div>
              {results.map((user) => (
                <Link
                  key={user.id}
                  href={`/profile/${user.id}`}
                  onClick={handleResultClick}
                  className="flex items-center gap-3 p-3 hover:bg-white/10 transition-colors border-b border-white/5 last:border-b-0"
                >
                  {/* Avatar */}
                  <div className="w-10 h-10 bg-gradient-to-br from-cyan-400 to-blue-500 rounded-lg flex items-center justify-center text-sm font-bold text-white flex-shrink-0">
                    {user.avatar ? (
                      <img
                        src={user.avatar}
                        alt={user.displayName}
                        className="w-full h-full rounded-lg object-cover"
                      />
                    ) : (
                      user.displayName.charAt(0).toUpperCase()
                    )}
                  </div>

                  {/* User Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-white font-medium truncate">
                        {user.displayName}
                      </span>
                      {user.profile.profileVerified && (
                        <span className="text-blue-400 text-xs">✓</span>
                      )}
                      {user.isAdmin && (
                        <span className="bg-yellow-500/20 text-yellow-300 px-1 py-0.5 rounded text-xs">
                          ADMIN
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-gray-400">
                      <span>@{user.username}</span>
                      <span>•</span>
                      <span>Level {user.level}</span>
                      {user.profile.followersCount > 0 && (
                        <>
                          <span>•</span>
                          <span>{user.profile.followersCount} followers</span>
                        </>
                      )}
                    </div>
                    {user.bio && (
                      <p className="text-xs text-gray-300 truncate mt-1">
                        {user.bio}
                      </p>
                    )}
                    {(user.discordName || user.twitterHandle) && (
                      <div className="flex items-center gap-2 mt-1">
                        {user.discordName && (
                          <span className="text-xs text-purple-300">📟 {user.discordName}</span>
                        )}
                        {user.twitterHandle && (
                          <span className="text-xs text-blue-300">🐦 {user.twitterHandle}</span>
                        )}
                      </div>
                    )}
                  </div>
                </Link>
              ))}
              <div className="p-3 text-center">
                <Link
                  href={`/search?q=${encodeURIComponent(query)}`}
                  onClick={handleResultClick}
                  className="text-cyan-400 hover:text-cyan-300 text-sm"
                >
                  View all results →
                </Link>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}