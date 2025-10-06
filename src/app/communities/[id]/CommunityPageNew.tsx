'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/providers/AuthProvider'
import Navbar from '@/components/Navbar'
import PenguinLoadingScreen from '@/components/PenguinLoadingScreen'
import EditCommunityModal from '@/components/EditCommunityModal'
import CommunityHeader from '@/components/community/CommunityHeader'
import TokenGateStatus from '@/components/community/TokenGateStatus'
import CommunityMembersList from '@/components/community/CommunityMembersList'
import CommunityRules from '@/components/community/CommunityRules'
import { useToast } from '@/components/ui/Toast'

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

interface TokenAccessData {
  hasAccess: boolean
  isTokenGated: boolean
  tokenGateType?: string
  tokenSymbol?: string
  tokenMinAmount?: string
  userBalance?: string
  ownedTokenIds?: string[]
  error?: string
  message?: string
}

export default function CommunityPage({ params }: CommunityPageProps) {
  const { user, isAuthenticated } = useAuth()
  const { toast } = useToast()
  const [community, setCommunity] = useState<Community | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showEditModal, setShowEditModal] = useState(false)
  const [tokenAccess, setTokenAccess] = useState<TokenAccessData | null>(null)
  const [checkingTokenAccess, setCheckingTokenAccess] = useState(false)
  const [joining, setJoining] = useState(false)

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

    setJoining(true)
    try {
      const response = await fetch(`/api/communities/${community.id}/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id })
      })

      const data = await response.json()
      if (response.ok) {
        await fetchCommunity() // Refresh community data
      } else {
        toast(data.error || 'Failed to join community', 'error')
      }
    } catch (error) {
      console.error('Error joining community:', error)
      toast('Failed to join community', 'error')
    } finally {
      setJoining(false)
    }
  }

  const handleMemberAction = async (memberId: string, action: 'promote' | 'demote' | 'remove') => {
    // Implementation for member management actions
    console.log(`Member action: ${action} for member ${memberId}`)
    // This would call appropriate API endpoints for member management
  }

  // Check if user can edit this community
  const canEdit = community?.userMembership &&
    ['OWNER', 'ADMIN'].includes(community.userMembership.role.toUpperCase())

  // Check if user is a member
  const isMember = !!community?.userMembership

  // Check if user can manage members
  const canManageMembers = community?.userMembership &&
    ['OWNER', 'ADMIN', 'MODERATOR'].includes(community.userMembership.role.toUpperCase())

  if (loading) {
    return <PenguinLoadingScreen />
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-purple-900 to-violet-900">
        <div className="text-center">
          <div className="text-6xl mb-4">😵</div>
          <h1 className="text-2xl font-bold text-white mb-2">Community Not Found</h1>
          <p className="text-gray-300 mb-4">{error}</p>
          <button
            onClick={() => window.history.back()}
            className="px-6 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
          >
            ← Go Back
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-violet-900">
      <Navbar />

      <div className="pt-20">
        {community && (
          <>
            {/* Community Header */}
            <CommunityHeader
              community={community}
              onEditClick={() => setShowEditModal(true)}
              onJoinClick={joinCommunity}
              canEdit={canEdit}
              isMember={isMember}
              joining={joining}
            />

            {/* Main Content */}
            <div className="container mx-auto px-6 py-8">
              {/* Token Gate Status */}
              <TokenGateStatus
                tokenAccess={tokenAccess}
                checking={checkingTokenAccess}
                onRetryCheck={checkTokenAccess}
              />

              {/* Content Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Main Content */}
                <div className="lg:col-span-2 space-y-6">
                  {/* Community Rules */}
                  <CommunityRules rules={community.rules} />

                  {/* Future: Community Posts/Feed would go here */}
                  <div className="glass-card p-6">
                    <h3 className="text-xl font-semibold text-white mb-4">Community Feed</h3>
                    <div className="text-center py-8">
                      <div className="text-4xl mb-2">🔄</div>
                      <p className="text-gray-300">Community feed coming soon!</p>
                      <p className="text-gray-500 text-sm mt-1">
                        Members will be able to share posts and discussions here.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Sidebar */}
                <div className="space-y-6">
                  {/* Community Members */}
                  <CommunityMembersList
                    members={community.members}
                    currentUserId={user?.id}
                    canManageMembers={canManageMembers}
                    onMemberAction={handleMemberAction}
                  />
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Edit Modal */}
      {showEditModal && community && (
        <EditCommunityModal
          community={community}
          isOpen={showEditModal}
          onClose={() => setShowEditModal(false)}
          onSuccess={fetchCommunity}
        />
      )}
    </div>
  )
}