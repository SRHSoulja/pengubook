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
    <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-50 flex items-center justify-center p-4">
      <div className="bg-gray-900 rounded-2xl border border-white/20 w-full max-w-5xl max-h-[85vh] overflow-hidden flex flex-col shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-white/20 bg-gradient-to-r from-gray-900 to-gray-800">
          <div className="flex items-center gap-3">
            <span className="text-3xl">🎭</span>
            <h2 className="text-2xl font-bold text-white">Choose a GIF</h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-300 hover:text-white hover:bg-white/10 transition-all p-2 rounded-lg"
            aria-label="Close"
          >
            <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Search */}
        <div className="p-4 border-b border-white/20 bg-gray-800/50">
          <div className="relative">
            <input
              ref={searchInputRef}
              type="text"
              placeholder="Search GIPHY for the perfect GIF..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              className="w-full bg-black/40 border-2 border-white/20 rounded-xl px-4 py-3 pl-12 text-white text-lg placeholder-gray-400 focus:outline-none focus:border-pengu-green focus:ring-2 focus:ring-pengu-green/20 transition-all"
            />
            <div className="absolute left-4 top-1/2 transform -translate-y-1/2">
              {loading ? (
                <div className="w-6 h-6 border-2 border-pengu-green border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <svg className="w-6 h-6 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              )}
            </div>
          </div>
        </div>

        {/* Content - Scrollable Area */}
        <div className="p-4 flex-1 overflow-y-auto" style={{ maxHeight: 'calc(85vh - 200px)' }}>
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
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {gifs.map((gif) => (
                <button
                  key={gif.id}
                  onClick={() => handleGifSelect(gif)}
                  className="relative group rounded-xl overflow-hidden hover:ring-4 hover:ring-pengu-green hover:shadow-lg hover:shadow-pengu-green/30 transition-all transform hover:scale-[1.02]"
                >
                  <img
                    src={gif.images.preview}
                    alt={gif.title}
                    className="w-full h-36 object-cover group-hover:scale-110 transition-transform duration-300"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                  <div className="absolute bottom-0 left-0 right-0 p-3 opacity-0 group-hover:opacity-100 transition-opacity">
                    <p className="text-white text-sm font-medium truncate">{gif.title}</p>
                  </div>
                  {/* Hover Indicator */}
                  <div className="absolute top-2 right-2 bg-pengu-green text-black rounded-full p-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
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
        <div className="p-4 border-t border-white/10 bg-gradient-to-r from-black/40 to-gray-900/40">
          <div className="flex items-center justify-center gap-3">
            <span className="text-gray-300 text-base font-semibold">Powered by</span>
            <svg
              viewBox="0 0 200 50"
              className="h-6"
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
                letterSpacing="3"
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