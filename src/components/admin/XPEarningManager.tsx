'use client'

import { useState, useEffect } from 'react'
import type { XPEarningConfig } from '@/app/api/admin/xp-earning/route'

const defaultConfig: XPEarningConfig = {
  createPost: 10,
  createComment: 5,
  receiveReaction: 2,
  giveReaction: 1,
  postShared: 5,
  sharePost: 3,
  dailyLogin: 10,
  profileComplete: 50,
  receiveTip: 20,
  sendTip: 5
}

const actionLabels: Record<keyof XPEarningConfig, { label: string; description: string; icon: string }> = {
  createPost: { label: 'Create Post', description: 'XP earned when a user creates a new post', icon: '📝' },
  createComment: { label: 'Create Comment', description: 'XP earned when a user comments on a post', icon: '💬' },
  receiveReaction: { label: 'Receive Reaction', description: 'XP earned when someone reacts to your post', icon: '❤️' },
  giveReaction: { label: 'Give Reaction', description: 'XP earned when you react to someone else\'s post', icon: '👍' },
  postShared: { label: 'Post Shared', description: 'XP earned when someone shares your post', icon: '🔄' },
  sharePost: { label: 'Share Post', description: 'XP earned when you share someone else\'s post', icon: '📤' },
  dailyLogin: { label: 'Daily Login', description: 'XP earned for logging in each day', icon: '📅' },
  profileComplete: { label: 'Complete Profile', description: 'One-time XP for completing profile setup', icon: '✅' },
  receiveTip: { label: 'Receive Tip', description: 'XP earned when someone tips you', icon: '💰' },
  sendTip: { label: 'Send Tip', description: 'XP earned when you tip someone else', icon: '🎁' }
}

export default function XPEarningManager() {
  const [config, setConfig] = useState<XPEarningConfig>(defaultConfig)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  useEffect(() => {
    fetchConfig()
  }, [])

  const fetchConfig = async () => {
    try {
      const response = await fetch('/api/admin/xp-earning')
      const data = await response.json()

      if (data.success && data.config) {
        setConfig(data.config)
      }
    } catch (error) {
      console.error('Failed to fetch XP earning config:', error)
      setMessage({ type: 'error', text: 'Failed to load configuration' })
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    setSaving(true)
    setMessage(null)

    try {
      const response = await fetch('/api/admin/xp-earning', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ config })
      })

      const data = await response.json()

      if (data.success) {
        setMessage({ type: 'success', text: 'XP earning configuration saved successfully!' })
      } else {
        setMessage({ type: 'error', text: data.error || 'Failed to save configuration' })
      }
    } catch (error) {
      console.error('Failed to save XP earning config:', error)
      setMessage({ type: 'error', text: 'Failed to save configuration' })
    } finally {
      setSaving(false)
    }
  }

  const handleReset = () => {
    if (confirm('Are you sure you want to reset to default values?')) {
      setConfig(defaultConfig)
      setMessage({ type: 'success', text: 'Reset to default values. Click Save to apply.' })
    }
  }

  const updateValue = (key: keyof XPEarningConfig, value: string) => {
    const numValue = parseInt(value) || 0
    setConfig(prev => ({ ...prev, [key]: Math.max(0, numValue) }))
  }

  if (loading) {
    return (
      <div className="bg-black/20 backdrop-blur-lg rounded-2xl border border-white/20 p-8">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-cyan-400 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-300">Loading XP earning configuration...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-black/20 backdrop-blur-lg rounded-2xl border border-white/20 p-6">
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-2xl font-bold text-white mb-2">⭐ XP Earning Configuration</h2>
            <p className="text-gray-300">Customize how much XP users earn for different actions</p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={handleReset}
              className="px-4 py-2 bg-gray-500/20 text-gray-300 border border-gray-500/50 rounded-lg hover:bg-gray-500/30 transition-colors"
            >
              Reset to Defaults
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-6 py-2 bg-cyan-500 text-white rounded-lg hover:bg-cyan-600 transition-colors disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </div>

        {message && (
          <div className={`p-4 rounded-lg mb-4 ${
            message.type === 'success'
              ? 'bg-green-500/20 text-green-300 border border-green-500/50'
              : 'bg-red-500/20 text-red-300 border border-red-500/50'
          }`}>
            {message.text}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {(Object.keys(actionLabels) as Array<keyof XPEarningConfig>).map((key) => {
          const action = actionLabels[key]
          return (
            <div key={key} className="bg-white/5 rounded-xl p-4 border border-white/10">
              <div className="flex items-start gap-3">
                <div className="text-3xl">{action.icon}</div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-white mb-1">{action.label}</h3>
                  <p className="text-sm text-gray-300 mb-3">{action.description}</p>
                  <div className="flex items-center gap-3">
                    <input
                      type="number"
                      min="0"
                      value={config[key]}
                      onChange={(e) => updateValue(key, e.target.value)}
                      className="w-24 px-3 py-2 bg-black/30 border border-white/20 rounded-lg text-white focus:outline-none focus:border-cyan-400"
                    />
                    <span className="text-cyan-400 font-medium">XP</span>
                  </div>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      <div className="mt-6 p-4 bg-blue-500/10 border border-blue-500/30 rounded-xl">
        <div className="flex items-start gap-3">
          <span className="text-2xl">💡</span>
          <div>
            <h4 className="text-white font-semibold mb-1">Usage Notes</h4>
            <ul className="text-sm text-gray-300 space-y-1">
              <li>• Set any value to 0 to disable XP earning for that action</li>
              <li>• Changes apply immediately after saving</li>
              <li>• Daily Login XP is awarded once per day</li>
              <li>• Profile Complete XP is awarded only once when profile is fully set up</li>
              <li>• Consider balancing XP rewards to maintain progression curve</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}
