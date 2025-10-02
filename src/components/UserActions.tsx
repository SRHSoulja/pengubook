'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/providers/AuthProvider'
import Link from 'next/link'

interface UserActionsProps {
  targetUserId: string
  targetUser: {
    username?: string
    displayName?: string
  }
  showMessageButton?: boolean
  showFriendButton?: boolean
  showBlockButton?: boolean
  compact?: boolean
}

interface FriendshipStatus {
  status: 'none' | 'pending_sent' | 'pending_received' | 'friends'
  friendshipId?: string
}

export default function UserActions({
  targetUserId,
  targetUser,
  showMessageButton = true,
  showFriendButton = true,
  showBlockButton = true,
  compact = false
}: UserActionsProps) {
  const { user } = useAuth()
  const [friendshipStatus, setFriendshipStatus] = useState<FriendshipStatus>({ status: 'none' })
  const [isBlocked, setIsBlocked] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (user?.walletAddress && targetUserId !== user.id) {
      fetchRelationshipStatus()
    } else {
      setLoading(false)
    }
  }, [user, targetUserId])

  const fetchRelationshipStatus = async () => {
    try {
      // Check friendship status
      const friendsResponse = await fetch('/api/users/friends?type=all', {
        headers: {
          'x-wallet-address': user?.walletAddress || ''
        }
      })

      if (friendsResponse.ok) {
        const friendsData = await friendsResponse.json()
        const friendship = friendsData.data.find((f: any) =>
          f.friend.id === targetUserId
        )

        if (friendship) {
          if (friendship.status === 'ACCEPTED') {
            setFriendshipStatus({ status: 'friends', friendshipId: friendship.id })
          } else if (friendship.isInitiator) {
            setFriendshipStatus({ status: 'pending_sent', friendshipId: friendship.id })
          } else {
            setFriendshipStatus({ status: 'pending_received', friendshipId: friendship.id })
          }
        }
      }

      // Check if blocked
      const blocksResponse = await fetch('/api/users/block', {
        headers: {
          'x-wallet-address': user?.walletAddress || ''
        }
      })

      if (blocksResponse.ok) {
        const blocksData = await blocksResponse.json()
        const blocked = blocksData.data.some((block: any) => block.user.id === targetUserId)
        setIsBlocked(blocked)
      }

    } catch (error) {
      console.error('Error fetching relationship status:', error)
    } finally {
      setLoading(false)
    }
  }

  const sendFriendRequest = async () => {
    try {
      const response = await fetch('/api/users/friends', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-wallet-address': user?.walletAddress || ''
        },
        body: JSON.stringify({ userId: targetUserId })
      })

      if (response.ok) {
        const data = await response.json()
        setFriendshipStatus({ status: 'pending_sent', friendshipId: data.data.id })
      } else {
        const error = await response.json()
        alert(error.error || 'Failed to send friend request')
      }
    } catch (error) {
      console.error('Error sending friend request:', error)
      alert('Failed to send friend request')
    }
  }

  const acceptFriendRequest = async () => {
    if (!friendshipStatus.friendshipId) return

    try {
      const response = await fetch(`/api/users/friends/${friendshipStatus.friendshipId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-wallet-address': user?.walletAddress || ''
        },
        body: JSON.stringify({ action: 'accept' })
      })

      if (response.ok) {
        setFriendshipStatus({ status: 'friends', friendshipId: friendshipStatus.friendshipId })
      } else {
        const error = await response.json()
        alert(error.error || 'Failed to accept friend request')
      }
    } catch (error) {
      console.error('Error accepting friend request:', error)
      alert('Failed to accept friend request')
    }
  }

  const removeFriend = async () => {
    if (!friendshipStatus.friendshipId) return

    const action = friendshipStatus.status === 'friends' ? 'remove friend' : 'cancel request'

    if (!confirm(`Are you sure you want to ${action}?`)) return

    try {
      const response = await fetch(`/api/users/friends/${friendshipStatus.friendshipId}`, {
        method: 'DELETE',
        headers: {
          'x-wallet-address': user?.walletAddress || ''
        }
      })

      if (response.ok) {
        setFriendshipStatus({ status: 'none' })
      } else {
        const error = await response.json()
        alert(error.error || `Failed to ${action}`)
      }
    } catch (error) {
      console.error(`Error ${action}:`, error)
      alert(`Failed to ${action}`)
    }
  }

  const blockUser = async () => {
    const userName = targetUser.displayName || targetUser.username || 'this user'
    if (!confirm(`Are you sure you want to block ${userName}?`)) return

    try {
      const response = await fetch('/api/users/block', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-wallet-address': user?.walletAddress || ''
        },
        body: JSON.stringify({ userId: targetUserId })
      })

      if (response.ok) {
        setIsBlocked(true)
        setFriendshipStatus({ status: 'none' }) // Blocking removes friendship
      } else {
        const error = await response.json()
        alert(error.error || 'Failed to block user')
      }
    } catch (error) {
      console.error('Error blocking user:', error)
      alert('Failed to block user')
    }
  }

  const unblockUser = async () => {
    const userName = targetUser.displayName || targetUser.username || 'this user'
    if (!confirm(`Are you sure you want to unblock ${userName}?`)) return

    try {
      const response = await fetch(`/api/users/block?userId=${targetUserId}`, {
        method: 'DELETE',
        headers: {
          'x-wallet-address': user?.walletAddress || ''
        }
      })

      if (response.ok) {
        setIsBlocked(false)
      } else {
        const error = await response.json()
        alert(error.error || 'Failed to unblock user')
      }
    } catch (error) {
      console.error('Error unblocking user:', error)
      alert('Failed to unblock user')
    }
  }

  // Don't show actions for the current user
  if (!user || targetUserId === user.id) {
    return null
  }

  if (loading) {
    return (
      <div className={`flex ${compact ? 'space-x-2' : 'space-x-3'}`}>
        <div className={`bg-gray-600 rounded-lg animate-pulse ${compact ? 'h-8 w-16' : 'h-10 w-20'}`}></div>
        <div className={`bg-gray-600 rounded-lg animate-pulse ${compact ? 'h-8 w-16' : 'h-10 w-20'}`}></div>
      </div>
    )
  }

  return (
    <div className={`flex ${compact ? 'space-x-2' : 'space-x-3'}`}>
      {/* Message Button */}
      {showMessageButton && !isBlocked && (
        <Link
          href={`/messages/new?userId=${targetUserId}`}
          className={`bg-cyan-500 hover:bg-cyan-600 text-white rounded-lg transition-colors flex items-center justify-center gap-2 ${
            compact ? 'px-3 py-1 text-sm' : 'px-4 py-2'
          }`}
        >
          <span className="text-xl">💬</span>
          <span>Message</span>
        </Link>
      )}

      {/* Friend Button */}
      {showFriendButton && !isBlocked && (
        <>
          {friendshipStatus.status === 'none' && (
            <button
              onClick={sendFriendRequest}
              className={`bg-purple-500 hover:bg-purple-600 text-white rounded-lg transition-colors flex items-center justify-center gap-2 ${
                compact ? 'px-3 py-1 text-sm' : 'px-4 py-2'
              }`}
            >
              <img src="https://gmgnrepeat.com/icons/penguinfriends1.png" alt="Add Friend" className={compact ? 'w-5 h-5' : 'w-6 h-6'} />
              <span>Add Friend</span>
            </button>
          )}

          {friendshipStatus.status === 'pending_sent' && (
            <button
              onClick={removeFriend}
              className={`bg-yellow-500 hover:bg-yellow-600 text-white rounded-lg transition-colors ${
                compact ? 'px-3 py-1 text-sm' : 'px-4 py-2'
              }`}
            >
              ⏳ Pending
            </button>
          )}

          {friendshipStatus.status === 'pending_received' && (
            <div className={`flex ${compact ? 'space-x-1' : 'space-x-2'}`}>
              <button
                onClick={acceptFriendRequest}
                className={`bg-green-500 hover:bg-green-600 text-white rounded-lg transition-colors ${
                  compact ? 'px-2 py-1 text-xs' : 'px-3 py-2 text-sm'
                }`}
              >
                ✓ Accept
              </button>
              <button
                onClick={removeFriend}
                className={`bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors ${
                  compact ? 'px-2 py-1 text-xs' : 'px-3 py-2 text-sm'
                }`}
              >
                ✗ Decline
              </button>
            </div>
          )}

          {friendshipStatus.status === 'friends' && (
            <button
              onClick={removeFriend}
              className={`bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors ${
                compact ? 'px-3 py-1 text-sm' : 'px-4 py-2'
              }`}
            >
              ✓ Friends
            </button>
          )}
        </>
      )}

      {/* Block Button */}
      {showBlockButton && (
        <>
          {!isBlocked ? (
            <button
              onClick={blockUser}
              className={`bg-red-500/20 hover:bg-red-500/30 text-red-300 border border-red-500/30 rounded-lg transition-colors ${
                compact ? 'px-3 py-1 text-sm' : 'px-4 py-2'
              }`}
            >
              🚫 Block
            </button>
          ) : (
            <button
              onClick={unblockUser}
              className={`bg-gray-500/20 hover:bg-gray-500/30 text-gray-300 border border-gray-500/30 rounded-lg transition-colors ${
                compact ? 'px-3 py-1 text-sm' : 'px-4 py-2'
              }`}
            >
              🔓 Unblock
            </button>
          )}
        </>
      )}
    </div>
  )
}