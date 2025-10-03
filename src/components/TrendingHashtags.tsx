'use client'

import { useState, useEffect } from 'react'

interface TrendingHashtag {
  tag: string
  usageCount: number
  recentPosts: number
  growth: number
}

interface TrendingHashtagsProps {
  timeframe?: 'hour' | 'day' | 'week' | 'month'
  limit?: number
  showGrowth?: boolean
  onHashtagClick?: (hashtag: string) => void
}

export default function TrendingHashtags({
  timeframe = 'day',
  limit = 10,
  showGrowth = true,
  onHashtagClick
}: TrendingHashtagsProps) {
  const [hashtags, setHashtags] = useState<TrendingHashtag[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [selectedTimeframe, setSelectedTimeframe] = useState(timeframe)

  useEffect(() => {
    fetchTrendingHashtags()
  }, [selectedTimeframe, limit])

  const fetchTrendingHashtags = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/hashtags/trending?timeframe=${selectedTimeframe}&limit=${limit}`)
      const data = await response.json()

      if (response.ok) {
        setHashtags(data.hashtags)
        setError('')
      } else {
        setError(data.error || 'Failed to fetch trending hashtags')
      }
    } catch (err) {
      console.error('Error fetching trending hashtags:', err)
      setError('Failed to fetch trending hashtags')
    } finally {
      setLoading(false)
    }
  }

  const handleHashtagClick = (tag: string) => {
    if (onHashtagClick) {
      onHashtagClick(tag)
    } else {
      // Default behavior: search for the hashtag in feed
      window.location.href = `/feed/search?q=%23${tag}`
    }
  }

  const formatGrowth = (growth: number): string => {
    if (growth > 0) {
      return `+${growth.toFixed(1)}%`
    } else if (growth < 0) {
      return `${growth.toFixed(1)}%`
    } else {
      return '0%'
    }
  }

  const getGrowthColor = (growth: number): string => {
    if (growth > 20) return 'text-green-400'
    if (growth > 0) return 'text-green-300'
    if (growth < -20) return 'text-red-400'
    if (growth < 0) return 'text-red-300'
    return 'text-gray-400'
  }

  const timeframeOptions = [
    { value: 'hour', label: '1H', icon: '⚡' },
    { value: 'day', label: '1D', icon: '📅' },
    { value: 'week', label: '1W', icon: '📊' },
    { value: 'month', label: '1M', icon: '📈' }
  ]

  return (
    <div className="bg-black/90 backdrop-blur-lg border border-white/20 rounded-2xl p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-white flex items-center">
          <span className="mr-2">🔥</span>
          Trending
        </h3>
        <div className="flex space-x-1">
          {timeframeOptions.map((option) => (
            <button
              key={option.value}
              onClick={() => setSelectedTimeframe(option.value as any)}
              className={`
                px-2 py-1 text-xs rounded transition-colors
                ${selectedTimeframe === option.value
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/50'
                  : 'text-gray-400 hover:text-gray-300'
                }
              `}
              title={`Last ${option.label.toLowerCase()}`}
            >
              <span className="mr-1">{option.icon}</span>
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="text-center py-4">
          <div className="w-6 h-6 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
          <p className="text-gray-400 text-sm">Loading trends...</p>
        </div>
      ) : error ? (
        <div className="text-center py-4">
          <p className="text-red-300 text-sm">{error}</p>
        </div>
      ) : hashtags.length === 0 ? (
        <div className="text-center py-4">
          <p className="text-gray-400 text-sm">No trending hashtags yet</p>
        </div>
      ) : (
        <div className="space-y-2">
          {hashtags.map((hashtag, index) => (
            <div
              key={hashtag.tag}
              className="flex items-center justify-between p-2 rounded-lg hover:bg-white/5 cursor-pointer transition-colors group"
              onClick={() => handleHashtagClick(hashtag.tag)}
            >
              <div className="flex items-center space-x-3 flex-1">
                <div className="text-gray-400 text-sm font-mono w-4 text-center">
                  {index + 1}
                </div>
                <div className="flex-1">
                  <div className="text-cyan-400 font-medium group-hover:text-cyan-300 transition-colors">
                    #{hashtag.tag}
                  </div>
                  <div className="text-gray-400 text-xs">
                    {hashtag.recentPosts} posts
                    {showGrowth && hashtag.growth !== 0 && (
                      <span className={`ml-2 ${getGrowthColor(hashtag.growth)}`}>
                        {formatGrowth(hashtag.growth)}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {hashtag.growth > 50 && (
                <div className="text-orange-400" title="Hot trending!">
                  🔥
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <div className="mt-4 pt-3 border-t border-white/10">
        <p className="text-xs text-gray-400 text-center">
          Hashtags trending in the last {selectedTimeframe === 'hour' ? 'hour' : selectedTimeframe}
        </p>
      </div>
    </div>
  )
}