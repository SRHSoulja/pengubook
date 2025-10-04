'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { useTheme } from '@/providers/ThemeProvider'
import Navbar from '@/components/Navbar'
import Link from 'next/link'

interface Friend {
  id: string
  username: string
  displayName: string
  avatar?: string
  level: number
  isOnline: boolean
  lastSeen: string
  profile: {
    profileVerified: boolean
    followersCount: number
    postsCount: number
  }
}

interface FriendRequest {
  id: string
  status: 'PENDING' | 'ACCEPTED' | 'BLOCKED'
  createdAt: string
  initiator?: Friend
  receiver?: Friend
}

export default function FriendsPage() {
  const { user, isAuthenticated, loading: authLoading } = useAuth()
  const { currentTheme } = useTheme()
  const [friends, setFriends] = useState<Friend[]>([])
  const [friendRequests, setFriendRequests] = useState<FriendRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'friends' | 'requests'>('friends')

  useEffect(() => {
    if (isAuthenticated && user) {
      fetchFriends()
      fetchFriendRequests()
    }
  }, [isAuthenticated, user])

  const fetchFriends = async () => {
    if (!user) return

    try {
      const response = await fetch(`/api/friends/${user.id}`)
      if (response.ok) {
        const data = await response.json()
        setFriends(data.data || [])
      }
    } catch (error) {
      console.error('Error fetching friends:', error)
    }
  }

  const fetchFriendRequests = async () => {
    if (!user) return

    try {
      const response = await fetch(`/api/friends/requests/${user.id}`)
      if (response.ok) {
        const data = await response.json()
        setFriendRequests(data.data || [])
      }
    } catch (error) {
      console.error('Error fetching friend requests:', error)
    } finally {
      setLoading(false)
    }
  }

  const acceptFriendRequest = async (requestId: string) => {
    try {
      const response = await fetch('/api/friends/requests/accept', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ requestId })
      })

      if (response.ok) {
        // Refresh both lists
        fetchFriends()
        fetchFriendRequests()
      }
    } catch (error) {
      console.error('Error accepting friend request:', error)
    }
  }

  const declineFriendRequest = async (requestId: string) => {
    try {
      const response = await fetch('/api/friends/requests/decline', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ requestId })
      })

      if (response.ok) {
        fetchFriendRequests()
      }
    } catch (error) {
      console.error('Error declining friend request:', error)
    }
  }

  if (authLoading) {
    return (
      <div style={{ background: `linear-gradient(135deg, ${currentTheme.colors.from}, ${currentTheme.colors.via}, ${currentTheme.colors.to})` }} className="min-h-screen transition-all duration-500">
        <Navbar />
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center text-white">
            <div className="flex justify-center mb-4"><img src="https://gmgnrepeat.com/icons/pengubookicon1.png" alt="PeBloq" className="w-24 h-24" /></div>
            <h1 className="text-2xl font-bold mb-4">Loading...</h1>
            <div className="w-8 h-8 border-4 border-white border-t-transparent rounded-full animate-spin mx-auto"></div>
          </div>
        </div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return (
      <div style={{ background: `linear-gradient(135deg, ${currentTheme.colors.from}, ${currentTheme.colors.via}, ${currentTheme.colors.to})` }} className="min-h-screen transition-all duration-500">
        <Navbar />
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center text-white">
            <div className="flex justify-center mb-4"><img src="https://gmgnrepeat.com/icons/pengubookicon1.png" alt="PeBloq" className="w-24 h-24" /></div>
            <h1 className="text-2xl font-bold mb-4">Access Denied</h1>
            <p className="text-gray-300 mb-6">You need to connect your wallet to see your friends!</p>
            <Link href="/" className="bg-cyan-500 text-white px-6 py-3 rounded-xl hover:bg-cyan-600 transition-colors">
              Back to Home
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div style={{ background: `linear-gradient(135deg, ${currentTheme.colors.from}, ${currentTheme.colors.via}, ${currentTheme.colors.to})` }} className="min-h-screen transition-all duration-500">
      <Navbar />

      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-white mb-4 flex items-center justify-center">
              <img src="https://gmgnrepeat.com/icons/penguinfriends1.png" alt="Friends" className="w-12 h-12 mr-3" />
              Penguin Friends
            </h1>
            <p className="text-xl text-gray-300">
              Your colony connections and friendship requests
            </p>
          </div>

          {/* Tab Navigation */}
          <div className="flex bg-white/10 backdrop-blur-lg rounded-2xl border border-white/20 p-2 mb-8">
            <button
              onClick={() => setActiveTab('friends')}
              className={`flex-1 py-3 px-4 rounded-xl font-semibold transition-all ${
                activeTab === 'friends'
                  ? 'bg-cyan-500 text-white shadow-lg'
                  : 'text-gray-300 hover:bg-white/10'
              }`}
            >
              <img src="https://gmgnrepeat.com/icons/penguinfriends1.png" alt="Friends" className="w-5 h-5 inline-block mr-2" />
              My Friends ({friends.length})
            </button>
            <button
              onClick={() => setActiveTab('requests')}
              className={`flex-1 py-3 px-4 rounded-xl font-semibold transition-all ${
                activeTab === 'requests'
                  ? 'bg-purple-500 text-white shadow-lg'
                  : 'text-gray-300 hover:bg-white/10'
              }`}
            >
              📨 Friend Requests ({friendRequests.length})
            </button>
          </div>

          {/* Content */}
          {loading ? (
            <div className="text-center text-white py-12">
              <div className="text-4xl mb-4">🔄</div>
              <p>Loading your penguin connections...</p>
            </div>
          ) : (
            <div className="space-y-6">
              {activeTab === 'friends' && (
                <>
                  {friends.length === 0 ? (
                    <div className="text-center text-white py-12">
                      <div className="flex justify-center mb-4"><img src="https://gmgnrepeat.com/icons/pengubookicon1.png" alt="PeBloq" className="w-24 h-24" /></div>
                      <h2 className="text-2xl font-bold mb-4">No Friends Yet</h2>
                      <p className="text-gray-300 mb-6">Start connecting with other penguins!</p>
                      <Link
                        href="/discover"
                        className="bg-cyan-500 text-white px-6 py-3 rounded-xl hover:bg-cyan-600 transition-colors"
                      >
                        Discover Penguins
                      </Link>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {friends.map((friend) => (
                        <div key={friend.id} className="bg-white/10 backdrop-blur-lg rounded-2xl border border-white/20 p-6 hover:bg-white/15 transition-all">
                          <div className="flex items-start gap-4 mb-4">
                            {/* Avatar */}
                            <div className="w-16 h-16 bg-gradient-to-br from-cyan-400 to-blue-500 rounded-xl flex items-center justify-center text-2xl font-bold text-white relative">
                              {friend.avatar ? (
                                <img
                                  src={friend.avatar}
                                  alt={friend.displayName}
                                  className="w-full h-full rounded-xl object-cover"
                                />
                              ) : (
                                friend.displayName.charAt(0)
                              )}
                              {/* Online status */}
                              {friend.isOnline && (
                                <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-green-500 rounded-full border-2 border-white"></div>
                              )}
                            </div>

                            {/* Friend Info */}
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <h3 className="text-lg font-bold text-white">{friend.displayName}</h3>
                                {friend.profile.profileVerified && <span className="text-blue-400">✓</span>}
                              </div>
                              <p className="text-gray-300 text-sm mb-2">@{friend.username}</p>

                              <div className="flex items-center gap-4 text-xs text-gray-400 mb-3">
                                <span>Level {friend.level}</span>
                                <span>{friend.profile.followersCount} followers</span>
                                <span>{friend.profile.postsCount} posts</span>
                              </div>

                              <p className="text-gray-400 text-xs">
                                {friend.isOnline ? 'Online now' : `Last seen ${new Date(friend.lastSeen).toLocaleDateString()}`}
                              </p>
                            </div>
                          </div>

                          {/* Actions */}
                          <div className="flex gap-2">
                            <Link
                              href={`/profile/${friend.id}`}
                              className="flex-1 bg-cyan-500/20 text-cyan-300 px-4 py-2 rounded-lg hover:bg-cyan-500/30 transition-colors text-center text-sm"
                            >
                              View Profile
                            </Link>
                            <button className="bg-purple-500/20 text-purple-300 px-4 py-2 rounded-lg hover:bg-purple-500/30 transition-colors text-sm">
                              Message
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}

              {activeTab === 'requests' && (
                <>
                  {friendRequests.length === 0 ? (
                    <div className="text-center text-white py-12">
                      <div className="text-4xl mb-4">📭</div>
                      <p className="text-xl">No pending friend requests</p>
                      <p className="text-gray-300">When penguins want to connect, they'll appear here!</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {friendRequests.map((request) => {
                        const otherUser = request.initiator?.id === user?.id ? request.receiver : request.initiator
                        if (!otherUser) return null

                        return (
                          <div key={request.id} className="bg-white/10 backdrop-blur-lg rounded-2xl border border-white/20 p-6">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-4">
                                {/* Avatar */}
                                <div className="w-16 h-16 bg-gradient-to-br from-purple-400 to-pink-500 rounded-xl flex items-center justify-center text-2xl font-bold text-white">
                                  {otherUser.avatar ? (
                                    <img
                                      src={otherUser.avatar}
                                      alt={otherUser.displayName}
                                      className="w-full h-full rounded-xl object-cover"
                                    />
                                  ) : (
                                    otherUser.displayName.charAt(0)
                                  )}
                                </div>

                                {/* Request Info */}
                                <div>
                                  <div className="flex items-center gap-2 mb-1">
                                    <h3 className="text-lg font-bold text-white">{otherUser.displayName}</h3>
                                    {otherUser.profile.profileVerified && <span className="text-blue-400">✓</span>}
                                  </div>
                                  <p className="text-gray-300 text-sm mb-1">@{otherUser.username}</p>
                                  <p className="text-gray-400 text-xs">
                                    {request.initiator?.id === user?.id ? 'Request sent' : 'Wants to be friends'} • {new Date(request.createdAt).toLocaleDateString()}
                                  </p>
                                </div>
                              </div>

                              {/* Actions */}
                              {request.initiator?.id !== user?.id && (
                                <div className="flex gap-2">
                                  <button
                                    onClick={() => acceptFriendRequest(request.id)}
                                    className="bg-green-500/20 text-green-300 px-4 py-2 rounded-lg hover:bg-green-500/30 transition-colors text-sm"
                                  >
                                    Accept
                                  </button>
                                  <button
                                    onClick={() => declineFriendRequest(request.id)}
                                    className="bg-red-500/20 text-red-300 px-4 py-2 rounded-lg hover:bg-red-500/30 transition-colors text-sm"
                                  >
                                    Decline
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}