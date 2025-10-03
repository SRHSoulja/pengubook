'use client'

import { useState, useEffect } from 'react'

interface ReactionEmojiConfig {
  HAPPY: string
  LAUGH: string
  LOVE: string
  SHOCK: string
  CRY: string
  ANGER: string
  THUMBS_UP: string
  THUMBS_DOWN: string
}

const defaultEmojis: ReactionEmojiConfig = {
  HAPPY: '😀',
  LAUGH: '😂',
  LOVE: '😍',
  SHOCK: '😮',
  CRY: '😢',
  ANGER: '😡',
  THUMBS_UP: '👍',
  THUMBS_DOWN: '👎'
}

const reactionLabels: Record<keyof ReactionEmojiConfig, string> = {
  HAPPY: 'Happy',
  LAUGH: 'Laugh',
  LOVE: 'Love',
  SHOCK: 'Shock',
  CRY: 'Cry',
  ANGER: 'Anger',
  THUMBS_UP: 'Thumbs Up',
  THUMBS_DOWN: 'Thumbs Down'
}

export default function ReactionEmojiManager() {
  const [config, setConfig] = useState<ReactionEmojiConfig>(defaultEmojis)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)

  useEffect(() => {
    fetchConfig()
  }, [])

  const fetchConfig = async () => {
    try {
      const response = await fetch('/api/admin/reaction-emojis')
      const data = await response.json()

      if (data.success && data.config) {
        setConfig(data.config)
      }
    } catch (error) {
      console.error('Failed to fetch reaction emoji config:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleInputChange = (key: keyof ReactionEmojiConfig, value: string) => {
    setConfig(prev => ({
      ...prev,
      [key]: value
    }))
  }

  const handleSave = async () => {
    try {
      setSaving(true)
      setMessage(null)

      const response = await fetch('/api/admin/reaction-emojis', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ config })
      })

      const data = await response.json()

      if (data.success) {
        setMessage({ type: 'success', text: 'Reaction emojis updated successfully!' })
        setTimeout(() => setMessage(null), 3000)
      } else {
        setMessage({ type: 'error', text: data.error || 'Failed to update reaction emojis' })
      }
    } catch (error) {
      console.error('Failed to save reaction emoji config:', error)
      setMessage({ type: 'error', text: 'Failed to save reaction emojis' })
    } finally {
      setSaving(false)
    }
  }

  const handleReset = () => {
    setConfig(defaultEmojis)
    setMessage({ type: 'success', text: 'Reset to default emojis' })
    setTimeout(() => setMessage(null), 3000)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-8 h-8 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white mb-2">Reaction Emoji Manager</h2>
          <p className="text-gray-300">
            Customize reaction emojis with custom image URLs. Leave blank or use emoji characters for defaults.
          </p>
        </div>
      </div>

      {message && (
        <div
          className={`p-4 rounded-lg ${
            message.type === 'success'
              ? 'bg-green-500/20 border border-green-500/30 text-green-200'
              : 'bg-red-500/20 border border-red-500/30 text-red-200'
          }`}
        >
          {message.text}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {(Object.keys(config) as Array<keyof ReactionEmojiConfig>).map((key) => (
          <div key={key} className="bg-white/5 backdrop-blur-lg rounded-xl border border-white/10 p-6">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-12 h-12 bg-white/10 rounded-lg flex items-center justify-center text-3xl">
                {config[key].startsWith('http') ? (
                  <img src={config[key]} alt={reactionLabels[key]} className="w-8 h-8 object-contain" />
                ) : (
                  config[key]
                )}
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white">{reactionLabels[key]}</h3>
                <p className="text-sm text-gray-400">Default: {defaultEmojis[key]}</p>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm text-gray-300">Custom Image URL or Emoji</label>
              <input
                type="text"
                value={config[key]}
                onChange={(e) => handleInputChange(key, e.target.value)}
                placeholder={`Enter URL or emoji (default: ${defaultEmojis[key]})`}
                className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-cyan-400"
              />
            </div>
          </div>
        ))}
      </div>

      <div className="flex items-center gap-4">
        <button
          onClick={handleSave}
          disabled={saving}
          className="bg-cyan-500 hover:bg-cyan-600 disabled:bg-gray-500 disabled:cursor-not-allowed text-white px-6 py-3 rounded-lg font-semibold transition-colors flex items-center gap-2"
        >
          {saving ? (
            <>
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              Saving...
            </>
          ) : (
            <>💾 Save Changes</>
          )}
        </button>

        <button
          onClick={handleReset}
          disabled={saving}
          className="bg-gray-600 hover:bg-gray-700 disabled:bg-gray-500 disabled:cursor-not-allowed text-white px-6 py-3 rounded-lg font-semibold transition-colors"
        >
          🔄 Reset to Defaults
        </button>
      </div>

      <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
        <h4 className="text-blue-200 font-semibold mb-2">💡 Tips:</h4>
        <ul className="text-blue-200 text-sm space-y-1 list-disc list-inside">
          <li>Use full image URLs (https://...) for custom icons</li>
          <li>Use emoji characters (😀, 👍, etc.) for default emojis</li>
          <li>Image URLs should be publicly accessible</li>
          <li>Recommended image size: 32x32px to 64x64px</li>
          <li>Changes apply immediately after saving</li>
        </ul>
      </div>
    </div>
  )
}
