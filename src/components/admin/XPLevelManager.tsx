'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/providers/AuthProvider'

interface XPLevel {
  id: string
  level: number
  xpRequired: number
  title: string
  icon: string
  perks: string[]
}

export default function XPLevelManager() {
  const { user } = useAuth()
  const [levels, setLevels] = useState<XPLevel[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [editingLevel, setEditingLevel] = useState<XPLevel | null>(null)
  const [formData, setFormData] = useState({
    level: 1,
    xpRequired: 100,
    title: '',
    icon: '⭐',
    perks: ['']
  })

  const iconOptions = [
    '⭐', '🌟', '✨', '💫', '🌠', '🔥', '⚡', '💎', '👑', '🏆',
    '🥇', '🥈', '🥉', '🎖️', '🏅', '💪', '🚀', '🌈', '💥', '🎊'
  ]

  useEffect(() => {
    fetchLevels()
  }, [])

  const fetchLevels = async () => {
    try {
      const response = await fetch('/api/admin/xp-levels')
      const data = await response.json()
      if (response.ok) {
        setLevels(data.levels || [])
      }
    } catch (error) {
      console.error('Failed to fetch levels:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    try {
      const url = editingLevel
        ? `/api/admin/xp-levels/${editingLevel.id}`
        : '/api/admin/xp-levels'

      const response = await fetch(url, {
        method: editingLevel ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-wallet-address': user?.walletAddress || ''
        },
        body: JSON.stringify({
          ...formData,
          perks: formData.perks.filter(p => p.trim() !== '')
        })
      })

      if (response.ok) {
        fetchLevels()
        resetForm()
        setShowCreateModal(false)
      }
    } catch (error) {
      console.error('Failed to save level:', error)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this level?')) return

    try {
      const response = await fetch(`/api/admin/xp-levels/${id}`, {
        method: 'DELETE',
        headers: {
          'x-wallet-address': user?.walletAddress || ''
        }
      })

      if (response.ok) {
        fetchLevels()
      }
    } catch (error) {
      console.error('Failed to delete level:', error)
    }
  }

  const handleEdit = (level: XPLevel) => {
    setEditingLevel(level)
    setFormData({
      level: level.level,
      xpRequired: level.xpRequired,
      title: level.title,
      icon: level.icon,
      perks: level.perks.length > 0 ? level.perks : ['']
    })
    setShowCreateModal(true)
  }

  const addPerk = () => {
    setFormData({ ...formData, perks: [...formData.perks, ''] })
  }

  const removePerk = (index: number) => {
    setFormData({
      ...formData,
      perks: formData.perks.filter((_, i) => i !== index)
    })
  }

  const updatePerk = (index: number, value: string) => {
    const newPerks = [...formData.perks]
    newPerks[index] = value
    setFormData({ ...formData, perks: newPerks })
  }

  const resetForm = () => {
    setEditingLevel(null)
    setFormData({
      level: levels.length + 1,
      xpRequired: 100 * (levels.length + 1),
      title: '',
      icon: '⭐',
      perks: ['']
    })
  }

  if (loading) {
    return <div className="text-white">Loading XP levels...</div>
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-white">XP Level Management</h2>
        <button
          onClick={() => {
            resetForm()
            setShowCreateModal(true)
          }}
          className="bg-gradient-to-r from-purple-500 to-pink-500 text-white px-6 py-2 rounded-lg hover:from-purple-600 hover:to-pink-600 transition-all shadow-lg"
        >
          + Create Level
        </button>
      </div>

      {/* Levels Table */}
      <div className="bg-white/5 backdrop-blur-lg border border-white/20 rounded-xl overflow-hidden">
        <table className="w-full">
          <thead className="bg-white/10">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                Level
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                Icon
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                Title
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                XP Required
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                Perks
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-300 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/10">
            {levels.sort((a, b) => a.level - b.level).map((level) => (
              <tr key={level.id} className="hover:bg-white/5 transition-colors">
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="text-2xl font-bold text-cyan-400">
                    {level.level}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-3xl">
                  {level.icon}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-white font-medium">
                  {level.title}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-purple-400 font-semibold">
                  {level.xpRequired.toLocaleString()} XP
                </td>
                <td className="px-6 py-4">
                  <div className="space-y-1">
                    {level.perks.map((perk, i) => (
                      <div key={i} className="text-sm text-gray-300">
                        • {perk}
                      </div>
                    ))}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right">
                  <button
                    onClick={() => handleEdit(level)}
                    className="text-blue-400 hover:text-blue-300 mr-3"
                  >
                    ✏️
                  </button>
                  <button
                    onClick={() => handleDelete(level.id)}
                    className="text-red-400 hover:text-red-300"
                  >
                    🗑️
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {levels.length === 0 && (
          <div className="text-center py-12 text-gray-300">
            No XP levels configured yet. Create your first level to get started!
          </div>
        )}
      </div>

      {/* Create/Edit Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-gradient-to-br from-gray-900 to-gray-800 border border-white/20 rounded-2xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <h3 className="text-2xl font-bold text-white mb-6">
              {editingLevel ? 'Edit Level' : 'Create New Level'}
            </h3>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                {/* Level Number */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Level Number
                  </label>
                  <input
                    type="number"
                    value={formData.level}
                    onChange={(e) => setFormData({ ...formData, level: parseInt(e.target.value) })}
                    min="1"
                    className="w-full bg-white/5 border border-white/20 rounded-lg px-4 py-2 text-white focus:border-cyan-400 outline-none"
                    required
                  />
                </div>

                {/* XP Required */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    XP Required
                  </label>
                  <input
                    type="number"
                    value={formData.xpRequired}
                    onChange={(e) => setFormData({ ...formData, xpRequired: parseInt(e.target.value) })}
                    min="0"
                    className="w-full bg-white/5 border border-white/20 rounded-lg px-4 py-2 text-white focus:border-cyan-400 outline-none"
                    required
                  />
                </div>
              </div>

              {/* Title */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Level Title
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="e.g., Novice Penguin, Master Explorer"
                  className="w-full bg-white/5 border border-white/20 rounded-lg px-4 py-2 text-white placeholder-gray-400 focus:border-cyan-400 outline-none"
                  required
                />
              </div>

              {/* Icon */}
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
                          ? 'border-purple-400 bg-purple-500/20'
                          : 'border-white/10 bg-white/5 hover:bg-white/10'
                        }
                      `}
                    >
                      {icon}
                    </button>
                  ))}
                </div>
                <div className="mt-2">
                  <label className="block text-xs text-gray-400 mb-1">
                    Or use custom icon (emoji or URL):
                  </label>
                  <input
                    type="text"
                    value={formData.icon}
                    onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
                    placeholder="Enter emoji or image URL"
                    className="w-full bg-white/5 border border-white/20 rounded-lg px-4 py-2 text-white placeholder-gray-400 focus:border-cyan-400 outline-none"
                  />
                </div>
              </div>

              {/* Perks */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Perks & Benefits
                </label>
                <div className="space-y-2">
                  {formData.perks.map((perk, index) => (
                    <div key={index} className="flex gap-2">
                      <input
                        type="text"
                        value={perk}
                        onChange={(e) => updatePerk(index, e.target.value)}
                        placeholder="e.g., Unlock custom profile badge"
                        className="flex-1 bg-white/5 border border-white/20 rounded-lg px-4 py-2 text-white placeholder-gray-400 focus:border-cyan-400 outline-none"
                      />
                      {formData.perks.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removePerk(index)}
                          className="text-red-400 hover:text-red-300 px-3"
                          aria-label="Remove perk"
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={addPerk}
                  className="mt-2 text-sm text-cyan-400 hover:text-cyan-300"
                >
                  + Add Perk
                </button>
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
                  className="flex-1 bg-gradient-to-r from-purple-500 to-pink-500 text-white py-3 rounded-lg hover:from-purple-600 hover:to-pink-600 transition-all shadow-lg"
                >
                  {editingLevel ? 'Update' : 'Create'} Level
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
