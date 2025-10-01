'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/providers/AuthProvider'
import Navbar from '@/components/Navbar'
import PenguinLoadingScreen from '@/components/PenguinLoadingScreen'
import { getEffectiveAvatar, getAvatarFallback } from '@/lib/avatar-utils'
import Link from 'next/link'

interface Conversation {
  id: string
  participants: {
    id: string
    username: string
    displayName: string
    avatar: string | null
  }[]
  otherParticipants: {
    id: string
    username: string
    displayName: string
    avatar: string | null
  }[]
  isGroup: boolean
  groupName?: string
  groupAvatar?: string
  groupDescription?: string
  createdBy?: string
  adminIds: string[]
  lastMessage: {
    id: string
    content: string
    createdAt: string
    sender: {
      id: string
      username: string
      displayName: string
    }
  } | null
  lastMessageAt: string | null
  unreadCount: number
  createdAt: string
  updatedAt: string
}

export default function MessagesPage() {
  const { user, isAuthenticated, loading: authLoading, sessionToken } = useAuth()
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (isAuthenticated && user) {
      fetchConversations()
    }
  }, [isAuthenticated, user])

  const fetchConversations = async () => {
    if (!user?.walletAddress || !sessionToken) return

    try {
      const response = await fetch('/api/messages/conversations', {
        headers: {
          'Authorization': `Bearer ${sessionToken}`,
          'x-wallet-address': user.walletAddress
        }
      })

      const result = await response.json()
      if (result.success) {
        setConversations(result.data)
      }
    } catch (error) {
      console.error('Error fetching conversations:', error)
    } finally {
      setLoading(false)
    }
  }

  const formatMessageTime = (dateString: string | null) => {
    if (!dateString) return ''

    const date = new Date(dateString)
    const now = new Date()
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60))

    if (diffInMinutes < 1) return 'Just now'
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`
    if (diffInMinutes < 10080) return `${Math.floor(diffInMinutes / 1440)}d ago`
    return date.toLocaleDateString()
  }

  const startNewConversation = async (targetUserId: string) => {
    if (!user?.walletAddress || !sessionToken) return

    try {
      const response = await fetch('/api/messages/conversations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${sessionToken}`,
          'x-wallet-address': user.walletAddress
        },
        body: JSON.stringify({ participantIds: [targetUserId] })
      })

      const result = await response.json()
      if (result.success) {
        fetchConversations() // Refresh conversations list
        // Navigate to the conversation
        window.location.href = `/messages/${result.conversation.id}`
      }
    } catch (error) {
      console.error('Error starting conversation:', error)
    }
  }

  if (authLoading) {
    return <PenguinLoadingScreen />
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-900 via-purple-900 to-indigo-900 flex items-center justify-center">
        <div className="text-center text-white">
          <div className="text-6xl mb-4">🐧</div>
          <h1 className="text-2xl font-bold mb-4">Access Denied</h1>
          <p className="text-gray-300 mb-6">You need to connect your wallet to view messages!</p>
          <Link href="/" className="bg-cyan-500 text-white px-6 py-3 rounded-xl hover:bg-cyan-600 transition-colors">
            Back to Home
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-purple-900 to-indigo-900">
      <Navbar />

      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-white mb-4 flex items-center justify-center">
              <span className="mr-3">💬</span>
              Messages
            </h1>
            <p className="text-xl text-gray-300 mb-6">
              Private conversations with your fellow penguins
            </p>

            {/* Action Buttons */}
            <div className="flex justify-center gap-4">
              <Link
                href="/discover"
                className="bg-cyan-500 text-white px-6 py-3 rounded-xl hover:bg-cyan-600 transition-colors"
              >
                💬 New Chat
              </Link>
              <Link
                href="/messages/new-group"
                className="bg-purple-500 text-white px-6 py-3 rounded-xl hover:bg-purple-600 transition-colors"
              >
                👥 Create Group
              </Link>
            </div>
          </div>

          {loading ? (
            <div className="text-center text-white py-12">
              <div className="text-4xl mb-4">🔄</div>
              <p>Loading your conversations...</p>
            </div>
          ) : (
            <div className="space-y-4">
              {conversations.length === 0 ? (
                <div className="text-center text-white py-12">
                  <div className="text-6xl mb-4">📪</div>
                  <h2 className="text-2xl font-bold mb-4">No conversations yet</h2>
                  <p className="text-gray-300 mb-6">Start messaging other penguins to see your conversations here!</p>
                  <Link
                    href="/discover"
                    className="bg-cyan-500 text-white px-6 py-3 rounded-xl hover:bg-cyan-600 transition-colors"
                  >
                    Discover Penguins
                  </Link>
                </div>
              ) : (
                conversations.map((conversation) => (
                  <Link
                    key={conversation.id}
                    href={`/messages/${conversation.id}`}
                    className="block"
                  >
                    <div className="bg-white/10 backdrop-blur-lg rounded-2xl border border-white/20 p-6 hover:bg-white/15 transition-all">
                      <div className="flex items-start gap-4">
                        {/* Avatar */}
                        <div className="relative w-14 h-14 flex-shrink-0">
                          {conversation.isGroup ? (
                            <div className="w-14 h-14 bg-gradient-to-br from-purple-400 to-pink-500 rounded-xl flex items-center justify-center text-xl font-bold text-white">
                              {conversation.groupAvatar ? (
                                <img
                                  src={conversation.groupAvatar}
                                  alt={conversation.groupName || 'Group'}
                                  className="w-full h-full rounded-xl object-cover"
                                />
                              ) : (
                                '👥'
                              )}
                            </div>
                          ) : (
                            <div className="w-14 h-14 bg-gradient-to-br from-cyan-400 to-blue-500 rounded-xl flex items-center justify-center text-xl font-bold text-white">
                              {getEffectiveAvatar(conversation.otherParticipants[0]) ? (
                                <img
                                  src={getEffectiveAvatar(conversation.otherParticipants[0])!}
                                  alt={conversation.otherParticipants[0]?.displayName || conversation.otherParticipants[0]?.username}
                                  className="w-full h-full rounded-xl object-cover"
                                />
                              ) : (
                                getAvatarFallback(conversation.otherParticipants[0])
                              )}
                            </div>
                          )}
                          {/* Group indicator */}
                          {conversation.isGroup && (
                            <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-purple-500 rounded-full flex items-center justify-center text-xs">
                              {conversation.participants.length}
                            </div>
                          )}
                        </div>

                        {/* Conversation Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-1">
                            <div className="flex items-center gap-2">
                              <h3 className="text-lg font-bold text-white truncate">
                                {conversation.isGroup
                                  ? conversation.groupName
                                  : conversation.otherParticipants[0]?.displayName || conversation.otherParticipants[0]?.username || 'Unknown User'}
                              </h3>
                              {conversation.isGroup && (
                                <span className="text-purple-300 text-xs">GROUP</span>
                              )}
                            </div>
                            {conversation.unreadCount > 0 && (
                              <span className="bg-red-500 text-white text-xs px-2 py-1 rounded-full flex-shrink-0">
                                {conversation.unreadCount}
                              </span>
                            )}
                          </div>

                          <p className="text-gray-300 text-sm mb-2">
                            {conversation.isGroup
                              ? `${conversation.participants.length} members`
                              : `@${conversation.otherParticipants.map(p => p.username).join(', ')}`
                            }
                          </p>

                          {conversation.lastMessage && (
                            <div className="flex items-center justify-between">
                              <p className="text-gray-200 truncate flex-1 pr-4">
                                <span className="font-medium">
                                  {conversation.lastMessage.sender.displayName}:
                                </span>{' '}
                                {conversation.lastMessage.content}
                              </p>
                              <span className="text-gray-400 text-sm flex-shrink-0">
                                {formatMessageTime(conversation.lastMessage.createdAt)}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </Link>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}