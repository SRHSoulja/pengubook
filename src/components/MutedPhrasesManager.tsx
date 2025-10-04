'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/providers/AuthProvider'

interface MutedPhrase {
  id: string
  phrase: string
  isRegex: boolean
  muteType: 'HIDE' | 'WARN'
  scope: 'ALL' | 'POSTS' | 'COMMENTS'
  expiresAt: string | null
  createdAt: string
}

export default function MutedPhrasesManager() {
  const { user } = useAuth()
  const [mutedPhrases, setMutedPhrases] = useState<MutedPhrase[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddForm, setShowAddForm] = useState(false)
  const [addLoading, setAddLoading] = useState(false)
  const [error, setError] = useState('')

  // Form state
  const [newPhrase, setNewPhrase] = useState('')
  const [isRegex, setIsRegex] = useState(false)
  const [muteType, setMuteType] = useState<'HIDE' | 'WARN'>('HIDE')
  const [scope, setScope] = useState<'ALL' | 'POSTS' | 'COMMENTS'>('ALL')
  const [expiresAt, setExpiresAt] = useState('')

  useEffect(() => {
    if (user) {
      fetchMutedPhrases()
    }
  }, [user])

  const fetchMutedPhrases = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/muted-phrases', {
        headers: {
          'x-wallet-address': user?.walletAddress || ''
        }
      })

      const data = await response.json()
      if (response.ok) {
        setMutedPhrases(data.mutedPhrases)
      } else {
        setError(data.error || 'Failed to fetch muted phrases')
      }
    } catch (err) {
      console.error('Error fetching muted phrases:', err)
      setError('Failed to fetch muted phrases')
    } finally {
      setLoading(false)
    }
  }

  const handleAddPhrase = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newPhrase.trim() || addLoading) return

    setAddLoading(true)
    setError('')

    try {
      const response = await fetch('/api/muted-phrases', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-wallet-address': user?.walletAddress || ''
        },
        body: JSON.stringify({
          phrase: newPhrase.trim(),
          isRegex,
          muteType,
          scope,
          expiresAt: expiresAt || null
        })
      })

      const data = await response.json()
      if (response.ok) {
        setMutedPhrases([data.mutedPhrase, ...mutedPhrases])
        setNewPhrase('')
        setIsRegex(false)
        setMuteType('HIDE')
        setScope('ALL')
        setExpiresAt('')
        setShowAddForm(false)
      } else {
        setError(data.error || 'Failed to add muted phrase')
      }
    } catch (err) {
      console.error('Error adding muted phrase:', err)
      setError('Failed to add muted phrase')
    } finally {
      setAddLoading(false)
    }
  }

  const handleDeletePhrase = async (id: string) => {
    try {
      const response = await fetch(`/api/muted-phrases/${id}`, {
        method: 'DELETE',
        headers: {
          'x-wallet-address': user?.walletAddress || ''
        }
      })

      if (response.ok) {
        setMutedPhrases(mutedPhrases.filter(phrase => phrase.id !== id))
      } else {
        const data = await response.json()
        setError(data.error || 'Failed to delete muted phrase')
      }
    } catch (err) {
      console.error('Error deleting muted phrase:', err)
      setError('Failed to delete muted phrase')
    }
  }

  const formatExpirationDate = (expiresAt: string | null) => {
    if (!expiresAt) return 'Never'
    return new Date(expiresAt).toLocaleDateString()
  }

  if (!user) return null

  return (
    <div className="bg-black/90 backdrop-blur-lg border border-white/20 rounded-2xl p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-xl font-semibold text-white">Muted Words & Phrases</h3>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition-colors"
        >
          {showAddForm ? 'Cancel' : 'Add Phrase'}
        </button>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-500/20 border border-red-500/50 rounded-lg text-red-300 text-sm">
          {error}
        </div>
      )}

      {showAddForm && (
        <div className="mb-6 p-4 bg-gray-800/50 border border-white/10 rounded-lg">
          <form onSubmit={handleAddPhrase} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2 text-gray-300">
                Word or phrase to mute
              </label>
              <input
                type="text"
                value={newPhrase}
                onChange={(e) => setNewPhrase(e.target.value)}
                placeholder="Enter word or phrase..."
                maxLength={100}
                className="w-full bg-black/30 border border-white/20 rounded-lg px-3 py-2 text-white placeholder-gray-400 focus:outline-none focus:border-blue-400"
                required
              />
              <div className="text-xs text-gray-300 mt-1">
                {newPhrase.length}/100 characters
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2 text-gray-300">
                  Action
                </label>
                <select
                  value={muteType}
                  onChange={(e) => setMuteType(e.target.value as 'HIDE' | 'WARN')}
                  className="w-full bg-black/30 border border-white/20 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-400"
                >
                  <option value="HIDE">Hide content</option>
                  <option value="WARN">Show warning</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2 text-gray-300">
                  Apply to
                </label>
                <select
                  value={scope}
                  onChange={(e) => setScope(e.target.value as 'ALL' | 'POSTS' | 'COMMENTS')}
                  className="w-full bg-black/30 border border-white/20 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-400"
                >
                  <option value="ALL">All content</option>
                  <option value="POSTS">Posts only</option>
                  <option value="COMMENTS">Comments only</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2 text-gray-300">
                  Expires (optional)
                </label>
                <input
                  type="date"
                  value={expiresAt}
                  onChange={(e) => setExpiresAt(e.target.value)}
                  min={new Date().toISOString().split('T')[0]}
                  className="w-full bg-black/30 border border-white/20 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-400"
                />
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="isRegex"
                checked={isRegex}
                onChange={(e) => setIsRegex(e.target.checked)}
                className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
              />
              <label htmlFor="isRegex" className="text-sm text-gray-300">
                Use as regex pattern (advanced)
              </label>
            </div>

            <div className="flex space-x-3">
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                className="flex-1 bg-gray-500/20 text-gray-300 border border-gray-500/50 py-2 rounded-lg hover:bg-gray-500/30 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!newPhrase.trim() || addLoading}
                className="flex-1 bg-blue-500 text-white py-2 rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {addLoading ? 'Adding...' : 'Add Phrase'}
              </button>
            </div>
          </form>
        </div>
      )}

      {loading ? (
        <div className="text-center py-8 text-gray-300">
          Loading muted phrases...
        </div>
      ) : mutedPhrases.length === 0 ? (
        <div className="text-center py-8 text-gray-300">
          <p>No muted phrases yet.</p>
          <p className="text-sm mt-2">Add phrases to filter content from your feed.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {mutedPhrases.map((phrase) => (
            <div
              key={phrase.id}
              className="flex items-center justify-between p-3 bg-gray-800/30 border border-white/10 rounded-lg"
            >
              <div className="flex-1">
                <div className="flex items-center space-x-2">
                  <span className="text-white font-medium">
                    {phrase.isRegex ? `/${phrase.phrase}/` : `"${phrase.phrase}"`}
                  </span>
                  <span className={`px-2 py-1 text-xs rounded-full ${
                    phrase.muteType === 'HIDE'
                      ? 'bg-red-500/20 text-red-300 border border-red-500/50'
                      : 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/50'
                  }`}>
                    {phrase.muteType === 'HIDE' ? 'Hide' : 'Warn'}
                  </span>
                  <span className="px-2 py-1 text-xs rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/50">
                    {phrase.scope === 'ALL' ? 'All' : phrase.scope.toLowerCase()}
                  </span>
                </div>
                <div className="text-xs text-gray-300 mt-1">
                  Added {new Date(phrase.createdAt).toLocaleDateString()} •
                  Expires: {formatExpirationDate(phrase.expiresAt)}
                </div>
              </div>
              <button
                onClick={() => handleDeletePhrase(phrase.id)}
                className="text-red-400 hover:text-red-300 p-1 rounded transition-colors"
                title="Delete muted phrase"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M3 6h18M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6m3 0V4c0-1 1-2 2-2h4c0-1 1-2 2-2v2" />
                  <line x1="10" y1="11" x2="10" y2="17" />
                  <line x1="14" y1="11" x2="14" y2="17" />
                </svg>
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="mt-4 text-xs text-gray-300">
        <p>• Hidden content will be completely filtered from your feed</p>
        <p>• Warning content will show a notice that you can click to reveal</p>
        <p>• Regex patterns allow advanced filtering (e.g., /crypto|bitcoin/i)</p>
      </div>
    </div>
  )
}