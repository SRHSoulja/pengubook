'use client'

import { useState, useEffect } from 'react'
import Navbar from '@/components/Navbar'
import Link from 'next/link'

interface Supporter {
  id: string
  amount: string
  message: string | null
  usdValueAtTime: string | null
  createdAt: string
  fromUser: {
    id: string
    username: string | null
    displayName: string | null
    avatar: string | null
    level: number
  }
  token: {
    symbol: string
    logoUrl: string | null
  }
}

export default function WallOfThanksPage() {
  const [supporters, setSupporters] = useState<Supporter[]>([])
  const [loading, setLoading] = useState(true)
  const [totalSupport, setTotalSupport] = useState<number>(0)

  useEffect(() => {
    fetchSupporters()
  }, [])

  const fetchSupporters = async () => {
    try {
      // Fetch tips sent to the platform user
      const response = await fetch('/api/tips?userId=platform-pebloq-tips&type=received&limit=50')
      if (response.ok) {
        const data = await response.json()
        setSupporters(data.tips || [])

        // Calculate total USD support
        const total = data.tips.reduce((sum: number, tip: Supporter) => {
          if (tip.usdValueAtTime) {
            return sum + parseFloat(tip.usdValueAtTime)
          }
          return sum
        }, 0)
        setTotalSupport(total)
      }
    } catch (err) {
      console.error('Failed to fetch supporters:', err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-purple-900 to-indigo-900">
      <Navbar />

      <div className="container mx-auto px-4 py-12">
        <div className="max-w-5xl mx-auto">
          {/* Header */}
          <div className="text-center mb-12">
            <div className="flex justify-center mb-6">
              <img
                src="https://gmgnrepeat.com/icons/pengubookicon1.png"
                alt="PeBloq"
                className="w-24 h-24 animate-float"
              />
            </div>
            <h1 className="text-5xl font-bold text-white mb-4">
              Wall of Thanks 🙏
            </h1>
            <p className="text-xl text-gray-300 mb-6">
              Honoring our amazing supporters who keep PeBloq waddles going!
            </p>

            {/* Total Support Stats */}
            <div className="inline-flex items-center gap-6 bg-white/10 backdrop-blur-lg border border-white/20 rounded-2xl px-8 py-4">
              <div className="text-center">
                <div className="text-3xl font-bold text-cyan-400">{supporters.length}</div>
                <div className="text-sm text-gray-300">Supporters</div>
              </div>
              {totalSupport > 0 && (
                <>
                  <div className="w-px h-12 bg-white/20"></div>
                  <div className="text-center">
                    <div className="text-3xl font-bold text-green-400">
                      ${totalSupport.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                    <div className="text-sm text-gray-300">Total Support</div>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Support PeBloq CTA */}
          <div className="bg-gradient-to-r from-cyan-500/20 to-blue-500/20 border border-cyan-400/30 rounded-2xl p-6 mb-8 text-center">
            <h3 className="text-xl font-bold text-white mb-2">Want to support PeBloq?</h3>
            <p className="text-gray-300 mb-4">Your contribution helps us keep improving the platform!</p>
            <Link
              href="/tip-platform"
              className="inline-block bg-gradient-to-r from-cyan-500 to-blue-500 text-white px-6 py-3 rounded-xl hover:from-cyan-600 hover:to-blue-600 transition-colors font-semibold"
            >
              💙 Support PeBloq
            </Link>
          </div>

          {/* Supporters List */}
          {loading ? (
            <div className="text-center py-12">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-cyan-400"></div>
              <p className="text-gray-300 mt-4">Loading supporters...</p>
            </div>
          ) : supporters.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {supporters.map((supporter) => (
                <div
                  key={supporter.id}
                  className="bg-white/10 backdrop-blur-lg rounded-xl border border-white/20 p-6 hover:bg-white/15 transition-all hover:scale-105"
                >
                  <div className="flex items-start gap-4">
                    {/* Supporter Avatar */}
                    <Link href={`/profile/${supporter.fromUser.id}`}>
                      <div className="w-14 h-14 rounded-full overflow-hidden bg-gradient-to-br from-cyan-500 to-blue-500 flex-shrink-0 hover:ring-2 hover:ring-cyan-400 transition-all">
                        {supporter.fromUser.avatar ? (
                          <img
                            src={supporter.fromUser.avatar}
                            alt={supporter.fromUser.username || 'Supporter'}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-white font-bold text-xl">
                            {(supporter.fromUser.username || supporter.fromUser.displayName || '?').charAt(0).toUpperCase()}
                          </div>
                        )}
                      </div>
                    </Link>

                    {/* Supporter Details */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-2">
                        <Link
                          href={`/profile/${supporter.fromUser.id}`}
                          className="font-semibold text-white hover:text-cyan-400 transition-colors flex items-center gap-2"
                        >
                          <span>{supporter.fromUser.displayName || supporter.fromUser.username || 'Anonymous Penguin'}</span>
                          {supporter.fromUser.level >= 10 && (
                            <span className="text-yellow-400" title={`Level ${supporter.fromUser.level}`}>⭐</span>
                          )}
                        </Link>
                        <span className="text-xs text-gray-400">
                          {new Date(supporter.createdAt).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric'
                          })}
                        </span>
                      </div>

                      {/* Contribution Amount */}
                      <div className="flex items-center gap-2 mb-2">
                        {supporter.token.logoUrl && (
                          <img src={supporter.token.logoUrl} alt={supporter.token.symbol} className="w-5 h-5 rounded-full" />
                        )}
                        <span className="font-bold text-cyan-400">
                          {supporter.amount} {supporter.token.symbol}
                        </span>
                        {supporter.usdValueAtTime && (
                          <span className="text-sm text-green-400">
                            (${parseFloat(supporter.usdValueAtTime).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })})
                          </span>
                        )}
                      </div>

                      {/* Message */}
                      {supporter.message && (
                        <div className="bg-white/5 rounded-lg p-3 mt-2">
                          <p className="text-gray-200 text-sm italic whitespace-pre-wrap break-words">
                            "{supporter.message}"
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center text-gray-300 py-12 bg-white/5 rounded-2xl">
              <div className="text-6xl mb-4">🐧</div>
              <h3 className="text-xl font-semibold mb-2">No supporters yet</h3>
              <p className="mb-6">Be the first to support PeBloq and get featured here!</p>
              <Link
                href="/tip-platform"
                className="inline-block bg-gradient-to-r from-cyan-500 to-blue-500 text-white px-6 py-3 rounded-xl hover:from-cyan-600 hover:to-blue-600 transition-colors font-semibold"
              >
                Support PeBloq
              </Link>
            </div>
          )}

          {/* Footer Message */}
          <div className="mt-12 text-center">
            <p className="text-gray-400 text-sm">
              Every contribution, no matter the size, helps us build a better platform for everyone. Thank you! 💙
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
