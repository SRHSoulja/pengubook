'use client'

import { useState } from 'react'

interface RichContentRendererProps {
  content: string
  mediaUrls?: string[]
  className?: string
  showFullContent?: boolean
}

interface LinkPreview {
  url: string
  title?: string
  description?: string
  image?: string
  siteName?: string
}

export default function RichContentRenderer({
  content,
  mediaUrls = [],
  className = '',
  showFullContent = false
}: RichContentRendererProps) {
  const [imageErrors, setImageErrors] = useState<Set<string>>(new Set())
  const [videoErrors, setVideoErrors] = useState<Set<string>>(new Set())
  const [showMore, setShowMore] = useState(showFullContent)

  // Extract URLs from content for potential link previews
  const urlRegex = /https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)/g
  const urls = content.match(urlRegex) || []

  // Categorize media by type
  const images = mediaUrls.filter(url =>
    /\.(jpg|jpeg|png|gif|webp)(\?.*)?$/i.test(url) && !imageErrors.has(url)
  )
  const videos = mediaUrls.filter(url =>
    /\.(mp4|webm|mov)(\?.*)?$/i.test(url) && !videoErrors.has(url)
  )

  // Handle image load errors
  const handleImageError = (url: string) => {
    setImageErrors(prev => new Set(Array.from(prev).concat(url)))
  }

  // Handle video load errors
  const handleVideoError = (url: string) => {
    setVideoErrors(prev => new Set(Array.from(prev).concat(url)))
  }

  // Truncate content for preview
  const shouldTruncate = content.length > 280 && !showFullContent && !showMore
  const displayContent = shouldTruncate
    ? content.substring(0, 280) + '...'
    : content

  // Format content with basic formatting (line breaks, mentions, hashtags)
  const formatContent = (text: string) => {
    return text
      .split('\n')
      .map((line, i) => (
        <span key={i}>
          {formatLine(line)}
          {i < text.split('\n').length - 1 && <br />}
        </span>
      ))
  }

  // Format a single line (mentions, hashtags, links)
  const formatLine = (line: string) => {
    const parts = []
    let lastIndex = 0

    // Replace URLs with links
    line.replace(urlRegex, (match, ...args) => {
      const url = match
      const index = args[args.length - 2]

      if (index > lastIndex) {
        parts.push(formatTextSegment(line.substring(lastIndex, index)))
      }

      parts.push(
        <a
          key={`url-${index}`}
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-cyan-400 hover:text-cyan-300 underline"
        >
          {url.length > 50 ? url.substring(0, 50) + '...' : url}
        </a>
      )

      lastIndex = index + match.length
      return match
    })

    if (lastIndex < line.length) {
      parts.push(formatTextSegment(line.substring(lastIndex)))
    }

    return parts.length > 0 ? parts : formatTextSegment(line)
  }

  // Format text segments for mentions and hashtags
  const formatTextSegment = (text: string) => {
    return text.split(/(@\w+|#\w+)/g).map((part, i) => {
      if (part.startsWith('@')) {
        return (
          <span key={i} className="text-purple-400 hover:text-purple-300 cursor-pointer">
            {part}
          </span>
        )
      }
      if (part.startsWith('#')) {
        return (
          <span key={i} className="text-cyan-400 hover:text-cyan-300 cursor-pointer">
            {part}
          </span>
        )
      }
      return <span key={i}>{part}</span>
    })
  }

  // Check if URL is a known embed (YouTube, Twitter, etc.)
  const getEmbedType = (url: string) => {
    if (url.includes('youtube.com') || url.includes('youtu.be')) {
      return 'youtube'
    }
    if (url.includes('twitter.com') || url.includes('x.com')) {
      return 'twitter'
    }
    if (url.includes('spotify.com')) {
      return 'spotify'
    }
    return null
  }

  // Extract YouTube video ID
  const getYouTubeId = (url: string) => {
    const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\n?#]+)/)
    return match ? match[1] : null
  }

  return (
    <div className={`space-y-3 ${className}`}>
      {/* Text Content */}
      {content && (
        <div className="text-gray-200 leading-relaxed">
          {formatContent(displayContent)}

          {shouldTruncate && (
            <button
              onClick={() => setShowMore(true)}
              className="text-cyan-400 hover:text-cyan-300 ml-2 text-sm"
            >
              Show more
            </button>
          )}

          {showMore && !showFullContent && content.length > 280 && (
            <button
              onClick={() => setShowMore(false)}
              className="text-cyan-400 hover:text-cyan-300 ml-2 text-sm"
            >
              Show less
            </button>
          )}
        </div>
      )}

      {/* Images */}
      {images.length > 0 && (
        <div className={`grid gap-2 ${
          images.length === 1 ? 'grid-cols-1' :
          images.length === 2 ? 'grid-cols-2' :
          images.length === 3 ? 'grid-cols-3' :
          'grid-cols-2'
        }`}>
          {images.slice(0, 4).map((imageUrl, index) => (
            <div
              key={index}
              className={`relative rounded-lg overflow-hidden bg-gray-800 ${
                images.length === 3 && index === 0 ? 'col-span-2' : ''
              }`}
            >
              <img
                src={imageUrl}
                alt={`Media ${index + 1}`}
                className="w-full h-auto max-h-96 object-cover hover:scale-105 transition-transform duration-200 cursor-pointer"
                onError={() => handleImageError(imageUrl)}
                onClick={() => {
                  const newWindow = window.open(imageUrl, '_blank', 'noopener,noreferrer')
                  if (newWindow) newWindow.opener = null
                }}
              />

              {images.length > 4 && index === 3 && (
                <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                  <span className="text-white font-semibold text-lg">
                    +{images.length - 4} more
                  </span>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Videos */}
      {videos.length > 0 && (
        <div className="space-y-2">
          {videos.map((videoUrl, index) => (
            <div key={index} className="relative rounded-lg overflow-hidden bg-gray-800">
              <video
                src={videoUrl}
                controls
                className="w-full max-h-96 object-cover"
                onError={() => handleVideoError(videoUrl)}
                preload="metadata"
              >
                Your browser does not support the video tag.
              </video>
            </div>
          ))}
        </div>
      )}

      {/* Link Previews / Embeds */}
      {urls.length > 0 && (
        <div className="space-y-2">
          {urls.slice(0, 2).map((url, index) => {
            const embedType = getEmbedType(url)

            if (embedType === 'youtube') {
              const videoId = getYouTubeId(url)
              if (videoId) {
                return (
                  <div key={index} className="aspect-video rounded-lg overflow-hidden bg-gray-800">
                    <iframe
                      src={`https://www.youtube-nocookie.com/embed/${videoId}`}
                      title={`YouTube video ${index + 1}`}
                      className="w-full h-full"
                      frameBorder="0"
                      sandbox="allow-scripts allow-same-origin allow-presentation"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                    />
                  </div>
                )
              }
            }

            // For other URLs, show a simple link preview placeholder
            // In a real implementation, you'd fetch metadata from the URL
            return (
              <div key={index} className="border border-white/20 rounded-lg p-4 bg-black/20">
                <div className="flex items-start gap-3">
                  <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-blue-500 rounded-lg flex items-center justify-center text-2xl">
                    🔗
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-white font-semibold truncate">
                      Link Preview
                    </h4>
                    <p className="text-gray-300 text-sm truncate">
                      {url}
                    </p>
                    <a
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-cyan-400 text-sm hover:text-cyan-300"
                    >
                      Visit link →
                    </a>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Error states */}
      {imageErrors.size > 0 && (
        <div className="text-gray-500 text-sm">
          Some images failed to load
        </div>
      )}

      {videoErrors.size > 0 && (
        <div className="text-gray-500 text-sm">
          Some videos failed to load
        </div>
      )}
    </div>
  )
}