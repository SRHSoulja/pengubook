'use client'

import { useState, useEffect } from 'react'
import { GiphyService } from '@/lib/giphy'

interface GifPickerProps {
  isOpen: boolean
  onClose: () => void
  onSelectGif: (gifUrl: string) => void
}

export default function GifPicker({ isOpen, onClose, onSelectGif }: GifPickerProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [gifs, setGifs] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Search for GIFs
  const searchGifs = async (query: string) => {
    if (!query.trim()) {
      setGifs([])
      return
    }

    setLoading(true)
    setError(null)

    try {
      const results = await GiphyService.search(query, 20)
      setGifs(results.data)
    } catch (error) {
      console.error('Error searching GIFs:', error)
      setError('Failed to search GIFs')
    } finally {
      setLoading(false)
    }
  }

  // Load trending GIFs on open
  useEffect(() => {
    if (isOpen && gifs.length === 0) {
      loadTrendingGifs()
    }
  }, [isOpen])

  const loadTrendingGifs = async () => {
    setLoading(true)
    setError(null)

    try {
      const results = await GiphyService.trending(20)
      setGifs(results.data)
    } catch (error) {
      console.error('Error loading trending GIFs:', error)
      setError('Failed to load trending GIFs')
    } finally {
      setLoading(false)
    }
  }

  // Handle search input change
  const handleSearchChange = (value: string) => {
    setSearchQuery(value)
    if (value.trim()) {
      // Debounce search
      const timeoutId = setTimeout(() => {
        searchGifs(value)
      }, 500)
      return () => clearTimeout(timeoutId)
    } else {
      loadTrendingGifs()
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="glass-card-strong max-w-2xl w-full max-h-[80vh] overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b border-white/10">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-white">Choose a GIF</h3>
            <button
              onClick={onClose}
              className="text-gray-300 hover:text-white transition-colors"
              aria-label="Close GIF picker"
            >
              ✕
            </button>
          </div>

          {/* Search Input */}
          <div className="relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => handleSearchChange(e.target.value)}
              placeholder="Search for GIFs..."
              className="w-full px-4 py-2 bg-black/50 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
            <div className="absolute right-3 top-2.5 text-gray-300">
              🔍
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-4 overflow-y-auto max-h-96">
          {error && (
            <div className="text-center py-8">
              <p className="text-red-400">{error}</p>
              <button
                onClick={() => loadTrendingGifs()}
                className="mt-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
              >
                Retry
              </button>
            </div>
          )}

          {loading && (
            <div className="text-center py-8">
              <div className="animate-spin w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full mx-auto mb-2" />
              <p className="text-gray-300">Searching for GIFs...</p>
            </div>
          )}

          {!loading && !error && gifs.length === 0 && searchQuery && (
            <div className="text-center py-8">
              <p className="text-gray-300">No GIFs found for "{searchQuery}"</p>
            </div>
          )}

          {/* GIF Grid */}
          {gifs.length > 0 && (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {gifs.map((gif) => (
                <button
                  key={gif.id}
                  onClick={() => {
                    onSelectGif(gif.images.original.url)
                    onClose()
                  }}
                  className="aspect-square bg-gray-800 rounded-lg overflow-hidden hover:ring-2 hover:ring-purple-500 transition-all group"
                >
                  <img
                    src={gif.images.fixed_width.url}
                    alt={gif.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                  />
                </button>
              ))}
            </div>
          )}

          {/* Load more button */}
          {gifs.length > 0 && !loading && (
            <div className="text-center mt-4">
              <button
                onClick={() => searchQuery ? searchGifs(searchQuery) : loadTrendingGifs()}
                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
              >
                Load More
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-white/10 text-center">
          <p className="text-xs text-gray-300">
            Powered by <span className="text-purple-400">GIPHY</span>
          </p>
        </div>
      </div>
    </div>
  )
}