'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/providers/AuthProvider'
import { useToast } from '@/components/ui/Toast'
import Navbar from '@/components/Navbar'
import PenguinLoadingScreen from '@/components/PenguinLoadingScreen'
import EditCommunityModal from '@/components/EditCommunityModal'
import Link from 'next/link'

interface CommunityPageProps {
  params: { id: string }
}

interface Community {
  id: string
  name: string
  displayName: string
  description: string
  avatar?: string
  banner?: string
  category: string
  tags: string[]
  rules: string[]
  isOfficial: boolean
  membersCount: number
  visibility: string
  createdAt: string
  isTokenGated?: boolean
  tokenGateType?: string
  tokenContractAddress?: string
  tokenMinAmount?: string
  tokenIds?: string
  tokenSymbol?: string
  tokenDecimals?: number
  members: Array<{
    id: string
    role: string
    joinedAt: string
    user: {
      id: string
      username: string
      displayName: string
      avatar?: string
      level: number
      profile?: {
        profileVerified: boolean
      }
    }
  }>
  userMembership?: {
    role: string
    joinedAt: string
  }
}

export default function CommunityClient({ params }: CommunityPageProps) {
  const { user, isAuthenticated } = useAuth()
  const { addToast } = useToast()
  const [community, setCommunity] = useState<Community | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showEditModal, setShowEditModal] = useState(false)
  const [tokenAccess, setTokenAccess] = useState<{
    hasAccess: boolean
    isTokenGated: boolean
    tokenGateType?: string
    tokenSymbol?: string
    tokenMinAmount?: string
    userBalance?: string
    ownedTokenIds?: string[]
    error?: string
    message?: string
  } | null>(null)
  const [checkingTokenAccess, setCheckingTokenAccess] = useState(false)

  useEffect(() => {
    fetchCommunity()
  }, [params.id, user])

  useEffect(() => {
    if (community && community.isTokenGated && user && user.walletAddress) {
      checkTokenAccess()
    }
  }, [community, user])

  const fetchCommunity = async () => {
    try {
      setLoading(true)
      const queryParams = user ? `?userId=${user.id}` : ''
      const response = await fetch(`/api/communities/${params.id}${queryParams}`)
      const data = await response.json()

      if (response.ok) {
        setCommunity(data.data)
      } else {
        setError(data.error || 'Failed to load community')
      }
    } catch (error) {
      console.error('Error fetching community:', error)
      setError('Failed to load community')
    } finally {
      setLoading(false)
    }
  }

  const checkTokenAccess = async () => {
    if (!community || !community.isTokenGated || !user?.walletAddress) return

    setCheckingTokenAccess(true)
    try {
      const response = await fetch(`/api/communities/${community.id}/token-gate`, {
        method: 'GET',
        headers: {
          'x-wallet-address': user.walletAddress
        }
      })

      const data = await response.json()
      if (response.ok) {
        setTokenAccess(data.data)
      } else {
        setTokenAccess({
          hasAccess: false,
          isTokenGated: true,
          error: data.error || 'Failed to check token requirements'
        })
      }
    } catch (error) {
      console.error('Error checking token access:', error)
      setTokenAccess({
        hasAccess: false,
        isTokenGated: true,
        error: 'Failed to check token requirements'
      })
    } finally {
      setCheckingTokenAccess(false)
    }
  }

  const joinCommunity = async () => {
    if (!user || !community) return

    try {
      const response = await fetch(`/api/communities/${community.id}/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id })
      })

      const data = await response.json()
      if (response.ok) {
        // Refresh community data
        fetchCommunity()
        addToast(data.message, 'success')
      } else {
        addToast(data.error || 'Failed to join community', 'error')
      }
    } catch (error) {
      console.error('Error joining community:', error)
      addToast('Failed to join community', 'error')
    }
  }

  const canEdit = community?.userMembership &&
    ['OWNER', 'ADMIN', 'MODERATOR'].includes(community.userMembership.role)

  if (loading) {
    return <PenguinLoadingScreen />
  }

  if (error || !community) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-900 via-purple-900 to-indigo-900">
        <Navbar />
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center text-white">
            <div className="text-6xl mb-4">❌</div>
            <h1 className="text-2xl font-bold mb-4">Community Not Found</h1>
            <p className="text-gray-300 mb-6">{error || 'This community has wandered off!'}</p>
            <Link href="/communities" className="bg-cyan-500 text-white px-6 py-3 rounded-xl hover:bg-cyan-600 transition-colors">
              Browse Communities
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-purple-900 to-indigo-900">
      <Navbar />

      <div className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          {/* Community Header */}
          <div className="bg-white/10 backdrop-blur-lg rounded-2xl border border-white/20 p-8 mb-8">
            {community.banner && (
              <div className="w-full h-48 bg-gradient-to-r from-cyan-500 to-blue-600 rounded-xl mb-6 overflow-hidden">
                <img
                  src={community.banner}
                  alt={community.displayName}
                  className="w-full h-full object-cover"
                />
              </div>
            )}

            <div className="flex items-start gap-6 mb-6">
              <div className="w-24 h-24 bg-gradient-to-br from-cyan-400 to-blue-500 rounded-2xl flex items-center justify-center text-3xl font-bold text-white">
                {community.avatar ? (
                  <img
                    src={community.avatar}
                    alt={community.displayName}
                    className="w-full h-full rounded-2xl object-cover"
                  />
                ) : (
                  community.displayName.charAt(0)
                )}
              </div>

              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <h1 className="text-4xl font-bold text-white">{community.displayName}</h1>
                  {community.isOfficial && <span className="text-yellow-400 text-2xl">✨</span>}
                </div>

                <p className="text-gray-300 text-lg mb-2">@{community.name}</p>

                <div className="flex items-center gap-6 text-gray-300 mb-4">
                  <span className="flex items-center gap-1">
                    <span>👥</span>
                    <span>{community.membersCount} members</span>
                  </span>
                  <span className="flex items-center gap-1">
                    <span>📝</span>
                    <span>0 posts</span>
                  </span>
                  <span className="px-3 py-1 bg-purple-500/20 text-purple-300 rounded-full text-sm">
                    {community.category}
                  </span>
                </div>

                <p className="text-gray-200 mb-4">{community.description}</p>

                {/* Tags */}
                {community.tags.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-4">
                    {community.tags.map((tag, index) => (
                      <span
                        key={index}
                        className="px-3 py-1 bg-white/20 text-gray-200 rounded-full text-sm"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}

                {/* Token Gate Info */}
                {community.isTokenGated && (
                  <div className="mb-4 p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-yellow-400 text-lg">🔐</span>
                      <span className="text-yellow-300 font-semibold">Token Gated Community</span>
                    </div>
                    <p className="text-gray-300 text-sm mb-2">
                      {community.tokenGateType === 'ERC20' &&
                        `Requires holding at least ${community.tokenMinAmount} ${community.tokenSymbol || 'tokens'}`}
                      {community.tokenGateType === 'ERC721' &&
                        `Requires holding ${community.tokenMinAmount || '1'} NFT(s) from ${community.tokenSymbol || 'the collection'}`}
                      {community.tokenGateType === 'ERC1155' &&
                        `Requires holding ${community.tokenMinAmount || '1'} ${community.tokenSymbol || 'tokens'}`}
                    </p>

                    {checkingTokenAccess && (
                      <p className="text-blue-300 text-sm flex items-center gap-2">
                        <span className="animate-spin">⏳</span>
                        Checking your token balance...
                      </p>
                    )}

                    {tokenAccess && !checkingTokenAccess && (
                      <div className={`text-sm ${
                        tokenAccess.hasAccess ? 'text-green-300' : 'text-red-300'
                      }`}>
                        {tokenAccess.hasAccess ? '✅' : '❌'} {tokenAccess.message}
                        {tokenAccess.userBalance && (
                          <div className="text-gray-300 text-xs mt-1">
                            Your balance: {tokenAccess.userBalance} {community.tokenSymbol}
                          </div>
                        )}
                      </div>
                    )}

                    {tokenAccess?.error && (
                      <p className="text-red-300 text-sm">❌ {tokenAccess.error}</p>
                    )}
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="flex flex-col gap-3">
                {canEdit && (
                  <button
                    onClick={() => setShowEditModal(true)}
                    className="bg-yellow-500/20 text-yellow-300 px-6 py-2 rounded-lg hover:bg-yellow-500/30 transition-colors flex items-center gap-2"
                  >
                    <span>✏️</span>
                    Edit Community
                  </button>
                )}

                {!community.userMembership && isAuthenticated && (
                  community.isTokenGated ? (
                    tokenAccess && tokenAccess.hasAccess ? (
                      <button
                        onClick={joinCommunity}
                        className="bg-green-500/20 text-green-300 px-6 py-2 rounded-lg hover:bg-green-500/30 transition-colors flex items-center gap-2"
                      >
                        <span>➕</span>
                        Join Community
                      </button>
                    ) : (
                      <div className="bg-red-500/20 text-red-300 px-6 py-2 rounded-lg text-center text-sm">
                        {checkingTokenAccess ? (
                          <span className="flex items-center gap-2 justify-center">
                            <span className="animate-spin">⏳</span>
                            Checking requirements...
                          </span>
                        ) : (
                          <span>🔒 Token requirements not met</span>
                        )}
                      </div>
                    )
                  ) : (
                    <button
                      onClick={joinCommunity}
                      className="bg-green-500/20 text-green-300 px-6 py-2 rounded-lg hover:bg-green-500/30 transition-colors flex items-center gap-2"
                    >
                      <span>➕</span>
                      Join Community
                    </button>
                  )
                )}

                {community.userMembership && (
                  <div className="bg-cyan-500/20 text-cyan-300 px-6 py-2 rounded-lg text-center">
                    <div className="flex items-center gap-2 justify-center">
                      <span>✅</span>
                      <span>{community.userMembership.role}</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Main Content */}
            <div className="lg:col-span-2">
              {/* Recent Posts */}
              <div className="bg-white/10 backdrop-blur-lg rounded-2xl border border-white/20 p-6">
                <h2 className="text-xl font-bold text-white mb-6">Recent Posts</h2>

                <div className="text-center text-gray-300 py-8">
                  <div className="text-4xl mb-4">📝</div>
                  <p>No posts yet</p>
                  <p className="text-sm">Be the first to share something!</p>
                </div>
              </div>
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Token Requirements */}
              {community.isTokenGated && (
                <div className="bg-white/10 backdrop-blur-lg rounded-2xl border border-white/20 p-6 mb-6">
                  <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                    <span>🔐</span>
                    Token Requirements
                  </h3>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-3 bg-black/20 rounded-lg">
                      <span className="text-gray-300 text-sm">Token Standard:</span>
                      <span className="text-cyan-300 font-mono">{community.tokenGateType}</span>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-black/20 rounded-lg">
                      <span className="text-gray-300 text-sm">Token Symbol:</span>
                      <span className="text-cyan-300 font-mono">{community.tokenSymbol || 'N/A'}</span>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-black/20 rounded-lg">
                      <span className="text-gray-300 text-sm">Minimum Required:</span>
                      <span className="text-cyan-300 font-mono">{community.tokenMinAmount || '1'}</span>
                    </div>
                    {community.tokenIds && JSON.parse(community.tokenIds).length > 0 && (
                      <div className="p-3 bg-black/20 rounded-lg">
                        <span className="text-gray-300 text-sm mb-2 block">Required Token IDs:</span>
                        <div className="flex flex-wrap gap-2">
                          {JSON.parse(community.tokenIds).map((tokenId: string, index: number) => (
                            <span key={index} className="px-2 py-1 bg-purple-500/20 text-purple-300 rounded text-xs font-mono">
                              #{tokenId}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Community Rules */}
              {community.rules.length > 0 && (
                <div className="bg-white/10 backdrop-blur-lg rounded-2xl border border-white/20 p-6">
                  <h3 className="text-xl font-bold text-white mb-4">📋 Rules</h3>
                  <div className="space-y-3">
                    {community.rules.map((rule, index) => (
                      <div key={index} className="flex gap-3">
                        <span className="text-cyan-400 font-bold min-w-[24px]">{index + 1}.</span>
                        <span className="text-gray-300 text-sm">{rule}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Recent Members */}
              <div className="bg-white/10 backdrop-blur-lg rounded-2xl border border-white/20 p-6">
                <h3 className="text-xl font-bold text-white mb-4">👥 Recent Members</h3>
                <div className="space-y-3">
                  {community.members.slice(0, 5).map((member) => (
                    <div key={member.id} className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-gradient-to-br from-cyan-400 to-blue-500 rounded-lg flex items-center justify-center text-sm font-bold text-white">
                        {member.user.avatar ? (
                          <img
                            src={member.user.avatar}
                            alt={member.user.displayName}
                            className="w-full h-full rounded-lg object-cover"
                          />
                        ) : (
                          member.user.displayName.charAt(0)
                        )}
                      </div>
                      <div className="flex-1">
                        <div className="text-white font-semibold text-sm flex items-center gap-2">
                          {member.user.displayName}
                          {member.user.profile?.profileVerified && <span className="text-blue-400 text-xs">✓</span>}
                        </div>
                        <div className="text-gray-300 text-xs flex items-center gap-2">
                          <span>{member.role}</span>
                          {member.role === 'ADMIN' && <span className="text-yellow-400">👑</span>}
                          {member.role === 'MODERATOR' && <span className="text-purple-400">🛡️</span>}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Edit Community Modal */}
      {showEditModal && (
        <EditCommunityModal
          community={community}
          isOpen={showEditModal}
          onClose={() => setShowEditModal(false)}
          onSuccess={() => {
            setShowEditModal(false)
            fetchCommunity()
          }}
        />
      )}
    </div>
  )
}