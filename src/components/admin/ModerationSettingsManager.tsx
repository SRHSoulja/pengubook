'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/providers/AuthProvider'

interface ModerationSetting {
  id: string
  labelName: string
  action: 'ALLOW' | 'FLAG' | 'REJECT'
  minConfidence: number
  requiresReview: boolean
  isEnabled: boolean
  displayName: string | null
  description: string | null
  createdAt: string
  updatedAt: string
}

export default function ModerationSettingsManager() {
  const { user } = useAuth()
  const [settings, setSettings] = useState<ModerationSetting[]>([])
  const [loading, setLoading] = useState(true)
  const [seeding, setSeeding] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState<Partial<ModerationSetting>>({})

  useEffect(() => {
    fetchSettings()
  }, [])

  const fetchSettings = async () => {
    try {
      const response = await fetch('/api/admin/moderation-settings')
      const data = await response.json()
      if (data.success) {
        setSettings(data.settings)
      }
    } catch (error) {
      console.error('Error fetching moderation settings:', error)
    } finally {
      setLoading(false)
    }
  }

  const seedDefaultSettings = async () => {
    if (!confirm('This will create/update default moderation rules. Continue?')) {
      return
    }

    setSeeding(true)
    try {
      const response = await fetch('/api/admin/moderation-settings/seed', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-wallet-address': user?.walletAddress || '',
          'x-user-id': user?.id || ''
        },
        credentials: 'include'
      })
      const data = await response.json()
      if (data.success) {
        alert(`✅ ${data.message}`)
        fetchSettings()
      } else {
        alert(`❌ Error: ${data.error}`)
      }
    } catch (error) {
      console.error('Error seeding settings:', error)
      alert('❌ Failed to seed settings')
    } finally {
      setSeeding(false)
    }
  }

  const startEdit = (setting: ModerationSetting) => {
    setEditingId(setting.id)
    setEditForm(setting)
  }

  const cancelEdit = () => {
    setEditingId(null)
    setEditForm({})
  }

  const saveEdit = async () => {
    try {
      const response = await fetch('/api/admin/moderation-settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-wallet-address': user?.walletAddress || '',
          'x-user-id': user?.id || ''
        },
        credentials: 'include',
        body: JSON.stringify(editForm)
      })
      const data = await response.json()
      if (data.success) {
        alert('✅ Setting updated')
        fetchSettings()
        cancelEdit()
      } else {
        alert(`❌ Error: ${data.error}`)
      }
    } catch (error) {
      console.error('Error saving setting:', error)
      alert('❌ Failed to save setting')
    }
  }

  const toggleEnabled = async (setting: ModerationSetting) => {
    try {
      const response = await fetch('/api/admin/moderation-settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-wallet-address': user?.walletAddress || '',
          'x-user-id': user?.id || ''
        },
        credentials: 'include',
        body: JSON.stringify({
          ...setting,
          isEnabled: !setting.isEnabled
        })
      })
      if (response.ok) {
        fetchSettings()
      }
    } catch (error) {
      console.error('Error toggling setting:', error)
    }
  }

  const getActionColor = (action: string) => {
    switch (action) {
      case 'REJECT': return 'bg-red-600 text-white'
      case 'FLAG': return 'bg-orange-600 text-white'
      case 'ALLOW': return 'bg-green-600 text-white'
      default: return 'bg-gray-600 text-white'
    }
  }

  const getActionIcon = (action: string) => {
    switch (action) {
      case 'REJECT': return '🚫'
      case 'FLAG': return '⚠️'
      case 'ALLOW': return '✅'
      default: return '❓'
    }
  }

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="text-4xl mb-4">⚙️</div>
        <p className="text-white">Loading moderation settings...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-2xl font-bold text-white flex items-center gap-2">
              ⚙️ Content Moderation Settings
            </h2>
            <p className="text-gray-300 text-sm mt-1">
              Configure how AWS Rekognition labels are handled
            </p>
          </div>
          <button
            onClick={seedDefaultSettings}
            disabled={seeding}
            className="bg-cyan-600 hover:bg-cyan-700 disabled:bg-gray-600 text-white px-4 py-2 rounded-xl font-semibold transition-colors"
          >
            {seeding ? 'Seeding...' : '🌱 Seed Defaults'}
          </button>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap gap-3">
          <div className="flex items-center gap-2 bg-black/30 px-3 py-1.5 rounded-lg">
            <span>🚫</span>
            <span className="text-white text-sm font-semibold">REJECT</span>
            <span className="text-gray-300 text-xs">= Block upload</span>
          </div>
          <div className="flex items-center gap-2 bg-black/30 px-3 py-1.5 rounded-lg">
            <span>⚠️</span>
            <span className="text-white text-sm font-semibold">FLAG</span>
            <span className="text-gray-300 text-xs">= Blur + Warning</span>
          </div>
          <div className="flex items-center gap-2 bg-black/30 px-3 py-1.5 rounded-lg">
            <span>✅</span>
            <span className="text-white text-sm font-semibold">ALLOW</span>
            <span className="text-gray-300 text-xs">= No restriction</span>
          </div>
        </div>
      </div>

      {/* Settings List */}
      {settings.length === 0 ? (
        <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-12 border border-white/20 text-center">
          <div className="text-6xl mb-4">📭</div>
          <h3 className="text-xl font-bold text-white mb-2">No Settings Yet</h3>
          <p className="text-gray-300 mb-4">Click "Seed Defaults" to create recommended moderation rules</p>
        </div>
      ) : (
        <div className="space-y-3">
          {settings.map((setting) => (
            <div
              key={setting.id}
              className="bg-white/10 backdrop-blur-lg rounded-xl p-4 border border-white/20 hover:bg-white/15 transition-all"
            >
              {editingId === setting.id ? (
                // Edit Mode
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-white text-sm font-semibold block mb-1">Label Name</label>
                      <input
                        type="text"
                        value={editForm.labelName || ''}
                        onChange={(e) => setEditForm({ ...editForm, labelName: e.target.value })}
                        className="w-full bg-black/30 text-white px-3 py-2 rounded-lg border border-white/20"
                        disabled
                      />
                    </div>
                    <div>
                      <label className="text-white text-sm font-semibold block mb-1">Display Name</label>
                      <input
                        type="text"
                        value={editForm.displayName || ''}
                        onChange={(e) => setEditForm({ ...editForm, displayName: e.target.value })}
                        className="w-full bg-black/30 text-white px-3 py-2 rounded-lg border border-white/20"
                      />
                    </div>
                    <div>
                      <label className="text-white text-sm font-semibold block mb-1">Action</label>
                      <select
                        value={editForm.action || 'FLAG'}
                        onChange={(e) => setEditForm({ ...editForm, action: e.target.value as any })}
                        className="w-full bg-black/30 text-white px-3 py-2 rounded-lg border border-white/20"
                      >
                        <option value="ALLOW">✅ ALLOW - No restriction</option>
                        <option value="FLAG">⚠️ FLAG - Blur + Warning</option>
                        <option value="REJECT">🚫 REJECT - Block upload</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-white text-sm font-semibold block mb-1">Min Confidence (%)</label>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={editForm.minConfidence || 60}
                        onChange={(e) => setEditForm({ ...editForm, minConfidence: parseInt(e.target.value) })}
                        className="w-full bg-black/30 text-white px-3 py-2 rounded-lg border border-white/20"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-white text-sm font-semibold block mb-1">Description</label>
                    <input
                      type="text"
                      value={editForm.description || ''}
                      onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                      className="w-full bg-black/30 text-white px-3 py-2 rounded-lg border border-white/20"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={editForm.requiresReview || false}
                      onChange={(e) => setEditForm({ ...editForm, requiresReview: e.target.checked })}
                      className="w-4 h-4"
                    />
                    <label className="text-white text-sm">Requires Manual Review</label>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={saveEdit}
                      className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-semibold"
                    >
                      ✅ Save
                    </button>
                    <button
                      onClick={cancelEdit}
                      className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg font-semibold"
                    >
                      ❌ Cancel
                    </button>
                  </div>
                </div>
              ) : (
                // View Mode
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <span className={`px-3 py-1 rounded-lg text-sm font-bold ${getActionColor(setting.action)}`}>
                        {getActionIcon(setting.action)} {setting.action}
                      </span>
                      <h3 className="text-white font-bold text-lg">
                        {setting.displayName || setting.labelName}
                      </h3>
                      {!setting.isEnabled && (
                        <span className="bg-gray-600 text-white px-2 py-1 rounded text-xs">DISABLED</span>
                      )}
                      {setting.requiresReview && (
                        <span className="bg-purple-600 text-white px-2 py-1 rounded text-xs">👀 REVIEW</span>
                      )}
                    </div>
                    <p className="text-gray-300 text-sm mb-1">{setting.description}</p>
                    <p className="text-gray-300 text-xs">
                      Label: <code className="bg-black/30 px-2 py-0.5 rounded">{setting.labelName}</code>
                      {' • '}
                      Min Confidence: {setting.minConfidence}%
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => toggleEnabled(setting)}
                      className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition-colors ${
                        setting.isEnabled
                          ? 'bg-green-600 hover:bg-green-700'
                          : 'bg-gray-600 hover:bg-gray-700'
                      } text-white`}
                    >
                      {setting.isEnabled ? '✓ Enabled' : 'Disabled'}
                    </button>
                    <button
                      onClick={() => startEdit(setting)}
                      className="bg-cyan-600 hover:bg-cyan-700 text-white px-3 py-1.5 rounded-lg text-sm font-semibold"
                    >
                      ✏️ Edit
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
