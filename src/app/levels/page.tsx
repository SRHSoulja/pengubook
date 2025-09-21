'use client'

import { useState } from 'react'
import { useAuth } from '@/providers/AuthProvider'
import Navbar from '@/components/Navbar'
import { LEVEL_REQUIREMENTS, XP_REWARDS, getLevelInfo, getLevelBenefits, getLevelTitle } from '@/lib/leveling'

export default function LevelsPage() {
  const { user } = useAuth()
  const [selectedLevel, setSelectedLevel] = useState(user?.level || 1)

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-900 via-purple-900 to-indigo-900 flex items-center justify-center">
        <div className="text-center text-white">
          <div className="text-6xl mb-4">🐧</div>
          <h1 className="text-2xl font-bold mb-4">Please log in to view level progression</h1>
        </div>
      </div>
    )
  }

  const levelInfo = getLevelInfo(user.xp, user.level)
  const currentBenefits = getLevelBenefits(user.level)
  const selectedBenefits = getLevelBenefits(selectedLevel)

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-purple-900 to-indigo-900">
      <Navbar />

      <div className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-white mb-4 flex items-center justify-center">
              <span className="mr-3">⭐</span>
              Level Progression
            </h1>
            <p className="text-xl text-gray-300">
              Level up by being active in the community!
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Current Progress */}
            <div className="lg:col-span-1">
              <div className="bg-white/10 backdrop-blur-lg rounded-2xl border border-white/20 p-6">
                <h2 className="text-xl font-bold text-white mb-4">Your Progress</h2>

                <div className="text-center mb-6">
                  <div className="w-20 h-20 bg-gradient-to-br from-cyan-400 to-blue-500 rounded-xl flex items-center justify-center text-white font-bold text-2xl mx-auto mb-3">
                    {user.level}
                  </div>
                  <h3 className="text-lg font-semibold text-white">{getLevelTitle(user.level)}</h3>
                  <p className="text-gray-300">{user.xp} XP</p>
                </div>

                {!levelInfo.isMaxLevel && (
                  <div className="mb-4">
                    <div className="flex justify-between text-sm text-gray-300 mb-2">
                      <span>Level {user.level}</span>
                      <span>Level {levelInfo.nextLevel}</span>
                    </div>
                    <div className="bg-gray-700 rounded-full h-3">
                      <div
                        className="bg-gradient-to-r from-cyan-400 to-blue-500 h-3 rounded-full transition-all duration-500"
                        style={{ width: `${levelInfo.progress}%` }}
                      ></div>
                    </div>
                    <p className="text-center text-sm text-gray-300 mt-2">
                      {levelInfo.xpToNextLevel} XP to next level
                    </p>
                  </div>
                )}

                <div className="space-y-2">
                  <h4 className="font-semibold text-white">Your Benefits:</h4>
                  {currentBenefits.length > 0 ? (
                    currentBenefits.map((benefit, index) => (
                      <div key={index} className="flex items-center text-green-300 text-sm">
                        <span className="mr-2">✓</span>
                        {benefit}
                      </div>
                    ))
                  ) : (
                    <p className="text-gray-400 text-sm">Keep leveling up to unlock benefits!</p>
                  )}
                </div>
              </div>
            </div>

            {/* XP Earning Guide */}
            <div className="lg:col-span-1">
              <div className="bg-white/10 backdrop-blur-lg rounded-2xl border border-white/20 p-6">
                <h2 className="text-xl font-bold text-white mb-4">How to Earn XP</h2>

                <div className="space-y-3">
                  {Object.entries(XP_REWARDS).map(([action, xp]) => (
                    <div key={action} className="flex justify-between items-center py-2 border-b border-white/10">
                      <span className="text-gray-200 text-sm">
                        {action.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase())}
                      </span>
                      <span className="text-cyan-400 font-semibold">+{xp} XP</span>
                    </div>
                  ))}
                </div>

                <div className="mt-6 p-4 bg-cyan-500/10 border border-cyan-500/20 rounded-lg">
                  <p className="text-cyan-300 text-sm">
                    💡 <strong>Pro Tip:</strong> Be active daily! Regular engagement earns the most XP over time.
                  </p>
                </div>
              </div>
            </div>

            {/* Level Explorer */}
            <div className="lg:col-span-1">
              <div className="bg-white/10 backdrop-blur-lg rounded-2xl border border-white/20 p-6">
                <h2 className="text-xl font-bold text-white mb-4">Explore Levels</h2>

                <div className="mb-4">
                  <label className="block text-gray-300 text-sm mb-2">Select Level:</label>
                  <select
                    value={selectedLevel}
                    onChange={(e) => setSelectedLevel(parseInt(e.target.value))}
                    className="w-full px-3 py-2 rounded-lg bg-white/10 border border-white/20 text-white focus:outline-none focus:border-cyan-400"
                  >
                    {Array.from({ length: 20 }, (_, i) => i + 1).map(level => (
                      <option key={level} value={level} className="bg-gray-800">
                        Level {level} - {getLevelTitle(level)}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-3">
                  <div>
                    <span className="text-gray-300 text-sm">XP Required:</span>
                    <span className="text-white ml-2 font-semibold">
                      {LEVEL_REQUIREMENTS[selectedLevel as keyof typeof LEVEL_REQUIREMENTS]}
                    </span>
                  </div>

                  <div>
                    <span className="text-gray-300 text-sm">Title:</span>
                    <span className="text-cyan-400 ml-2 font-semibold">
                      {getLevelTitle(selectedLevel)}
                    </span>
                  </div>

                  <div>
                    <h4 className="font-semibold text-white mb-2">Benefits:</h4>
                    {selectedBenefits.length > 0 ? (
                      selectedBenefits.map((benefit, index) => (
                        <div key={index} className="flex items-center text-green-300 text-sm mb-1">
                          <span className="mr-2">✓</span>
                          {benefit}
                        </div>
                      ))
                    ) : (
                      <p className="text-gray-400 text-sm">No special benefits yet</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Level Requirements Table */}
          <div className="mt-8">
            <div className="bg-white/10 backdrop-blur-lg rounded-2xl border border-white/20 p-6">
              <h2 className="text-xl font-bold text-white mb-6">All Levels</h2>

              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
                {Array.from({ length: 20 }, (_, i) => i + 1).map(level => {
                  const isCurrentLevel = level === user.level
                  const isUnlocked = level <= user.level
                  const xpRequired = LEVEL_REQUIREMENTS[level as keyof typeof LEVEL_REQUIREMENTS]

                  return (
                    <div
                      key={level}
                      className={`p-4 rounded-lg border transition-all ${
                        isCurrentLevel
                          ? 'bg-cyan-500/20 border-cyan-400 ring-2 ring-cyan-400/50'
                          : isUnlocked
                            ? 'bg-green-500/10 border-green-500/30'
                            : 'bg-white/5 border-white/10'
                      }`}
                    >
                      <div className="text-center">
                        <div className={`w-12 h-12 rounded-lg flex items-center justify-center font-bold mx-auto mb-2 ${
                          isCurrentLevel
                            ? 'bg-cyan-400 text-white'
                            : isUnlocked
                              ? 'bg-green-500 text-white'
                              : 'bg-gray-600 text-gray-300'
                        }`}>
                          {level}
                        </div>
                        <h3 className={`font-semibold ${isUnlocked ? 'text-white' : 'text-gray-400'}`}>
                          Level {level}
                        </h3>
                        <p className={`text-sm ${isUnlocked ? 'text-gray-300' : 'text-gray-500'}`}>
                          {xpRequired} XP
                        </p>
                        <p className={`text-xs mt-1 ${isUnlocked ? 'text-cyan-300' : 'text-gray-500'}`}>
                          {getLevelTitle(level)}
                        </p>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}