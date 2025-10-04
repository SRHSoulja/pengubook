'use client'

import { useState, useEffect } from 'react'
import { useAbstractClient } from '@abstract-foundation/agw-react'

interface Token {
  id: string
  name: string
  symbol: string
  contractAddress: string
  decimals: number
  isEnabled: boolean
  logoUrl?: string
}

export default function TokenManager() {
  const { data: client } = useAbstractClient()
  const [tokens, setTokens] = useState<Token[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [showAddModal, setShowAddModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [editingToken, setEditingToken] = useState<Token | null>(null)
  const [newToken, setNewToken] = useState({
    name: '',
    symbol: '',
    contractAddress: '',
    decimals: 18,
    logoUrl: ''
  })

  // Fetch tokens from API
  useEffect(() => {
    fetchTokens()
  }, [])

  const fetchTokens = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/tokens')
      const data = await response.json()

      if (data.success) {
        setTokens(data.tokens)
      } else {
        setError('Failed to fetch tokens')
      }
    } catch (err) {
      setError('Error fetching tokens')
      console.error('Error fetching tokens:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleAddToken = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/tokens', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-wallet-address': client?.account?.address || ''
        },
        body: JSON.stringify(newToken)
      })

      const data = await response.json()

      if (data.success) {
        setTokens([...tokens, data.token])
        setNewToken({ name: '', symbol: '', contractAddress: '', decimals: 18, logoUrl: '' })
        setShowAddModal(false)
        setError('')
      } else {
        setError(data.error || 'Failed to add token')
      }
    } catch (err) {
      setError('Error adding token')
      console.error('Error adding token:', err)
    } finally {
      setLoading(false)
    }
  }

  const toggleTokenStatus = async (id: string) => {
    try {
      const token = tokens.find(t => t.id === id)
      if (!token) return

      const response = await fetch(`/api/tokens/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-wallet-address': client?.account?.address || ''
        },
        body: JSON.stringify({ isEnabled: !token.isEnabled })
      })

      const data = await response.json()

      if (data.success) {
        setTokens(tokens.map(t =>
          t.id === id ? { ...t, isEnabled: !t.isEnabled } : t
        ))
      } else {
        setError(data.error || 'Failed to update token')
      }
    } catch (err) {
      setError('Error updating token')
      console.error('Error updating token:', err)
    }
  }

  const removeToken = async (id: string) => {
    if (!confirm('Are you sure you want to remove this token? This action cannot be undone.')) {
      return
    }

    try {
      const response = await fetch(`/api/tokens/${id}`, {
        method: 'DELETE',
        headers: {
          'x-wallet-address': client?.account?.address || ''
        }
      })

      const data = await response.json()

      if (data.success) {
        setTokens(tokens.filter(t => t.id !== id))
      } else {
        setError(data.error || 'Failed to remove token')
      }
    } catch (err) {
      setError('Error removing token')
      console.error('Error removing token:', err)
    }
  }

  const openEditModal = (token: Token) => {
    setEditingToken(token)
    setShowEditModal(true)
  }

  const handleUpdateToken = async () => {
    if (!editingToken) return

    try {
      setLoading(true)
      const response = await fetch(`/api/tokens/${editingToken.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-wallet-address': client?.account?.address || ''
        },
        body: JSON.stringify({
          name: editingToken.name,
          logoUrl: editingToken.logoUrl
        })
      })

      const data = await response.json()

      if (data.success) {
        setTokens(tokens.map(t =>
          t.id === editingToken.id ? { ...t, name: editingToken.name, logoUrl: editingToken.logoUrl } : t
        ))
        setShowEditModal(false)
        setEditingToken(null)
        setError('')
      } else {
        setError(data.error || 'Failed to update token')
      }
    } catch (err) {
      setError('Error updating token')
      console.error('Error updating token:', err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-black/20 backdrop-blur-lg rounded-2xl border border-white/20 p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold text-white">Token Management</h2>
        <button
          onClick={() => setShowAddModal(true)}
          className="bg-cyan-500 hover:bg-cyan-600 text-white px-4 py-2 rounded-lg transition-colors"
          disabled={loading}
        >
          Add Token
        </button>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-500/20 border border-red-500/50 rounded-lg text-red-300">
          {error}
        </div>
      )}

      {loading && tokens.length === 0 ? (
        <div className="text-center py-8">
          <div className="w-8 h-8 border-4 border-cyan-400 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-300">Loading tokens...</p>
        </div>
      ) : (

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/20">
                <th className="text-left py-3 text-gray-300">Logo</th>
                <th className="text-left py-3 text-gray-300">Name</th>
                <th className="text-left py-3 text-gray-300">Symbol</th>
                <th className="text-left py-3 text-gray-300">Contract Address</th>
                <th className="text-left py-3 text-gray-300">Decimals</th>
                <th className="text-left py-3 text-gray-300">Status</th>
                <th className="text-left py-3 text-gray-300">Actions</th>
              </tr>
            </thead>
            <tbody>
              {tokens.map((token) => (
                <tr key={token.id} className="border-b border-white/10">
                  <td className="py-3">
                    {token.logoUrl ? (
                      <img
                        src={token.logoUrl}
                        alt={token.symbol}
                        className="w-8 h-8 rounded-full"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement
                          target.style.display = 'none'
                          target.nextElementSibling?.classList.remove('hidden')
                        }}
                      />
                    ) : null}
                    <div className={`w-8 h-8 bg-gradient-to-r from-cyan-400 to-blue-500 rounded-full flex items-center justify-center text-white text-sm font-bold ${token.logoUrl ? 'hidden' : ''}`}>
                      {token.symbol.charAt(0)}
                    </div>
                  </td>
                  <td className="py-3 text-white">{token.name}</td>
                  <td className="py-3 text-cyan-400 font-bold">{token.symbol}</td>
                  <td className="py-3 font-mono text-sm text-gray-300">
                    {token.contractAddress.slice(0, 10)}...{token.contractAddress.slice(-8)}
                  </td>
                  <td className="py-3 text-white">{token.decimals}</td>
                  <td className="py-3">
                    <span className={`px-2 py-1 rounded text-sm ${
                      token.isEnabled
                        ? 'bg-green-500/20 text-green-300 border border-green-500/50'
                        : 'bg-red-500/20 text-red-300 border border-red-500/50'
                    }`}>
                      {token.isEnabled ? 'Enabled' : 'Disabled'}
                    </span>
                  </td>
                  <td className="py-3">
                  <div className="flex space-x-2">
                    <button
                      onClick={() => openEditModal(token)}
                      disabled={loading}
                      className="px-3 py-1 bg-blue-500/20 text-blue-300 border border-blue-500/50 rounded text-sm hover:bg-blue-500/30 transition-colors"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => toggleTokenStatus(token.id)}
                      disabled={loading}
                      className={`px-3 py-1 rounded text-sm transition-colors ${
                        token.isEnabled
                          ? 'bg-red-500/20 text-red-300 border border-red-500/50 hover:bg-red-500/30'
                          : 'bg-green-500/20 text-green-300 border border-green-500/50 hover:bg-green-500/30'
                      }`}
                    >
                      {token.isEnabled ? 'Disable' : 'Enable'}
                    </button>
                    <button
                      onClick={() => removeToken(token.id)}
                      disabled={loading}
                      className="px-3 py-1 bg-gray-500/20 text-gray-300 border border-gray-500/50 rounded text-sm hover:bg-gray-500/30 transition-colors"
                    >
                      Remove
                    </button>
                  </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {tokens.length === 0 && !loading && (
            <div className="text-center py-8">
              <div className="text-4xl mb-4">🪙</div>
              <h3 className="text-xl font-bold text-white mb-2">No tokens added yet</h3>
              <p className="text-gray-300">Add your first token to enable tipping functionality</p>
            </div>
          )}
        </div>
      )}

      {showAddModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-black/90 backdrop-blur-lg border border-white/20 rounded-2xl p-6 w-96 max-w-md">
            <h3 className="text-lg font-semibold mb-4 text-white">Add New Token</h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2 text-gray-300">Token Name</label>
                <input
                  type="text"
                  value={newToken.name}
                  onChange={(e) => setNewToken({...newToken, name: e.target.value})}
                  className="w-full bg-black/30 border border-white/20 rounded-lg px-3 py-2 text-white placeholder-gray-400 focus:outline-none focus:border-cyan-400"
                  placeholder="e.g., Dai Stablecoin"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2 text-gray-300">Symbol</label>
                <input
                  type="text"
                  value={newToken.symbol}
                  onChange={(e) => setNewToken({...newToken, symbol: e.target.value.toUpperCase()})}
                  className="w-full bg-black/30 border border-white/20 rounded-lg px-3 py-2 text-white placeholder-gray-400 focus:outline-none focus:border-cyan-400"
                  placeholder="e.g., DAI"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2 text-gray-300">Contract Address</label>
                <input
                  type="text"
                  value={newToken.contractAddress}
                  onChange={(e) => setNewToken({...newToken, contractAddress: e.target.value})}
                  className="w-full bg-black/30 border border-white/20 rounded-lg px-3 py-2 text-white placeholder-gray-400 focus:outline-none focus:border-cyan-400 font-mono text-sm"
                  placeholder="0x..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2 text-gray-300">Decimals</label>
                <input
                  type="number"
                  min="0"
                  max="18"
                  value={newToken.decimals}
                  onChange={(e) => setNewToken({...newToken, decimals: parseInt(e.target.value) || 18})}
                  className="w-full bg-black/30 border border-white/20 rounded-lg px-3 py-2 text-white placeholder-gray-400 focus:outline-none focus:border-cyan-400"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2 text-gray-300">Logo URL (Optional)</label>
                <input
                  type="url"
                  value={newToken.logoUrl}
                  onChange={(e) => setNewToken({...newToken, logoUrl: e.target.value})}
                  className="w-full bg-black/30 border border-white/20 rounded-lg px-3 py-2 text-white placeholder-gray-400 focus:outline-none focus:border-cyan-400"
                  placeholder="https://example.com/logo.png"
                />
              </div>
            </div>

            <div className="flex space-x-3 mt-6">
              <button
                onClick={() => {
                  setShowAddModal(false)
                  setNewToken({ name: '', symbol: '', contractAddress: '', decimals: 18, logoUrl: '' })
                  setError('')
                }}
                className="flex-1 bg-gray-500/20 text-gray-300 border border-gray-500/50 py-2 rounded-lg hover:bg-gray-500/30 transition-colors"
                disabled={loading}
              >
                Cancel
              </button>
              <button
                onClick={handleAddToken}
                disabled={!newToken.name || !newToken.symbol || !newToken.contractAddress || loading}
                className="flex-1 bg-cyan-500 text-white py-2 rounded-lg hover:bg-cyan-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {loading ? 'Adding...' : 'Add Token'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showEditModal && editingToken && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-black/90 backdrop-blur-lg border border-white/20 rounded-2xl p-6 w-96 max-w-md">
            <h3 className="text-lg font-semibold mb-4 text-white">Edit Token</h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2 text-gray-300">Token Name</label>
                <input
                  type="text"
                  value={editingToken.name}
                  onChange={(e) => setEditingToken({...editingToken, name: e.target.value})}
                  className="w-full bg-black/30 border border-white/20 rounded-lg px-3 py-2 text-white placeholder-gray-400 focus:outline-none focus:border-cyan-400"
                  placeholder="e.g., Dai Stablecoin"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2 text-gray-300">Logo URL (Optional)</label>
                <input
                  type="url"
                  value={editingToken.logoUrl || ''}
                  onChange={(e) => setEditingToken({...editingToken, logoUrl: e.target.value})}
                  className="w-full bg-black/30 border border-white/20 rounded-lg px-3 py-2 text-white placeholder-gray-400 focus:outline-none focus:border-cyan-400"
                  placeholder="https://example.com/logo.png"
                />
              </div>

              <div className="text-xs text-gray-300">
                <p><strong>Symbol:</strong> {editingToken.symbol}</p>
                <p><strong>Contract:</strong> {editingToken.contractAddress}</p>
                <p><strong>Decimals:</strong> {editingToken.decimals}</p>
              </div>
            </div>

            <div className="flex space-x-3 mt-6">
              <button
                onClick={() => {
                  setShowEditModal(false)
                  setEditingToken(null)
                  setError('')
                }}
                className="flex-1 bg-gray-500/20 text-gray-300 border border-gray-500/50 py-2 rounded-lg hover:bg-gray-500/30 transition-colors"
                disabled={loading}
              >
                Cancel
              </button>
              <button
                onClick={handleUpdateToken}
                disabled={!editingToken.name || loading}
                className="flex-1 bg-blue-500 text-white py-2 rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {loading ? 'Updating...' : 'Update Token'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}