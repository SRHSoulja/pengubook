'use client'

import { useState, useEffect } from 'react'
import { useAbstractClient } from '@abstract-foundation/agw-react'
import { useToast } from '@/components/ui/Toast'

interface FriendButtonProps {
  targetUserId: string
  currentUserId: string
}

export default function FriendButton({ targetUserId, currentUserId }: FriendButtonProps) {
  const { data: client } = useAbstractClient()
  const { addToast } = useToast()
  const [friendshipStatus, setFriendshipStatus] = useState<'none' | 'pending' | 'friends' | 'sent'>('none')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    checkFriendshipStatus()
  }, [targetUserId, currentUserId])

  const checkFriendshipStatus = async () => {
    if (!client?.account?.address) return

    try {
      const response = await fetch(`/api/social/friends?userId=${currentUserId}&type=all`)
      const data = await response.json()

      if (response.ok) {
        // Check if already friends
        const isFriend = data.data.friends?.some((friend: any) => friend.user.id === targetUserId)
        if (isFriend) {
          setFriendshipStatus('friends')
          return
        }

        // Check if pending request (received)
        const hasPendingRequest = data.data.pendingRequests?.some((request: any) => request.initiator.id === targetUserId)
        if (hasPendingRequest) {
          setFriendshipStatus('pending')
          return
        }

        // Check if sent request (initiated by current user)
        const response2 = await fetch(`/api/social/friends?userId=${targetUserId}&type=pending`)
        const data2 = await response2.json()
        if (response2.ok) {
          const hasSentRequest = data2.data.pendingRequests?.some((request: any) => request.initiator.id === currentUserId)
          if (hasSentRequest) {
            setFriendshipStatus('sent')
            return
          }
        }

        setFriendshipStatus('none')
      }
    } catch (error) {
      console.error('Error checking friendship status:', error)
    }
  }

  const handleFriendRequest = async () => {
    if (!client?.account?.address || loading) return

    setLoading(true)

    try {
      const response = await fetch('/api/social/friends', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          initiatorId: currentUserId,
          receiverId: targetUserId
        })
      })

      const data = await response.json()

      if (response.ok) {
        setFriendshipStatus('sent')
      } else {
        console.error('Friend request failed:', data.error)
        addToast(data.error || 'Failed to send friend request', 'error')
      }
    } catch (error) {
      console.error('Error sending friend request:', error)
      addToast('Failed to send friend request', 'error')
    } finally {
      setLoading(false)
    }
  }

  const getButtonContent = () => {
    switch (friendshipStatus) {
      case 'friends':
        return {
          text: 'Friends',
          icon: '✅',
          className: 'bg-green-500/20 text-green-300 border border-green-500/20 cursor-default',
          disabled: true
        }
      case 'pending':
        return {
          text: 'Accept Request',
          icon: '📨',
          className: 'bg-gradient-to-r from-orange-500 to-yellow-500 text-white hover:from-orange-600 hover:to-yellow-600',
          disabled: false
        }
      case 'sent':
        return {
          text: 'Request Sent',
          icon: '📤',
          className: 'bg-gray-500/20 text-gray-300 border border-gray-500/20 cursor-default',
          disabled: true
        }
      default:
        return {
          text: 'Add Friend',
          icon: <img src="https://gmgnrepeat.com/icons/penguinfriends1.png" alt="Add Friend" className="w-5 h-5" />,
          className: 'bg-gradient-to-r from-pink-500 to-rose-500 text-white hover:from-pink-600 hover:to-rose-600',
          disabled: false
        }
    }
  }

  const buttonContent = getButtonContent()

  return (
    <button
      onClick={friendshipStatus === 'none' ? handleFriendRequest : undefined}
      disabled={loading || buttonContent.disabled}
      className={`px-6 py-3 rounded-xl font-semibold transition-all transform hover:scale-105 shadow-lg flex items-center justify-center gap-2 ${buttonContent.className} ${
        loading ? 'opacity-50 cursor-not-allowed' : ''
      }`}
    >
      {loading ? (
        <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
      ) : (
        <>
          <span className="text-lg">{buttonContent.icon}</span>
          {buttonContent.text}
        </>
      )}
    </button>
  )
}