'use client'

import { useState } from 'react'

interface EmbedInputProps {
  isOpen: boolean
  onClose: () => void
  onAddEmbed: (embedData: EmbedData) => void
}

export interface EmbedData {
  type: 'link' | 'youtube' | 'twitter' | 'image'
  url: string
  title?: string
  description?: string
  thumbnail?: string
  embedHtml?: string
}

export default function EmbedInput({ isOpen, onClose, onAddEmbed }: EmbedInputProps) {
  const [url, setUrl] = useState('')
  const [loading, setLoading] = useState(false)
  const [preview, setPreview] = useState<EmbedData | null>(null)

  // Parse URL and generate embed data
  const parseUrl = async (inputUrl: string): Promise<EmbedData> => {
    const urlObj = new URL(inputUrl)

    // YouTube detection
    if (urlObj.hostname.includes('youtube.com') || urlObj.hostname.includes('youtu.be')) {
      const videoId = urlObj.hostname.includes('youtu.be')
        ? urlObj.pathname.slice(1)
        : urlObj.searchParams.get('v')

      if (videoId) {
        return {
          type: 'youtube',
          url: inputUrl,
          title: 'YouTube Video',
          thumbnail: `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`,
          embedHtml: `<iframe width="560" height="315" src="https://www.youtube.com/embed/${videoId}" frameborder="0" allowfullscreen></iframe>`
        }
      }
    }

    // Twitter detection
    if (urlObj.hostname.includes('twitter.com') || urlObj.hostname.includes('x.com')) {
      return {
        type: 'twitter',
        url: inputUrl,
        title: 'Twitter Post',
        description: 'Twitter/X post embed'
      }
    }

    // Image detection
    if (inputUrl.match(/\.(jpg|jpeg|png|gif|webp)$/i)) {
      return {
        type: 'image',
        url: inputUrl,
        title: 'Image',
        thumbnail: inputUrl
      }
    }

    // Generic link
    return {
      type: 'link',
      url: inputUrl,
      title: urlObj.hostname,
      description: 'External link'
    }
  }

  // Handle URL input
  const handleUrlChange = async (inputUrl: string) => {
    setUrl(inputUrl)
    setPreview(null)

    if (!inputUrl.trim()) return

    try {
      new URL(inputUrl) // Validate URL
      setLoading(true)
      const embedData = await parseUrl(inputUrl)
      setPreview(embedData)
    } catch (error) {
      console.error('Invalid URL:', error)
    } finally {
      setLoading(false)
    }
  }

  // Handle adding embed
  const handleAddEmbed = () => {
    if (preview) {
      onAddEmbed(preview)
      setUrl('')
      setPreview(null)
      onClose()
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="glass-card-strong max-w-md w-full">
        {/* Header */}
        <div className="p-4 border-b border-white/10">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-white">Add Link</h3>
            <button
              onClick={onClose}
              className="text-gray-300 hover:text-white transition-colors"
              aria-label="Close link input"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4">
          {/* URL Input */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              URL or Link
            </label>
            <input
              type="url"
              value={url}
              onChange={(e) => handleUrlChange(e.target.value)}
              placeholder="https://example.com"
              className="w-full px-4 py-2 bg-black/50 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>

          {/* Loading */}
          {loading && (
            <div className="text-center py-4">
              <div className="animate-spin w-6 h-6 border-2 border-purple-500 border-t-transparent rounded-full mx-auto mb-2" />
              <p className="text-sm text-gray-300">Generating preview...</p>
            </div>
          )}

          {/* Preview */}
          {preview && (
            <div className="bg-black/30 rounded-lg p-3 border border-white/10">
              <div className="flex items-start space-x-3">
                {/* Thumbnail */}
                {preview.thumbnail && (
                  <img
                    src={preview.thumbnail}
                    alt="Preview"
                    className="w-16 h-16 object-cover rounded-lg flex-shrink-0"
                  />
                )}

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-2 mb-1">
                    <span className="text-xs px-2 py-1 bg-purple-600 text-white rounded uppercase">
                      {preview.type}
                    </span>
                  </div>
                  <h4 className="text-white font-medium text-sm truncate">
                    {preview.title}
                  </h4>
                  {preview.description && (
                    <p className="text-gray-300 text-xs mt-1 line-clamp-2">
                      {preview.description}
                    </p>
                  )}
                  <p className="text-purple-400 text-xs mt-1 truncate">
                    {preview.url}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Supported formats info */}
          <div className="text-xs text-gray-300">
            <p className="font-medium mb-1">Supported formats:</p>
            <ul className="space-y-1">
              <li>• YouTube videos</li>
              <li>• Twitter/X posts</li>
              <li>• Direct image links</li>
              <li>• General web links</li>
            </ul>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-white/10 flex space-x-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleAddEmbed}
            disabled={!preview}
            className="flex-1 px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-purple-800 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
          >
            Add Link
          </button>
        </div>
      </div>
    </div>
  )
}