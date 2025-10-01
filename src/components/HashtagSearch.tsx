'use client'

import { useState, useEffect, useRef } from 'react'

interface Hashtag {
  tag: string
  usageCount: number
  lastUsed: string
}

interface HashtagSearchProps {
  onHashtagSelect?: (hashtag: string) => void
  placeholder?: string
  showSuggestions?: boolean
}

export default function HashtagSearch({
  onHashtagSelect,
  placeholder = "Search hashtags...",
  showSuggestions = true
}: HashtagSearchProps) {
  const [query, setQuery] = useState('')
  const [hashtags, setHashtags] = useState<Hashtag[]>([])
  const [loading, setLoading] = useState(false)
  const [showDropdown, setShowDropdown] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState(-1)
  const inputRef = useRef<HTMLInputElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const delayedSearch = setTimeout(() => {
      if (query.trim().length >= 2) {
        searchHashtags(query.trim())
      } else {
        setHashtags([])
        setShowDropdown(false)
      }
    }, 300)

    return () => clearTimeout(delayedSearch)
  }, [query])

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        !inputRef.current?.contains(event.target as Node)
      ) {
        setShowDropdown(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const searchHashtags = async (searchQuery: string) => {
    try {
      setLoading(true)
      const response = await fetch(`/api/hashtags/search?q=${encodeURIComponent(searchQuery)}`)
      const data = await response.json()

      if (response.ok) {
        setHashtags(data.hashtags)
        setShowDropdown(data.hashtags.length > 0 && showSuggestions)
      } else {
        setHashtags([])
        setShowDropdown(false)
      }
    } catch (err) {
      console.error('Error searching hashtags:', err)
      setHashtags([])
      setShowDropdown(false)
    } finally {
      setLoading(false)
      setSelectedIndex(-1)
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    // Remove # if user types it
    const cleanValue = value.startsWith('#') ? value.slice(1) : value
    setQuery(cleanValue)
  }

  const handleHashtagClick = (hashtag: string) => {
    setQuery('')
    setShowDropdown(false)
    setSelectedIndex(-1)

    if (onHashtagSelect) {
      onHashtagSelect(hashtag)
    } else {
      // Default behavior: navigate to hashtag search
      window.location.href = `/search?q=%23${hashtag}`
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showDropdown || hashtags.length === 0) return

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        setSelectedIndex(prev =>
          prev < hashtags.length - 1 ? prev + 1 : prev
        )
        break
      case 'ArrowUp':
        e.preventDefault()
        setSelectedIndex(prev => prev > 0 ? prev - 1 : -1)
        break
      case 'Enter':
        e.preventDefault()
        if (selectedIndex >= 0 && selectedIndex < hashtags.length) {
          handleHashtagClick(hashtags[selectedIndex].tag)
        } else if (query.trim()) {
          handleHashtagClick(query.trim())
        }
        break
      case 'Escape':
        setShowDropdown(false)
        setSelectedIndex(-1)
        inputRef.current?.blur()
        break
    }
  }

  const formatLastUsed = (lastUsed: string): string => {
    const date = new Date(lastUsed)
    const now = new Date()
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60))

    if (diffInHours < 1) return 'Just now'
    if (diffInHours < 24) return `${diffInHours}h ago`

    const diffInDays = Math.floor(diffInHours / 24)
    if (diffInDays < 7) return `${diffInDays}d ago`

    const diffInWeeks = Math.floor(diffInDays / 7)
    if (diffInWeeks < 4) return `${diffInWeeks}w ago`

    return date.toLocaleDateString()
  }

  return (
    <div className="relative">
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={query ? `#${query}` : ''}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={() => {
            if (hashtags.length > 0 && showSuggestions) {
              setShowDropdown(true)
            }
          }}
          placeholder={placeholder}
          className="w-full bg-black/30 border border-white/20 rounded-lg px-4 py-2 pl-10 text-white placeholder-gray-400 focus:outline-none focus:border-cyan-400 transition-colors"
        />
        <div className="absolute left-3 top-1/2 transform -translate-y-1/2">
          {loading ? (
            <div className="w-4 h-4 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin"></div>
          ) : (
            <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          )}
        </div>
      </div>

      {showDropdown && hashtags.length > 0 && (
        <div
          ref={dropdownRef}
          className="absolute z-50 w-full mt-1 bg-black/90 backdrop-blur-lg border border-white/20 rounded-lg shadow-xl max-h-64 overflow-y-auto"
        >
          {hashtags.map((hashtag, index) => (
            <div
              key={hashtag.tag}
              onClick={() => handleHashtagClick(hashtag.tag)}
              className={`
                px-4 py-3 cursor-pointer transition-colors border-b border-white/10 last:border-b-0
                ${index === selectedIndex
                  ? 'bg-cyan-500/20 border-cyan-500/50'
                  : 'hover:bg-white/5'
                }
              `}
            >
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="text-cyan-400 font-medium">
                    #{hashtag.tag}
                  </div>
                  <div className="text-gray-400 text-xs mt-1">
                    {hashtag.usageCount.toLocaleString()} uses • {formatLastUsed(hashtag.lastUsed)}
                  </div>
                </div>
                <div className="text-gray-500 ml-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}