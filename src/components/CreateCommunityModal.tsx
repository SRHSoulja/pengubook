'use client'

import { useState } from 'react'
import { useAuth } from '@/providers/AuthProvider'
import TokenGateConfig from './TokenGateConfig'
import { useToast } from '@/components/ui/Toast'

interface CreateCommunityModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

export default function CreateCommunityModal({ isOpen, onClose, onSuccess }: CreateCommunityModalProps) {
  const { user } = useAuth()
  const { success, error } = useToast()
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    displayName: '',
    description: '',
    category: 'Community',
    tags: '',
    visibility: 'PUBLIC',
    rules: ''
  })

  const [tokenGateConfig, setTokenGateConfig] = useState({
    isTokenGated: false,
    tokenGateType: '' as 'ERC20' | 'ERC721' | 'ERC1155' | '',
    tokenContractAddress: '',
    tokenMinAmount: '',
    tokenIds: [] as string[],
    tokenSymbol: '',
    tokenDecimals: 18
  })

  const categories = [
    'Technology',
    'Gaming',
    'Art & Design',
    'Finance',
    'Education',
    'Lifestyle',
    'Entertainment',
    'Sports',
    'Science',
    'Business',
    'Community'
  ]

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return

    setLoading(true)

    try {
      const response = await fetch('/api/communities', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          creatorId: user.id,
          tags: formData.tags.split(',').map(tag => tag.trim()).filter(Boolean),
          ...tokenGateConfig,
          tokenIds: JSON.stringify(tokenGateConfig.tokenIds)
        })
      })

      const data = await response.json()

      if (response.ok) {
        success('Community created successfully!')
        onSuccess()
        onClose()
        setFormData({
          name: '',
          displayName: '',
          description: '',
          category: 'Community',
          tags: '',
          visibility: 'PUBLIC',
          rules: ''
        })
        setTokenGateConfig({
          isTokenGated: false,
          tokenGateType: '',
          tokenContractAddress: '',
          tokenMinAmount: '',
          tokenIds: [],
          tokenSymbol: '',
          tokenDecimals: 18
        })
      } else {
        error(data.error || 'Failed to create community')
      }
    } catch (err) {
      console.error('Error creating community:', err)
      error('Failed to create community')
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="relative bg-gradient-to-br from-blue-900 via-purple-900 to-indigo-900 rounded-2xl border border-white/20 p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <h2 className="text-3xl font-bold text-white mb-6 flex items-center">
          <span className="mr-3">🏔️</span>
          Create New Community
        </h2>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Community Name (URL) */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Community URL Name (lowercase, no spaces)
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value.toLowerCase().replace(/\s/g, '_') })}
              placeholder="my_awesome_community"
              className="w-full px-4 py-3 bg-black/30 text-white placeholder-gray-400 border border-white/20 rounded-xl focus:outline-none focus:border-cyan-400"
              required
              pattern="[a-z0-9_]+"
              title="Only lowercase letters, numbers, and underscores"
            />
            <p className="text-xs text-gray-300 mt-1">
              This will be your community's unique identifier in URLs
            </p>
          </div>

          {/* Display Name */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Display Name
            </label>
            <input
              type="text"
              value={formData.displayName}
              onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
              placeholder="My Awesome Community"
              className="w-full px-4 py-3 bg-black/30 text-white placeholder-gray-400 border border-white/20 rounded-xl focus:outline-none focus:border-cyan-400"
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
              placeholder="Tell penguins what your community is about..."
              rows={4}
              className="w-full px-4 py-3 bg-black/30 text-white placeholder-gray-400 border border-white/20 rounded-xl focus:outline-none focus:border-cyan-400"
              required
            />
          </div>

          {/* Category */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Category
            </label>
            <select
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              className="w-full px-4 py-3 bg-black/30 text-white border border-white/20 rounded-xl focus:outline-none focus:border-cyan-400"
            >
              {categories.map(category => (
                <option key={category} value={category} className="bg-gray-800">
                  {category}
                </option>
              ))}
            </select>
          </div>

          {/* Tags */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Tags (comma separated)
            </label>
            <input
              type="text"
              value={formData.tags}
              onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
              placeholder="crypto, defi, penguins, abstract"
              className="w-full px-4 py-3 bg-black/30 text-white placeholder-gray-400 border border-white/20 rounded-xl focus:outline-none focus:border-cyan-400"
            />
          </div>

          {/* Visibility */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Visibility
            </label>
            <select
              value={formData.visibility}
              onChange={(e) => setFormData({ ...formData, visibility: e.target.value })}
              className="w-full px-4 py-3 bg-black/30 text-white border border-white/20 rounded-xl focus:outline-none focus:border-cyan-400"
            >
              <option value="PUBLIC" className="bg-gray-800">Public - Anyone can join</option>
              <option value="PRIVATE" className="bg-gray-800">Private - Requires approval</option>
            </select>
          </div>

          {/* Community Rules */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Community Rules (optional)
            </label>
            <textarea
              value={formData.rules}
              onChange={(e) => setFormData({ ...formData, rules: e.target.value })}
              placeholder="1. Be respectful to all penguins&#10;2. No spam or self-promotion&#10;3. Keep content relevant to the community"
              rows={4}
              className="w-full px-4 py-3 bg-black/30 text-white placeholder-gray-400 border border-white/20 rounded-xl focus:outline-none focus:border-cyan-400"
            />
          </div>

          {/* Token Gating Configuration */}
          <TokenGateConfig
            value={tokenGateConfig}
            onChange={setTokenGateConfig}
          />

          {/* Actions */}
          <div className="flex gap-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 bg-gray-500/20 text-gray-300 px-6 py-3 rounded-xl hover:bg-gray-500/30 transition-colors font-semibold"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 bg-gradient-to-r from-green-500 to-emerald-500 text-white px-6 py-3 rounded-xl hover:from-green-600 hover:to-emerald-600 transition-all transform hover:scale-105 font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={loading}
            >
              {loading ? 'Creating...' : 'Create Community'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}