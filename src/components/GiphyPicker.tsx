'use client'

import { useState, useEffect, useRef } from 'react'
import { useKeyboardNavigation } from '@/hooks/useKeyboardNavigation'

interface GiphyGif {
  id: string
  title: string
  url: string
  images: {
    preview: string
    original: string
    fixed_height: string
  }
  embed_url: string
}

interface GiphyPickerProps {
  onSelect: (gifUrl: string) => void
  onClose: () => void
  isOpen: boolean
}

export default function GiphyPicker({ onSelect, onClose, isOpen }: GiphyPickerProps) {
  const [gifs, setGifs] = useState<GiphyGif[]>([])
  const [loading, setLoading] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [error, setError] = useState('')
  const searchInputRef = useRef<HTMLInputElement>(null)

  // Load trending GIFs on mount
  useEffect(() => {
    if (isOpen) {
      loadGifs('trending')
      // Focus search input when modal opens
      setTimeout(() => {
        searchInputRef.current?.focus()
      }, 100)
    }
  }, [isOpen])

  // Debounced search
  useEffect(() => {
    if (!isOpen) return

    const debounceTimer = setTimeout(() => {
      if (searchQuery.trim()) {
        loadGifs(searchQuery)
      } else {
        loadGifs('trending')
      }
    }, 500)

    return () => clearTimeout(debounceTimer)
  }, [searchQuery, isOpen])

  // Keyboard navigation: ESC to close
  useKeyboardNavigation(isOpen, onClose)

  const loadGifs = async (query: string) => {
    try {
      setLoading(true)
      setError('')

      const params = new URLSearchParams({
        q: query,
        limit: '20'
      })

      const response = await fetch(`/api/giphy/search?${params}`)
      const data = await response.json()

      if (data.success) {
        setGifs(data.gifs)
      } else {
        setError(data.error || 'Failed to load GIFs')
      }
    } catch (err) {
      console.error('Error loading GIFs:', err)
      setError('Failed to load GIFs')
    } finally {
      setLoading(false)
    }
  }

  const handleGifSelect = (gif: GiphyGif) => {
    // Send the direct GIF URL instead of the Giphy page URL
    onSelect(gif.images.fixed_height)
    onClose()
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose()
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-gray-900 rounded-2xl border border-white/20 w-full max-w-4xl max-h-[80vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-white/20">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🎭</span>
            <h2 className="text-xl font-bold text-white">Choose a GIF</h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-300 hover:text-white transition-colors p-2"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Search */}
        <div className="p-6 border-b border-white/20">
          <div className="relative">
            <input
              ref={searchInputRef}
              type="text"
              placeholder="Search for GIFs..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              className="w-full bg-black/30 border border-white/20 rounded-xl px-4 py-3 pl-12 text-white placeholder-gray-400 focus:outline-none focus:border-cyan-400 transition-colors"
            />
            <div className="absolute left-4 top-1/2 transform -translate-y-1/2">
              {loading ? (
                <div className="w-5 h-5 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <svg className="w-5 h-5 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              )}
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 max-h-[500px] overflow-y-auto">
          {error ? (
            <div className="text-center py-8">
              <div className="text-4xl mb-4">😵</div>
              <p className="text-red-300 text-lg">{error}</p>
              <button
                onClick={() => loadGifs(searchQuery || 'trending')}
                className="mt-4 bg-cyan-500 hover:bg-cyan-600 text-white px-4 py-2 rounded-lg transition-colors"
              >
                Try Again
              </button>
            </div>
          ) : gifs.length === 0 && !loading ? (
            <div className="text-center py-8">
              <div className="text-4xl mb-4">🔍</div>
              <p className="text-gray-300 text-lg">No GIFs found</p>
              <p className="text-gray-300">Try a different search term</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {gifs.map((gif) => (
                <button
                  key={gif.id}
                  onClick={() => handleGifSelect(gif)}
                  className="relative group rounded-lg overflow-hidden hover:ring-2 hover:ring-cyan-400 transition-all"
                >
                  <img
                    src={gif.images.preview}
                    alt={gif.title}
                    className="w-full h-32 object-cover group-hover:scale-105 transition-transform duration-200"
                  />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors"></div>
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <p className="text-white text-xs truncate">{gif.title}</p>
                  </div>
                </button>
              ))}
            </div>
          )}

          {loading && gifs.length === 0 && (
            <div className="text-center py-8">
              <div className="w-8 h-8 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-gray-300">Loading GIFs...</p>
            </div>
          )}
        </div>

        {/* Footer - Official GIPHY Attribution */}
        <div className="p-4 border-t border-white/20 bg-black/20">
          <div className="flex items-center justify-center gap-2">
            <span className="text-gray-300 text-sm font-medium">Powered by</span>
            <svg
              viewBox="0 0 200 50"
              className="h-5"
              role="img"
              aria-label="GIPHY"
            >
              <text
                x="10"
                y="35"
                fill="#00FF99"
                fontSize="32"
                fontWeight="900"
                fontFamily="Arial, sans-serif"
                letterSpacing="2"
              >
                GIPHY
              </text>
            </svg>
          </div>
        </div>
      </div>
    </div>
  )
}