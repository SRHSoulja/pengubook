import { useEffect, useRef, useState, useCallback } from 'react'
import io, { Socket } from 'socket.io-client'
import { useAuth } from '@/providers/AuthProvider'

interface UseWebSocketOptions {
  autoConnect?: boolean
  conversationId?: string
}

interface TypingUser {
  userId: string
  isTyping: boolean
}

export function useWebSocket(options: UseWebSocketOptions = {}) {
  const { autoConnect = true, conversationId } = options
  const { user } = useAuth()
  const socketRef = useRef<Socket | null>(null)
  const [isConnected, setIsConnected] = useState(false)
  const [typingUsers, setTypingUsers] = useState<Map<string, boolean>>(new Map())
  const [onlineUsers, setOnlineUsers] = useState<Set<string>>(new Set())
  const typingTimeoutRef = useRef<Map<string, NodeJS.Timeout>>(new Map())

  // Initialize socket connection
  useEffect(() => {
    if (!autoConnect || !user?.walletAddress) return

    // Socket.IO runs on the same port as the main server
    const socketUrl = typeof window !== 'undefined'
      ? window.location.origin  // Use the same origin as the page
      : 'http://localhost:3001'

    const socket = io(socketUrl, {
      autoConnect: false,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000
    })

    socketRef.current = socket

    // Connection handlers
    socket.on('connect', () => {
      console.log('WebSocket connected')
      setIsConnected(true)

      // Authenticate
      socket.emit('authenticate', { walletAddress: user.walletAddress })
    })

    socket.on('disconnect', () => {
      console.log('WebSocket disconnected')
      setIsConnected(false)
    })

    socket.on('authenticated', (data: { userId: string }) => {
      console.log('WebSocket authenticated:', data.userId)

      // Join conversation if specified
      if (conversationId) {
        socket.emit('join_conversation', conversationId)
      }
    })

    socket.on('authentication_error', (error: string) => {
      console.error('WebSocket authentication error:', error)
    })

    // Message handlers
    socket.on('new_message', (data: any) => {
      // Trigger re-fetch in message components
      window.dispatchEvent(new CustomEvent('new-message', { detail: data }))
    })

    socket.on('messages_read', (data: any) => {
      window.dispatchEvent(new CustomEvent('messages-read', { detail: data }))
    })

    // Typing indicators
    socket.on('user_typing', (data: { userId: string; isTyping: boolean; conversationId: string }) => {
      if (data.conversationId === conversationId) {
        setTypingUsers(prev => {
          const newMap = new Map(prev)
          if (data.isTyping) {
            newMap.set(data.userId, true)

            // Clear existing timeout
            const existingTimeout = typingTimeoutRef.current.get(data.userId)
            if (existingTimeout) {
              clearTimeout(existingTimeout)
            }

            // Set new timeout to clear typing after 3 seconds
            const timeout = setTimeout(() => {
              setTypingUsers(prev => {
                const map = new Map(prev)
                map.delete(data.userId)
                return map
              })
              typingTimeoutRef.current.delete(data.userId)
            }, 3000)

            typingTimeoutRef.current.set(data.userId, timeout)
          } else {
            newMap.delete(data.userId)
            const timeout = typingTimeoutRef.current.get(data.userId)
            if (timeout) {
              clearTimeout(timeout)
              typingTimeoutRef.current.delete(data.userId)
            }
          }
          return newMap
        })
      }
    })

    // User status
    socket.on('user_status', (data: { userId: string; status: string }) => {
      setOnlineUsers(prev => {
        const newSet = new Set(prev)
        if (data.status === 'online') {
          newSet.add(data.userId)
        } else if (data.status === 'offline') {
          newSet.delete(data.userId)
        }
        return newSet
      })
    })

    socket.connect()

    return () => {
      // Clear all typing timeouts
      typingTimeoutRef.current.forEach(timeout => clearTimeout(timeout))
      typingTimeoutRef.current.clear()

      socket.disconnect()
      socketRef.current = null
    }
  }, [user?.walletAddress, autoConnect, conversationId])

  // Send message
  const sendMessage = useCallback((conversationId: string, content: string, messageType = 'TEXT', mediaUrls: string[] = []) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit('send_message', {
        conversationId,
        content,
        messageType,
        mediaUrls
      })
    }
  }, [])

  // Typing indicators
  const startTyping = useCallback((conversationId: string) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit('typing_start', { conversationId })
    }
  }, [])

  const stopTyping = useCallback((conversationId: string) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit('typing_stop', { conversationId })
    }
  }, [])

  // Mark messages as read
  const markAsRead = useCallback((conversationId: string, messageIds: string[]) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit('mark_read', { conversationId, messageIds })
    }
  }, [])

  // Update user status
  const updateStatus = useCallback((status: 'online' | 'away' | 'busy') => {
    if (socketRef.current?.connected) {
      socketRef.current.emit('status_update', status)
    }
  }, [])

  // Join a conversation
  const joinConversation = useCallback((conversationId: string) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit('join_conversation', conversationId)
    }
  }, [])

  return {
    socket: socketRef.current,
    isConnected,
    sendMessage,
    startTyping,
    stopTyping,
    markAsRead,
    updateStatus,
    joinConversation,
    typingUsers: Array.from(typingUsers.keys()),
    onlineUsers: Array.from(onlineUsers),
    isUserOnline: (userId: string) => onlineUsers.has(userId),
    isUserTyping: (userId: string) => typingUsers.has(userId)
  }
}