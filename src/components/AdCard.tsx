'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/providers/AuthProvider'

interface AdCardProps {
  ad: {
    id: string
    title: string
    description: string
    imageUrl: string | null
    linkUrl: string | null
    creator: {
      id: string
      username: string
      displayName: string
      avatar: string | null
    }
  }
  className?: string
}

export default function AdCard({ ad, className = '' }: AdCardProps) {
  const { user } = useAuth()
  const [hasViewed, setHasViewed] = useState(false)

  useEffect(() => {
    // Record view impression when ad comes into view
    if (!hasViewed) {
      recordInteraction('VIEW')
      setHasViewed(true)
    }
  }, [hasViewed])

  const recordInteraction = async (interactionType: string) => {
    try {
      await fetch(`/api/ads/${ad.id}/interact`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(user?.walletAddress && { 'x-wallet-address': user.walletAddress })
        },
        body: JSON.stringify({ interactionType })
      })
    } catch (error) {
      console.error('Error recording ad interaction:', error)
    }
  }

  const handleClick = async () => {
    await recordInteraction('CLICK')

    if (ad.linkUrl) {
      window.open(ad.linkUrl, '_blank', 'noopener,noreferrer')
    }
  }

  return (
    <div className={`bg-gradient-to-r from-yellow-500/10 to-orange-500/10 backdrop-blur-lg rounded-2xl border-2 border-yellow-500/30 p-6 relative ${className}`}>
      {/* Ad Label */}
      <div className="absolute top-4 right-4">
        <span className="bg-yellow-500/20 text-yellow-300 px-3 py-1 rounded-full text-xs font-semibold">
          💫 Sponsored
        </span>
      </div>

      <div className="flex items-start space-x-4">
        {/* Creator Avatar */}
        <div className="w-12 h-12 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-full flex items-center justify-center overflow-hidden flex-shrink-0">
          {ad.creator.avatar ? (
            <img
              src={ad.creator.avatar}
              alt={ad.creator.displayName}
              className="w-full h-full object-cover"
            />
          ) : (
            <span className="text-xl">🏢</span>
          )}
        </div>

        {/* Ad Content */}
        <div className="flex-1">
          <div className="flex items-center space-x-2 mb-2">
            <h3 className="font-semibold text-white">{ad.creator.displayName}</h3>
            <span className="text-sm text-yellow-300">@{ad.creator.username}</span>
          </div>

          {/* Ad Title */}
          <h4 className="text-lg font-bold text-white mb-2">{ad.title}</h4>

          {/* Ad Description */}
          <p className="text-gray-200 mb-4 leading-relaxed">{ad.description}</p>

          {/* Ad Image */}
          {ad.imageUrl && (
            <div className="mb-4">
              <img
                src={ad.imageUrl}
                alt={ad.title}
                className="w-full max-h-64 object-cover rounded-xl"
              />
            </div>
          )}

          {/* CTA Button */}
          {ad.linkUrl && (
            <button
              onClick={handleClick}
              className="bg-gradient-to-r from-yellow-500 to-orange-500 text-white font-bold py-3 px-6 rounded-xl hover:from-yellow-600 hover:to-orange-600 transition-all transform hover:scale-105 shadow-lg"
            >
              Learn More ✨
            </button>
          )}
        </div>
      </div>

      {/* Penguin Touch */}
      <div className="absolute bottom-2 left-2 text-xs text-yellow-400/60">
        🐧 PenguAds
      </div>
    </div>
  )
}