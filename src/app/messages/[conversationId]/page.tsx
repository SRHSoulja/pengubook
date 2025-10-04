'use client'

import { useState, useEffect, useRef } from 'react'
import { useAuth } from '@/providers/AuthProvider'
import { useWebSocket } from '@/hooks/useWebSocket'
import Navbar from '@/components/Navbar'
import PenguinLoadingScreen from '@/components/PenguinLoadingScreen'
import GiphyPicker from '@/components/GiphyPicker'
import { getEffectiveAvatar, getAvatarFallback } from '@/lib/avatar-utils'
import Link from 'next/link'

interface MessageReaction {
  id: string
  emoji: string
  user: {
    id: string
    username: string
    displayName: string
  }
}

interface Message {
  id: string
  content: string
  messageType: string
  mediaUrls: string[]
  createdAt: string
  reactions?: MessageReaction[]
  sender: {
    id: string
    username: string
    displayName: string
    avatar: string | null
  }
}

interface ConversationPageProps {
  params: { conversationId: string }
}

export default function ConversationPage({ params }: ConversationPageProps) {
  const { user, isAuthenticated, loading: authLoading } = useAuth()
  const [messages, setMessages] = useState<Message[]>([])
  const [loading, setLoading] = useState(true)
  const [newMessage, setNewMessage] = useState('')
  const [sending, setSending] = useState(false)
  const [showGiphyPicker, setShowGiphyPicker] = useState(false)
  const [showReactionPicker, setShowReactionPicker] = useState<string | null>(null)
  const [showReportModal, setShowReportModal] = useState(false)
  const [reportingMessageId, setReportingMessageId] = useState<string | null>(null)
  const [reportReason, setReportReason] = useState('')
  const [submittingReport, setSubmittingReport] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const REACTION_EMOJIS = ['❤️', '👍', '😂', '😮', '😢', '🙏']

  // Initialize WebSocket for real-time messaging
  const {
    isConnected,
    sendMessage: sendWebSocketMessage,
    startTyping,
    stopTyping,
    typingUsers,
    onlineUsers,
    joinConversation
  } = useWebSocket({
    autoConnect: true,
    conversationId: params.conversationId
  })

  useEffect(() => {
    if (isAuthenticated && user) {
      fetchMessages()
    }
  }, [isAuthenticated, user, params.conversationId])

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  // Listen for real-time message events
  useEffect(() => {
    const handleNewMessage = (event: CustomEvent) => {
      const { conversationId, message } = event.detail
      if (conversationId === params.conversationId) {
        setMessages(prev => [...(prev || []), message])
      }
    }

    const handleMessagesRead = (event: CustomEvent) => {
      const { conversationId, messageIds } = event.detail
      if (conversationId === params.conversationId) {
        setMessages(prev =>
          (prev || []).map(msg =>
            messageIds.includes(msg.id)
              ? { ...msg, isRead: true }
              : msg
          )
        )
      }
    }

    // Add event listeners
    window.addEventListener('new-message', handleNewMessage as EventListener)
    window.addEventListener('messages-read', handleMessagesRead as EventListener)

    return () => {
      window.removeEventListener('new-message', handleNewMessage as EventListener)
      window.removeEventListener('messages-read', handleMessagesRead as EventListener)
    }
  }, [params.conversationId])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const fetchMessages = async () => {
    if (!user?.id) return

    try {
      const response = await fetch(`/api/messages/${params.conversationId}`, {
        headers: {
          'x-user-id': user.id,
          'x-wallet-address': user.walletAddress || ''
        }
      })

      const result = await response.json()
      if (result.success) {
        setMessages(result.messages || [])

        // Mark messages as read after fetching
        markMessagesAsRead()
      } else {
        console.error('Failed to fetch messages:', result.error)
      }
    } catch (error) {
      console.error('Error fetching messages:', error)
    } finally {
      setLoading(false)
    }
  }

  const markMessagesAsRead = async () => {
    if (!user?.id) return

    try {
      await fetch(`/api/messages/${params.conversationId}/mark-read`, {
        method: 'POST',
        headers: {
          'x-user-id': user.id,
          'x-wallet-address': user.walletAddress || ''
        }
      })
    } catch (error) {
      console.error('Error marking messages as read:', error)
    }
  }

  const toggleReaction = async (messageId: string, emoji: string) => {
    if (!user?.walletAddress) return

    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json'
      }
      if (user.walletAddress) headers['x-wallet-address'] = user.walletAddress
      if (user.id) headers['x-user-id'] = user.id

      const response = await fetch(`/api/message-reactions/${messageId}/reactions`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ emoji })
      })

      if (response.ok) {
        const data = await response.json()
        setMessages(prev => prev.map(msg =>
          msg.id === messageId
            ? { ...msg, reactions: data.reactions }
            : msg
        ))
        setShowReactionPicker(null)
      }
    } catch (error) {
      console.error('Failed to toggle reaction:', error)
    }
  }

  const sendMessage = async (e: React.FormEvent, messageType = 'TEXT', mediaUrls: string[] = []) => {
    e.preventDefault()
    if ((!newMessage.trim() && mediaUrls.length === 0) || sending) return

    setSending(true)

    try {
      if (isConnected) {
        // Use WebSocket for real-time messaging
        sendWebSocketMessage(params.conversationId, newMessage.trim(), messageType, mediaUrls)
        setNewMessage('')
      } else {
        // Fallback to HTTP if WebSocket not connected
        const response = await fetch(`/api/messages/${params.conversationId}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-wallet-address': (user as any)?.walletAddress || ''
          },
          body: JSON.stringify({
            content: newMessage.trim() || 'GIF',
            messageType,
            mediaUrls
          })
        })

        const result = await response.json()
        if (result.success) {
          setMessages(prev => [...(prev || []), result.message])
          setNewMessage('')
        } else {
          console.error('Failed to send message:', result.error)
          alert('Failed to send message')
        }
      }
    } catch (error) {
      console.error('Error sending message:', error)
      alert('Failed to send message')
    } finally {
      setSending(false)
    }
  }

  const handleGifSelect = (gifUrl: string) => {
    sendMessage({ preventDefault: () => {} } as React.FormEvent, 'GIF', [gifUrl])
    setShowGiphyPicker(false)
  }

  const openReportModal = (messageId: string) => {
    setReportingMessageId(messageId)
    setShowReportModal(true)
  }

  const submitReport = async () => {
    if (!user || !reportReason.trim() || !reportingMessageId) return

    try {
      setSubmittingReport(true)
      const headers: Record<string, string> = {
        'Content-Type': 'application/json'
      }
      if (user.walletAddress) headers['x-wallet-address'] = user.walletAddress
      if (user.id) headers['x-user-id'] = user.id

      const response = await fetch('/api/reports', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          messageId: reportingMessageId,
          reason: reportReason
        }),
        credentials: 'include'
      })

      const data = await response.json()
      if (data.success) {
        alert('Report submitted successfully. Our team will review it.')
        setShowReportModal(false)
        setReportReason('')
        setReportingMessageId(null)
      } else {
        alert(data.error || 'Failed to submit report')
      }
    } catch (error) {
      console.error('Failed to submit report:', error)
      alert('Failed to submit report')
    } finally {
      setSubmittingReport(false)
    }
  }

  const formatMessageTime = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60))

    if (diffInMinutes < 1) return 'Just now'
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`
    return date.toLocaleString()
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
          <div className="mb-6">
            <Link
              href="/messages"
              className="text-cyan-400 hover:text-cyan-300 mb-4 inline-flex items-center"
            >
              ← Back to Messages
            </Link>
            <div className="flex items-center justify-between">
              <h1 className="text-2xl font-bold text-white">Conversation</h1>
              <div className="flex items-center space-x-2">
                <div className={`w-3 h-3 rounded-full ${isConnected ? 'bg-green-400' : 'bg-red-400'}`}></div>
                <span className="text-sm text-gray-300">
                  {isConnected ? 'Connected' : 'Offline'}
                </span>
              </div>
            </div>
          </div>

          {/* Messages Container */}
          <div className="bg-white/10 backdrop-blur-lg rounded-2xl border border-white/20 p-6 mb-6 h-[600px] flex flex-col">
            {/* Messages List */}
            <div className="flex-1 overflow-y-auto space-y-4 mb-4">
              {loading ? (
                <div className="text-center text-white py-12">
                  <div className="text-4xl mb-4">🔄</div>
                  <p>Loading messages...</p>
                </div>
              ) : !messages || messages.length === 0 ? (
                <div className="text-center text-white py-12">
                  <div className="text-4xl mb-4">💬</div>
                  <p>No messages yet. Start the conversation!</p>
                </div>
              ) : (
                (messages || []).map((message) => (
                  <div
                    key={message.id}
                    className={`flex ${message.sender.id === user?.id ? 'justify-end' : 'justify-start'}`}
                  >
                    <div className={`max-w-xs lg:max-w-md ${message.sender.id === user?.id ? 'order-2' : 'order-1'}`}>
                      <div
                        className={`rounded-2xl p-4 ${
                          message.sender.id === user?.id
                            ? 'bg-cyan-500 text-white ml-4'
                            : 'bg-white/20 text-white mr-4'
                        }`}
                      >
                        {message.sender.id !== user?.id && (
                          <div className="flex items-center space-x-2 mb-2">
                            <div className="w-6 h-6 bg-gradient-to-br from-purple-400 to-pink-400 rounded-full flex items-center justify-center text-xs font-bold text-white">
                              {getEffectiveAvatar(message.sender) ? (
                                <img
                                  src={getEffectiveAvatar(message.sender)!}
                                  alt={message.sender.displayName || message.sender.username}
                                  className="w-full h-full rounded-full object-cover"
                                />
                              ) : (
                                getAvatarFallback(message.sender)
                              )}
                            </div>
                            <span className="text-xs font-medium">{message.sender.displayName || message.sender.username}</span>
                          </div>
                        )}

                        {message.messageType === 'GIF' && message.mediaUrls?.length > 0 ? (
                          <div className="space-y-2">
                            {message.mediaUrls.map((url: string, index: number) => (
                              <img
                                key={index}
                                src={url}
                                alt="GIF"
                                className="max-w-xs rounded-lg"
                                style={{ maxHeight: '200px', width: 'auto' }}
                              />
                            ))}
                            {message.content && message.content !== 'GIF' && (
                              <p className="whitespace-pre-wrap break-words text-sm mt-2">{message.content}</p>
                            )}
                          </div>
                        ) : (
                          <p className="whitespace-pre-wrap break-words">{message.content}</p>
                        )}

                        <div className={`text-xs mt-2 ${message.sender.id === user?.id ? 'text-cyan-100' : 'text-gray-300'}`}>
                          {formatMessageTime(message.createdAt)}
                        </div>

                        {/* Reactions */}
                        {message.reactions && message.reactions.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {message.reactions.map((reaction) => (
                              <span
                                key={reaction.id}
                                className="inline-flex items-center px-2 py-1 bg-white/10 rounded-full text-xs"
                                title={reaction.user.displayName || reaction.user.username}
                              >
                                {reaction.emoji}
                              </span>
                            ))}
                          </div>
                        )}

                        {/* Reaction and Report buttons (only on received messages) */}
                        {message.sender.id !== user?.id && (
                          <div className="flex items-center gap-3 mt-2">
                            <div className="relative">
                              <button
                                onClick={() => setShowReactionPicker(showReactionPicker === message.id ? null : message.id)}
                                className="text-lg opacity-40 hover:opacity-100 transition-opacity"
                                title="React to message"
                              >
                                😊
                              </button>

                              {/* Reaction picker */}
                              {showReactionPicker === message.id && (
                                <div className="absolute left-0 top-8 bg-gray-800 border border-white/20 rounded-lg p-2 flex gap-2 z-10">
                                  {REACTION_EMOJIS.map((emoji) => (
                                    <button
                                      key={emoji}
                                      onClick={() => toggleReaction(message.id, emoji)}
                                      className="text-2xl hover:scale-125 transition-transform"
                                    >
                                      {emoji}
                                    </button>
                                  ))}
                                </div>
                              )}
                            </div>

                            <button
                              onClick={() => openReportModal(message.id)}
                              className="text-sm opacity-40 hover:opacity-100 hover:text-red-400 transition-all"
                              title="Report message"
                            >
                              ⚠️
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}

              {/* Typing Indicators */}
              {typingUsers.length > 0 && (
                <div className="flex items-center space-x-2 text-gray-300 text-sm italic px-4 py-2">
                  <div className="flex space-x-1">
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                  </div>
                  <span>Someone is typing...</span>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Message Input */}
            <form onSubmit={sendMessage} className="flex space-x-2 border-t border-white/10 pt-4">
              <button
                type="button"
                onClick={() => setShowGiphyPicker(true)}
                className="px-4 py-3 bg-purple-500 text-white rounded-xl hover:bg-purple-600 transition-colors flex-shrink-0"
                disabled={sending}
              >
                🎭
              </button>
              <input
                type="text"
                value={newMessage}
                onChange={(e) => {
                  setNewMessage(e.target.value)
                  if (isConnected && e.target.value.trim()) {
                    startTyping(params.conversationId)
                  }
                }}
                onBlur={() => {
                  if (isConnected) {
                    stopTyping(params.conversationId)
                  }
                }}
                onKeyPress={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault()
                    sendMessage(e as any)
                  }
                }}
                placeholder="Type your message..."
                className="flex-1 bg-white/10 text-white placeholder-gray-300 rounded-xl px-4 py-3 border border-white/20 outline-none focus:border-cyan-400"
                maxLength={1000}
                disabled={sending}
              />
              <button
                type="submit"
                disabled={!newMessage.trim() || sending}
                className={`px-6 py-3 rounded-xl font-medium transition-all ${
                  !newMessage.trim() || sending
                    ? 'bg-gray-500 text-gray-300 cursor-not-allowed'
                    : 'bg-cyan-500 text-white hover:bg-cyan-600'
                }`}
              >
                {sending ? '...' : '🐧 Send'}
              </button>
            </form>
          </div>
        </div>
      </div>

      {/* Giphy Picker Modal */}
      <GiphyPicker
        isOpen={showGiphyPicker}
        onSelect={handleGifSelect}
        onClose={() => setShowGiphyPicker(false)}
      />

      {/* Report Modal */}
      {showReportModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white/10 backdrop-blur-lg rounded-2xl border border-white/20 p-6 max-w-md w-full">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-white">Report Message</h2>
              <button
                onClick={() => {
                  setShowReportModal(false)
                  setReportReason('')
                  setReportingMessageId(null)
                }}
                className="text-gray-300 hover:text-white p-2 rounded-lg hover:bg-white/10 transition-colors"
              >
                ✕
              </button>
            </div>

            <div className="mb-6">
              <label className="block text-white mb-3 font-medium">Why are you reporting this message?</label>
              <div className="space-y-2">
                {[
                  { value: 'SPAM', label: 'Spam or misleading' },
                  { value: 'HARASSMENT', label: 'Harassment or hate speech' },
                  { value: 'VIOLENCE', label: 'Violence or dangerous content' },
                  { value: 'INAPPROPRIATE_CONTENT', label: 'Inappropriate content' },
                  { value: 'FALSE_INFORMATION', label: 'Scam or fraud' },
                  { value: 'OTHER', label: 'Other' }
                ].map((reason) => (
                  <button
                    key={reason.value}
                    onClick={() => setReportReason(reason.value)}
                    className={`w-full text-left px-4 py-3 rounded-lg transition-all ${
                      reportReason === reason.value
                        ? 'bg-red-500/20 text-red-300 border border-red-500/30'
                        : 'bg-white/5 text-gray-300 hover:bg-white/10 border border-transparent'
                    }`}
                  >
                    {reason.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowReportModal(false)
                  setReportReason('')
                  setReportingMessageId(null)
                }}
                className="flex-1 px-4 py-3 bg-white/10 text-white rounded-lg hover:bg-white/20 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={submitReport}
                disabled={!reportReason || submittingReport}
                className="flex-1 px-4 py-3 bg-red-500 text-white rounded-lg hover:bg-red-600 disabled:bg-gray-500 disabled:cursor-not-allowed transition-colors"
              >
                {submittingReport ? 'Submitting...' : 'Submit Report'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}