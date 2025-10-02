'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/providers/AuthProvider'

interface Achievement {
  id: string
  name: string
  title: string
  description: string
  icon: string
  category: string
  rarity: string
  requirement: number
  xpReward: number
  isActive: boolean
  createdAt: string
}

export default function AchievementManager() {
  const { user } = useAuth()
  const [achievements, setAchievements] = useState<Achievement[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [editingAchievement, setEditingAchievement] = useState<Achievement | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    title: '',
    description: '',
    icon: '🏆',
    category: 'ENGAGEMENT',
    rarity: 'COMMON',
    requirement: 1,
    xpReward: 10,
    isActive: true
  })

  const categories = ['ENGAGEMENT', 'SOCIAL', 'CONTENT', 'MILESTONE', 'SPECIAL']
  const rarities = ['COMMON', 'RARE', 'EPIC', 'LEGENDARY']
  const iconOptions = [
    '🏆', '🎯', '👥', '📝', '🎖️', '✨', '💎', '🔥', '⭐', '🌟',
    '💰', '🎨', '🎭', '🎪', '🎬', '🎮', '🎲', '🎰', '🏅', '🥇',
    '🥈', '🥉', '👑', '💪', '🚀', '🌈', '⚡', '💥', '🎊', '🎉'
  ]

  useEffect(() => {
    fetchAchievements()
  }, [])

  const fetchAchievements = async () => {
    try {
      const response = await fetch('/api/admin/achievements')
      const data = await response.json()
      if (response.ok) {
        setAchievements(data.achievements || [])
      }
    } catch (error) {
      console.error('Failed to fetch achievements:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    try {
      const url = editingAchievement
        ? `/api/admin/achievements/${editingAchievement.id}`
        : '/api/admin/achievements'

      const response = await fetch(url, {
        method: editingAchievement ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-wallet-address': user?.walletAddress || ''
        },
        body: JSON.stringify(formData)
      })

      if (response.ok) {
        fetchAchievements()
        resetForm()
        setShowCreateModal(false)
      }
    } catch (error) {
      console.error('Failed to save achievement:', error)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this achievement?')) return

    try {
      const response = await fetch(`/api/admin/achievements/${id}`, {
        method: 'DELETE',
        headers: {
          'x-wallet-address': user?.walletAddress || ''
        }
      })

      if (response.ok) {
        fetchAchievements()
      }
    } catch (error) {
      console.error('Failed to delete achievement:', error)
    }
  }

  const handleEdit = (achievement: Achievement) => {
    setEditingAchievement(achievement)
    setFormData({
      name: achievement.name,
      title: achievement.title,
      description: achievement.description,
      icon: achievement.icon,
      category: achievement.category,
      rarity: achievement.rarity,
      requirement: achievement.requirement,
      xpReward: achievement.xpReward,
      isActive: achievement.isActive
    })
    setShowCreateModal(true)
  }

  const resetForm = () => {
    setEditingAchievement(null)
    setFormData({
      name: '',
      title: '',
      description: '',
      icon: '🏆',
      category: 'ENGAGEMENT',
      rarity: 'COMMON',
      requirement: 1,
      xpReward: 10,
      isActive: true
    })
  }

  const getRarityColor = (rarity: string) => {
    switch (rarity) {
      case 'LEGENDARY': return 'text-yellow-400 border-yellow-500 bg-yellow-500/10'
      case 'EPIC': return 'text-purple-400 border-purple-500 bg-purple-500/10'
      case 'RARE': return 'text-blue-400 border-blue-500 bg-blue-500/10'
      default: return 'text-gray-400 border-gray-500 bg-gray-500/10'
    }
  }

  if (loading) {
    return <div className="text-white">Loading achievements...</div>
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-white">Achievement Management</h2>
        <button
          onClick={() => {
            resetForm()
            setShowCreateModal(true)
          }}
          className="bg-gradient-to-r from-green-500 to-emerald-500 text-white px-6 py-2 rounded-lg hover:from-green-600 hover:to-emerald-600 transition-all shadow-lg"
        >
          + Create Achievement
        </button>
      </div>

      {/* Achievements Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {achievements.map((achievement) => (
          <div
            key={achievement.id}
            className={`
              bg-white/5 backdrop-blur-lg border-2 rounded-xl p-4
              ${getRarityColor(achievement.rarity)}
              ${!achievement.isActive && 'opacity-50'}
            `}
          >
            <div className="flex items-start justify-between mb-3">
              <div className="text-4xl">{achievement.icon}</div>
              <div className="flex gap-2">
                <button
                  onClick={() => handleEdit(achievement)}
                  className="text-blue-400 hover:text-blue-300 text-sm"
                >
                  ✏️
                </button>
                <button
                  onClick={() => handleDelete(achievement.id)}
                  className="text-red-400 hover:text-red-300 text-sm"
                >
                  🗑️
                </button>
              </div>
            </div>

            <h3 className="text-lg font-bold text-white mb-1">{achievement.title}</h3>
            <p className="text-sm text-gray-300 mb-3">{achievement.description}</p>

            <div className="space-y-1 text-xs">
              <div className="flex justify-between text-gray-400">
                <span>Category:</span>
                <span className="text-white">{achievement.category}</span>
              </div>
              <div className="flex justify-between text-gray-400">
                <span>Requirement:</span>
                <span className="text-white">{achievement.requirement}</span>
              </div>
              <div className="flex justify-between text-gray-400">
                <span>XP Reward:</span>
                <span className="text-cyan-400">{achievement.xpReward} XP</span>
              </div>
              <div className="flex justify-between text-gray-400">
                <span>Status:</span>
                <span className={achievement.isActive ? 'text-green-400' : 'text-red-400'}>
                  {achievement.isActive ? 'Active' : 'Inactive'}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Create/Edit Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-gradient-to-br from-gray-900 to-gray-800 border border-white/20 rounded-2xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <h3 className="text-2xl font-bold text-white mb-6">
              {editingAchievement ? 'Edit Achievement' : 'Create New Achievement'}
            </h3>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Name (Identifier) */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Identifier Name (lowercase_with_underscores)
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., first_post, social_butterfly"
                  className="w-full bg-white/5 border border-white/20 rounded-lg px-4 py-2 text-white placeholder-gray-400 focus:border-cyan-400 outline-none"
                  required
                />
              </div>

              {/* Title */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Display Title
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="e.g., First Steps, Social Butterfly"
                  className="w-full bg-white/5 border border-white/20 rounded-lg px-4 py-2 text-white placeholder-gray-400 focus:border-cyan-400 outline-none"
                  required
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Describe how to earn this achievement..."
                  rows={3}
                  className="w-full bg-white/5 border border-white/20 rounded-lg px-4 py-2 text-white placeholder-gray-400 focus:border-cyan-400 outline-none resize-none"
                  required
                />
              </div>

              {/* Icon Selector */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Icon
                </label>
                <div className="grid grid-cols-10 gap-2 mb-2">
                  {iconOptions.map((icon) => (
                    <button
                      key={icon}
                      type="button"
                      onClick={() => setFormData({ ...formData, icon })}
                      className={`
                        text-2xl p-2 rounded-lg border-2 transition-all
                        ${formData.icon === icon
                          ? 'border-cyan-400 bg-cyan-500/20'
                          : 'border-white/10 bg-white/5 hover:bg-white/10'
                        }
                      `}
                    >
                      {icon}
                    </button>
                  ))}
                </div>
                <input
                  type="text"
                  value={formData.icon}
                  onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
                  placeholder="Or enter custom emoji"
                  className="w-full bg-white/5 border border-white/20 rounded-lg px-4 py-2 text-white placeholder-gray-400 focus:border-cyan-400 outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                {/* Category */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Category
                  </label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full bg-white/5 border border-white/20 rounded-lg px-4 py-2 text-white focus:border-cyan-400 outline-none"
                  >
                    {categories.map((cat) => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>

                {/* Rarity */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Rarity
                  </label>
                  <select
                    value={formData.rarity}
                    onChange={(e) => setFormData({ ...formData, rarity: e.target.value })}
                    className="w-full bg-white/5 border border-white/20 rounded-lg px-4 py-2 text-white focus:border-cyan-400 outline-none"
                  >
                    {rarities.map((rar) => (
                      <option key={rar} value={rar}>{rar}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {/* Requirement */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Requirement
                  </label>
                  <input
                    type="number"
                    value={formData.requirement}
                    onChange={(e) => setFormData({ ...formData, requirement: parseInt(e.target.value) })}
                    min="1"
                    className="w-full bg-white/5 border border-white/20 rounded-lg px-4 py-2 text-white focus:border-cyan-400 outline-none"
                    required
                  />
                </div>

                {/* XP Reward */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    XP Reward
                  </label>
                  <input
                    type="number"
                    value={formData.xpReward}
                    onChange={(e) => setFormData({ ...formData, xpReward: parseInt(e.target.value) })}
                    min="1"
                    className="w-full bg-white/5 border border-white/20 rounded-lg px-4 py-2 text-white focus:border-cyan-400 outline-none"
                    required
                  />
                </div>
              </div>

              {/* Active Status */}
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="isActive"
                  checked={formData.isActive}
                  onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                  className="w-4 h-4 text-cyan-500 bg-white/5 border-white/20 rounded focus:ring-cyan-500"
                />
                <label htmlFor="isActive" className="ml-2 text-sm text-gray-300">
                  Active (Users can earn this achievement)
                </label>
              </div>

              {/* Buttons */}
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateModal(false)
                    resetForm()
                  }}
                  className="flex-1 bg-gray-500/20 text-gray-300 py-3 rounded-lg hover:bg-gray-500/30 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-gradient-to-r from-cyan-500 to-blue-500 text-white py-3 rounded-lg hover:from-cyan-600 hover:to-blue-600 transition-all shadow-lg"
                >
                  {editingAchievement ? 'Update' : 'Create'} Achievement
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
