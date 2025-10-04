'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/providers/AuthProvider'
import { useTheme } from '@/providers/ThemeProvider'
import Navbar from '@/components/Navbar'
import AchievementBadge from '@/components/AchievementBadge'
import Link from 'next/link'

interface Achievement {
  id: string
  name: string
  title: string
  description: string
  icon: string
  category: string
  rarity: string
  requirement: number
  earned: boolean
  progress: number
  currentValue: number
  unlockedAt: string | null
}

interface AchievementData {
  user: {
    id: string
    username: string
    displayName: string
    avatar: string
  }
  achievements: Record<string, Achievement[]>
  stats: {
    total: number
    earned: number
    completion: number
  }
}

export default function AchievementsPage() {
  const { user, isAuthenticated, loading: authLoading } = useAuth()
  const { currentTheme } = useTheme()
  const [achievementData, setAchievementData] = useState<AchievementData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL')
  const [selectedAchievement, setSelectedAchievement] = useState<Achievement | null>(null)

  const categories = [
    { key: 'ALL', label: 'All', icon: '🏆' },
    { key: 'ENGAGEMENT', label: 'Engagement', icon: '🎯' },
    { key: 'SOCIAL', label: 'Social', icon: '👥' },
    { key: 'CONTENT', label: 'Content', icon: '📝' },
    { key: 'MILESTONE', label: 'Milestone', icon: '🎖️' },
    { key: 'SPECIAL', label: 'Special', icon: '✨' }
  ]

  useEffect(() => {
    if (user) {
      fetchAchievements()
    }
  }, [user])

  const fetchAchievements = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/achievements', {
        headers: {
          'x-wallet-address': user?.walletAddress || ''
        }
      })

      const data = await response.json()
      if (response.ok) {
        setAchievementData(data)
      } else {
        setError(data.error || 'Failed to fetch achievements')
      }
    } catch (err) {
      console.error('Error fetching achievements:', err)
      setError('Failed to fetch achievements')
    } finally {
      setLoading(false)
    }
  }

  const getFilteredAchievements = (): Achievement[] => {
    if (!achievementData) return []

    let allAchievements: Achievement[] = []
    for (const categoryAchievements of Object.values(achievementData.achievements)) {
      allAchievements = [...allAchievements, ...categoryAchievements]
    }

    if (selectedCategory === 'ALL') {
      return allAchievements
    }

    return allAchievements.filter(achievement => achievement.category === selectedCategory)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  if (authLoading) {
    return (
      <div style={{ background: `linear-gradient(135deg, ${currentTheme.colors.from}, ${currentTheme.colors.via}, ${currentTheme.colors.to})` }} className="min-h-screen transition-all duration-500">
        <Navbar />
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center text-white">
            <div className="flex justify-center mb-4"><img src="https://gmgnrepeat.com/icons/pengubookicon1.png" alt="PeBloq" className="w-24 h-24" /></div>
            <h1 className="text-2xl font-bold mb-4">Loading...</h1>
            <div className="w-8 h-8 border-4 border-white border-t-transparent rounded-full animate-spin mx-auto"></div>
          </div>
        </div>
      </div>
    )
  }

  if (!isAuthenticated || !user) {
    return (
      <div style={{ background: `linear-gradient(135deg, ${currentTheme.colors.from}, ${currentTheme.colors.via}, ${currentTheme.colors.to})` }} className="min-h-screen transition-all duration-500">
        <Navbar />
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center text-white">
            <div className="flex justify-center mb-4"><img src="https://gmgnrepeat.com/icons/pengubookicon1.png" alt="PeBloq" className="w-24 h-24" /></div>
            <h1 className="text-2xl font-bold mb-4">Access Denied</h1>
            <p className="text-gray-300 mb-6">You need to connect your wallet to view achievements!</p>
            <Link href="/" className="bg-cyan-500 text-white px-6 py-3 rounded-xl hover:bg-cyan-600 transition-colors">
              Back to Home
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div style={{ background: `linear-gradient(135deg, ${currentTheme.colors.from}, ${currentTheme.colors.via}, ${currentTheme.colors.to})` }} className="min-h-screen transition-all duration-500">
      <Navbar />

      <div className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="text-5xl mb-4">🏆</div>
            <h1 className="text-3xl font-bold text-white mb-2">Achievements</h1>
            <p className="text-gray-300">Track your progress and unlock badges</p>
          </div>

          {loading ? (
            <div className="text-center py-12">
              <div className="w-8 h-8 border-4 border-white border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-gray-300">Loading achievements...</p>
            </div>
          ) : error ? (
            <div className="text-center py-12">
              <div className="text-4xl mb-4">😵</div>
              <p className="text-red-300">{error}</p>
            </div>
          ) : achievementData ? (
            <>
              {/* Stats */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div className="bg-black/30 backdrop-blur-lg border border-white/20 rounded-2xl p-6 text-center">
                  <div className="text-3xl font-bold text-cyan-400">{achievementData.stats.earned}</div>
                  <div className="text-gray-300">Achievements Earned</div>
                </div>
                <div className="bg-black/30 backdrop-blur-lg border border-white/20 rounded-2xl p-6 text-center">
                  <div className="text-3xl font-bold text-purple-400">{achievementData.stats.completion}%</div>
                  <div className="text-gray-300">Completion Rate</div>
                </div>
                <div className="bg-black/30 backdrop-blur-lg border border-white/20 rounded-2xl p-6 text-center">
                  <div className="text-3xl font-bold text-yellow-400">{achievementData.stats.total}</div>
                  <div className="text-gray-300">Total Available</div>
                </div>
              </div>

              {/* Category Filter */}
              <div className="flex flex-wrap gap-2 mb-8 justify-center">
                {categories.map((category) => (
                  <button
                    key={category.key}
                    onClick={() => setSelectedCategory(category.key)}
                    className={`
                      px-4 py-2 rounded-xl border transition-all duration-200
                      ${selectedCategory === category.key
                        ? 'bg-cyan-500/20 border-cyan-500/50 text-cyan-300'
                        : 'bg-black/20 border-white/20 text-gray-300 hover:bg-white/10'
                      }
                    `}
                  >
                    <span className="mr-2">{category.icon}</span>
                    {category.label}
                  </button>
                ))}
              </div>

              {/* Achievements Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-4">
                {getFilteredAchievements().map((achievement) => (
                  <AchievementBadge
                    key={achievement.id}
                    achievement={achievement}
                    onClick={() => setSelectedAchievement(achievement)}
                  />
                ))}
              </div>

              {/* Achievement Detail Modal */}
              {selectedAchievement && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                  <div className="bg-black/90 backdrop-blur-lg border border-white/20 rounded-2xl p-6 max-w-md w-full">
                    <div className="text-center">
                      <div className="text-6xl mb-4">{selectedAchievement.icon}</div>
                      <h3 className="text-xl font-bold text-white mb-2">{selectedAchievement.title}</h3>
                      <p className="text-gray-300 mb-4">{selectedAchievement.description}</p>

                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-300">Category:</span>
                          <span className="text-white">{selectedAchievement.category}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-300">Rarity:</span>
                          <span className={`
                            ${selectedAchievement.rarity === 'LEGENDARY' ? 'text-yellow-400' : ''}
                            ${selectedAchievement.rarity === 'EPIC' ? 'text-purple-400' : ''}
                            ${selectedAchievement.rarity === 'RARE' ? 'text-blue-400' : ''}
                            ${selectedAchievement.rarity === 'COMMON' ? 'text-gray-300' : ''}
                          `}>
                            {selectedAchievement.rarity}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-300">Progress:</span>
                          <span className="text-white">
                            {selectedAchievement.currentValue} / {selectedAchievement.requirement}
                          </span>
                        </div>
                        {selectedAchievement.earned && selectedAchievement.unlockedAt && (
                          <div className="flex justify-between">
                            <span className="text-gray-300">Unlocked:</span>
                            <span className="text-green-400">{formatDate(selectedAchievement.unlockedAt)}</span>
                          </div>
                        )}
                      </div>

                      {!selectedAchievement.earned && (
                        <div className="mt-4">
                          <div className="bg-gray-700/50 rounded-full h-2 mb-2">
                            <div
                              className="bg-cyan-500 h-2 rounded-full transition-all duration-300"
                              style={{ width: `${selectedAchievement.progress}%` }}
                            />
                          </div>
                          <p className="text-xs text-gray-300">{selectedAchievement.progress}% complete</p>
                        </div>
                      )}
                    </div>

                    <button
                      onClick={() => setSelectedAchievement(null)}
                      className="w-full mt-6 bg-gray-500/20 text-gray-300 py-2 rounded-lg hover:bg-gray-500/30 transition-colors"
                    >
                      Close
                    </button>
                  </div>
                </div>
              )}
            </>
          ) : null}
        </div>
      </div>
    </div>
  )
}