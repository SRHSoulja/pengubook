'use client'

import { useState, useEffect } from 'react'
import { useAbstractClient } from '@abstract-foundation/agw-react'

interface FollowButtonProps {
  targetUserId: string
  currentUserId: string
  initialIsFollowing: boolean
}

export default function FollowButton({ targetUserId, currentUserId, initialIsFollowing }: FollowButtonProps) {
  const { data: client } = useAbstractClient()
  const [isFollowing, setIsFollowing] = useState(initialIsFollowing)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    checkFollowStatus()
  }, [targetUserId, currentUserId])

  const checkFollowStatus = async () => {
    if (!client?.account?.address) return

    try {
      const response = await fetch(`/api/users/follow?userId=${targetUserId}&type=followers&limit=1000`)
      const data = await response.json()

      if (response.ok) {
        const isFollowingUser = data.data.users.some((user: any) => user.id === currentUserId)
        setIsFollowing(isFollowingUser)
      }
    } catch (error) {
      console.error('Error checking follow status:', error)
    }
  }

  const handleFollow = async () => {
    if (!client?.account?.address || loading) return

    setLoading(true)

    try {
      const response = await fetch('/api/users/follow', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-wallet-address': client.account.address
        },
        body: JSON.stringify({
          targetUserId,
          action: isFollowing ? 'unfollow' : 'follow'
        })
      })

      const data = await response.json()

      if (response.ok) {
        setIsFollowing(!isFollowing)
      } else {
        console.error('Follow action failed:', data.error)
      }
    } catch (error) {
      console.error('Error handling follow action:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      onClick={handleFollow}
      disabled={loading}
      className={`px-6 py-3 rounded-xl font-semibold transition-all transform hover:scale-105 shadow-lg flex items-center justify-center gap-2 ${
        isFollowing
          ? 'bg-gray-500/20 text-gray-300 hover:bg-gray-500/30 border border-gray-500/20'
          : 'bg-gradient-to-r from-blue-500 to-purple-500 text-white hover:from-blue-600 hover:to-purple-600'
      } ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
    >
      {loading ? (
        <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
      ) : (
        <>
          <span className="text-lg">{isFollowing ? '➖' : '➕'}</span>
          {isFollowing ? 'Unfollow' : 'Follow'}
        </>
      )}
    </button>
  )
}