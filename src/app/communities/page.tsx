'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/providers/AuthProvider'
import { useTheme } from '@/providers/ThemeProvider'
import Navbar from '@/components/Navbar'
import CreateCommunityModal from '@/components/CreateCommunityModal'
import PenguinLoadingScreen from '@/components/PenguinLoadingScreen'
import Link from 'next/link'

interface Community {
  id: string
  name: string
  displayName: string
  description: string
  avatar?: string
  banner?: string
  category: string
  tags: string[]
  isOfficial: boolean
  membersCount: number
  postsCount: number
  visibility: string
  creatorId: string
}

export default function CommunitiesPage() {
  const { user, isAuthenticated, loading: authLoading } = useAuth()
  const { currentTheme } = useTheme()
  const [communities, setCommunities] = useState<Community[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [showCreateModal, setShowCreateModal] = useState(false)

  const categories = [
    'all',
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

  useEffect(() => {
    if (isAuthenticated) {
      fetchCommunities()
    }
  }, [isAuthenticated, selectedCategory, searchTerm])


  const fetchCommunities = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      if (selectedCategory !== 'all') params.append('category', selectedCategory)
      if (searchTerm) params.append('search', searchTerm)
      params.append('limit', '20')

      const response = await fetch(`/api/communities?${params}`)
      const data = await response.json()

      if (response.ok) {
        setCommunities(data.data.communities)
      }
    } catch (error) {
      console.error('Failed to fetch communities:', error)
    } finally {
      setLoading(false)
    }
  }

  const joinCommunity = async (communityId: string) => {
    if (!user) return

    try {
      const response = await fetch(`/api/communities/${communityId}/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id })
      })

      const data = await response.json()
      if (response.ok) {
        // Update community member count
        setCommunities(prev => prev.map(community =>
          community.id === communityId
            ? { ...community, membersCount: community.membersCount + 1 }
            : community
        ))
        // Show success message or redirect to community
        alert(data.message)
      } else {
        alert(data.error || 'Failed to join community')
      }
    } catch (error) {
      console.error('Error joining community:', error)
      alert('Failed to join community')
    }
  }

  const handleCommunityCreated = () => {
    fetchCommunities()
    setShowCreateModal(false)
  }

  if (authLoading) {
    return <PenguinLoadingScreen />
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-900 via-purple-900 to-indigo-900 flex items-center justify-center">
        <div className="text-center text-white">
          <div className="flex justify-center mb-4"><img src="https://gmgnrepeat.com/icons/penguincommunity1.png" alt="Communities" className="w-24 h-24" /></div>
          <h1 className="text-2xl font-bold mb-4">Access Denied</h1>
          <p className="text-gray-300 mb-6">You need to connect your wallet to explore communities!</p>
          <Link href="/" className="bg-cyan-500 text-white px-6 py-3 rounded-xl hover:bg-cyan-600 transition-colors">
            Back to Home
          </Link>
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
            <h1 className="text-4xl font-bold text-white mb-4 flex items-center justify-center">
              <img src="https://gmgnrepeat.com/icons/penguincommunity1.png" alt="Communities" className="w-12 h-12 mr-3" />
              Community Colonies
            </h1>
            <p className="text-xl text-gray-300 mb-6">
              Join thriving penguin communities and connect with like-minded penguins!
            </p>

            <button
              onClick={() => setShowCreateModal(true)}
              className="bg-gradient-to-r from-green-500 to-emerald-500 text-white px-6 py-3 rounded-xl hover:from-green-600 hover:to-emerald-600 transition-all transform hover:scale-105 font-semibold"
            >
              🏗️ Create Community
            </button>
          </div>

          {/* Search and Filters */}
          <div className="bg-white/10 backdrop-blur-lg rounded-2xl border border-white/20 p-6 mb-8">
            <div className="flex flex-col md:flex-row gap-4">
              {/* Search */}
              <div className="flex-1">
                <input
                  type="text"
                  placeholder="Search communities..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full px-4 py-2 rounded-lg bg-white/20 border border-white/30 text-white placeholder-gray-300 focus:outline-none focus:border-cyan-400"
                />
              </div>

              {/* Category Filter */}
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="px-4 py-2 rounded-lg bg-white/20 border border-white/30 text-white focus:outline-none focus:border-cyan-400"
              >
                {categories.map(category => (
                  <option key={category} value={category} className="bg-gray-800">
                    {category.charAt(0).toUpperCase() + category.slice(1)}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Communities Grid */}
          {loading ? (
            <div className="text-center text-white">
              <div className="text-4xl mb-4">🔄</div>
              <p>Loading communities...</p>
            </div>
          ) : communities.length === 0 ? (
            <div className="text-center text-white">
              <div className="text-4xl mb-4">🔍</div>
              <p className="text-xl">No communities found</p>
              <p className="text-gray-300">Try adjusting your search or filters</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {communities.map((community) => (
                <div
                  key={community.id}
                  className="bg-white/10 backdrop-blur-lg rounded-2xl border border-white/20 p-6 hover:bg-white/15 transition-all transform hover:scale-105"
                >
                  {/* Community Header */}
                  <div className="flex items-start gap-4 mb-4">
                    <div className="w-16 h-16 bg-gradient-to-br from-cyan-400 to-blue-500 rounded-xl flex items-center justify-center text-2xl">
                      {community.avatar ? (
                        <img
                          src={community.avatar}
                          alt={community.displayName}
                          className="w-full h-full rounded-xl object-cover"
                        />
                      ) : (
                        community.displayName.charAt(0)
                      )}
                    </div>

                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="text-lg font-bold text-white">
                          {community.displayName}
                        </h3>
                        {community.isOfficial && (
                          <span className="text-yellow-400 text-sm">✨</span>
                        )}
                      </div>
                      <p className="text-sm text-gray-300 mb-2">@{community.name}</p>
                      <div className="flex items-center gap-4 text-xs text-gray-300">
                        <span>👥 {community.membersCount}</span>
                        <span>📝 {community.postsCount}</span>
                      </div>
                    </div>
                  </div>

                  {/* Description */}
                  <p className="text-gray-300 text-sm mb-4 line-clamp-3">
                    {community.description}
                  </p>

                  {/* Tags */}
                  <div className="flex flex-wrap gap-2 mb-4">
                    <span className="px-2 py-1 bg-purple-500/30 text-purple-200 rounded-full text-xs">
                      {community.category}
                    </span>
                    {community.tags.slice(0, 2).map((tag, index) => (
                      <span
                        key={index}
                        className="px-2 py-1 bg-white/20 text-gray-200 rounded-full text-xs"
                      >
                        {tag}
                      </span>
                    ))}
                    {community.tags.length > 2 && (
                      <span className="text-xs text-gray-300">
                        +{community.tags.length - 2} more
                      </span>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2">
                    <Link
                      href={`/communities/${community.id}`}
                      className="flex-1 bg-cyan-500/20 text-cyan-300 px-4 py-2 rounded-lg hover:bg-cyan-500/30 transition-colors text-center text-sm"
                    >
                      View
                    </Link>
                    {community.creatorId === user?.id ? (
                      <div className="flex-1 bg-yellow-500/20 text-yellow-300 px-4 py-2 rounded-lg text-center text-sm">
                        Owner
                      </div>
                    ) : (
                      <button
                        onClick={() => joinCommunity(community.id)}
                        className="flex-1 bg-green-500/20 text-green-300 px-4 py-2 rounded-lg hover:bg-green-500/30 transition-colors text-sm"
                      >
                        Join
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Create Community Modal */}
      <CreateCommunityModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSuccess={handleCommunityCreated}
      />
    </div>
  )
}