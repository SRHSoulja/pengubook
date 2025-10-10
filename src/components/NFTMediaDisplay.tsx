'use client'

import { useState } from 'react'

interface NFTMediaDisplayProps {
  imageUrl?: string
  animationUrl?: string
  mediaType?: 'image' | 'video' | 'audio' | 'model' | 'html'
  name?: string
  className?: string
}

export default function NFTMediaDisplay({
  imageUrl,
  animationUrl,
  mediaType = 'image',
  name,
  className = ''
}: NFTMediaDisplayProps) {
  const [error, setError] = useState(false)
  const [loading, setLoading] = useState(true)

  // Use animation URL if available, otherwise fallback to image
  const primaryUrl = animationUrl || imageUrl

  if (error || !primaryUrl) {
    return (
      <div className={`bg-gray-800 flex items-center justify-center ${className}`}>
        <div className="text-center text-gray-500">
          <div className="text-4xl mb-2">🖼️</div>
          <p className="text-sm">No media available</p>
        </div>
      </div>
    )
  }

  // Render based on media type
  switch (mediaType) {
    case 'video':
      return (
        <div className={`relative bg-black ${className}`}>
          <video
            src={primaryUrl}
            poster={imageUrl}
            controls
            loop
            muted
            playsInline
            className="w-full h-full object-contain"
            onError={() => setError(true)}
            onLoadedData={() => setLoading(false)}
          >
            Your browser does not support the video tag.
          </video>
          {loading && imageUrl && (
            <img
              src={imageUrl}
              alt={name}
              className="absolute inset-0 w-full h-full object-cover"
            />
          )}
        </div>
      )

    case 'audio':
      return (
        <div className={`relative bg-gradient-to-br from-purple-900 to-blue-900 flex flex-col items-center justify-center ${className}`}>
          {imageUrl && (
            <img
              src={imageUrl}
              alt={name}
              className="absolute inset-0 w-full h-full object-cover opacity-30"
              onError={() => setError(true)}
            />
          )}
          <div className="relative z-10 flex flex-col items-center gap-4 p-4">
            <div className="text-5xl">🎵</div>
            <audio
              src={primaryUrl}
              controls
              className="w-full max-w-sm"
              onError={() => setError(true)}
            >
              Your browser does not support the audio tag.
            </audio>
          </div>
        </div>
      )

    case 'model':
      return (
        <div className={`relative bg-gray-900 flex items-center justify-center ${className}`}>
          {imageUrl && (
            <img
              src={imageUrl}
              alt={name}
              className="w-full h-full object-cover opacity-50"
              onError={() => setError(true)}
            />
          )}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center">
              <div className="text-6xl mb-4">🎨</div>
              <p className="text-white text-sm mb-2">3D Model</p>
              <a
                href={primaryUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-2 bg-cyan-500 text-white rounded-lg hover:bg-cyan-600 transition-colors inline-block"
              >
                View Model
              </a>
            </div>
          </div>
        </div>
      )

    case 'html':
      return (
        <div className={`relative bg-black ${className}`}>
          <iframe
            src={primaryUrl}
            className="w-full h-full border-0"
            sandbox="allow-scripts allow-same-origin"
            onError={() => setError(true)}
            onLoad={() => setLoading(false)}
          />
          {loading && imageUrl && (
            <img
              src={imageUrl}
              alt={name}
              className="absolute inset-0 w-full h-full object-cover"
            />
          )}
        </div>
      )

    case 'image':
    default:
      return (
        <div className={`relative bg-gray-900 ${className}`}>
          <img
            src={primaryUrl}
            alt={name || 'NFT'}
            className="w-full h-full object-cover"
            onError={() => setError(true)}
            onLoad={() => setLoading(false)}
            loading="lazy"
          />
          {loading && (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-800 animate-pulse">
              <div className="text-gray-500">Loading...</div>
            </div>
          )}
        </div>
      )
  }
}
