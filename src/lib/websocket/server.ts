import { Server as HTTPServer } from 'http'
import { Server as SocketIOServer, Socket } from 'socket.io'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

interface AuthenticatedSocket extends Socket {
  userId?: string
  walletAddress?: string
}

export class WebSocketServer {
  private io: SocketIOServer
  private userSockets: Map<string, Set<string>> = new Map() // userId -> Set of socketIds

  constructor(httpServer: HTTPServer) {
    // Allow both localhost development and production URLs
    const allowedOrigins = [
      'http://localhost:3001',
      'http://localhost:3000',
      'http://127.0.0.1:3001',
      'http://127.0.0.1:3000'
    ]

    if (process.env.NEXT_PUBLIC_APP_URL) {
      allowedOrigins.push(process.env.NEXT_PUBLIC_APP_URL)
    }

    this.io = new SocketIOServer(httpServer, {
      cors: {
        origin: allowedOrigins,
        credentials: true
      }
    })

    this.setupEventHandlers()
  }

  private setupEventHandlers() {
    this.io.on('connection', (socket: AuthenticatedSocket) => {
      console.log('New WebSocket connection:', socket.id)

      // Handle authentication
      socket.on('authenticate', async (data: { walletAddress: string }) => {
        console.log('WebSocket: Received authenticate event for:', data.walletAddress)
        try {
          const user = await this.authenticateUser(data.walletAddress)
          if (user) {
            socket.userId = user.id
            socket.walletAddress = data.walletAddress

            // Track user's socket
            this.addUserSocket(user.id, socket.id)

            // Join user's rooms (conversations)
            await this.joinUserRooms(socket, user.id)

            socket.emit('authenticated', { userId: user.id })
            console.log(`User ${user.id} authenticated on socket ${socket.id}`)
          } else {
            console.log('WebSocket: User not found in database for wallet:', data.walletAddress)
            socket.emit('authentication_error', 'User not found')
          }
        } catch (error) {
          console.error('Authentication error:', error)
          socket.emit('authentication_error', 'Authentication failed')
        }
      })

      // Handle joining a conversation room
      socket.on('join_conversation', async (conversationId: string) => {
        if (!socket.userId) {
          socket.emit('error', 'Not authenticated')
          return
        }

        // Verify user is participant
        const conversation = await prisma.conversation.findUnique({
          where: { id: conversationId }
        })

        if (conversation) {
          const participants = JSON.parse(conversation.participants)
          if (participants.includes(socket.userId)) {
            socket.join(`conversation:${conversationId}`)
            socket.emit('joined_conversation', conversationId)
          } else {
            socket.emit('error', 'Not authorized to join this conversation')
          }
        }
      })

      // Handle sending a message
      socket.on('send_message', async (data: {
        conversationId: string
        content: string
        messageType?: string
      }) => {
        if (!socket.userId) {
          socket.emit('error', 'Not authenticated')
          return
        }

        try {
          // Create message in database
          const message = await prisma.message.create({
            data: {
              conversationId: data.conversationId,
              senderId: socket.userId,
              content: data.content,
              messageType: data.messageType || 'TEXT'
            },
            include: {
              sender: {
                select: {
                  id: true,
                  username: true,
                  displayName: true,
                  avatar: true
                }
              }
            }
          })

          // Update conversation last message
          await prisma.conversation.update({
            where: { id: data.conversationId },
            data: {
              lastMessage: data.content,
              lastMessageAt: new Date()
            }
          })

          // Emit to all participants in the conversation
          this.io.to(`conversation:${data.conversationId}`).emit('new_message', {
            conversationId: data.conversationId,
            message
          })

          // Send push notifications to offline users (future enhancement)
          await this.notifyOfflineUsers(data.conversationId, socket.userId, data.content)
        } catch (error) {
          console.error('Error sending message:', error)
          socket.emit('error', 'Failed to send message')
        }
      })

      // Handle typing indicators
      socket.on('typing_start', (data: { conversationId: string }) => {
        if (!socket.userId) return

        socket.to(`conversation:${data.conversationId}`).emit('user_typing', {
          conversationId: data.conversationId,
          userId: socket.userId,
          isTyping: true
        })
      })

      socket.on('typing_stop', (data: { conversationId: string }) => {
        if (!socket.userId) return

        socket.to(`conversation:${data.conversationId}`).emit('user_typing', {
          conversationId: data.conversationId,
          userId: socket.userId,
          isTyping: false
        })
      })

      // Handle read receipts
      socket.on('mark_read', async (data: { conversationId: string, messageIds: string[] }) => {
        if (!socket.userId) return

        try {
          // Update messages as read
          await prisma.message.updateMany({
            where: {
              id: { in: data.messageIds },
              conversationId: data.conversationId,
              senderId: { not: socket.userId }
            },
            data: {
              isRead: true
            }
          })

          // Notify sender that their messages were read
          socket.to(`conversation:${data.conversationId}`).emit('messages_read', {
            conversationId: data.conversationId,
            messageIds: data.messageIds,
            readBy: socket.userId
          })
        } catch (error) {
          console.error('Error marking messages as read:', error)
        }
      })

      // Handle user status
      socket.on('status_update', (status: 'online' | 'away' | 'busy') => {
        if (!socket.userId) return

        // Broadcast status to all user's conversations
        this.broadcastUserStatus(socket.userId, status)
      })

      // Handle disconnect
      socket.on('disconnect', () => {
        if (socket.userId) {
          this.removeUserSocket(socket.userId, socket.id)

          // Check if user has no more active sockets
          const userSockets = this.userSockets.get(socket.userId)
          if (!userSockets || userSockets.size === 0) {
            // User is fully offline
            this.broadcastUserStatus(socket.userId, 'offline')
          }
        }
        console.log('WebSocket disconnected:', socket.id)
      })
    })
  }

  private async authenticateUser(walletAddress: string) {
    console.log('WebSocket: Authenticating wallet address:', walletAddress)

    // Try exact match first
    let user = await prisma.user.findUnique({
      where: { walletAddress: walletAddress }
    })

    // If not found, try lowercase match
    if (!user) {
      user = await prisma.user.findUnique({
        where: { walletAddress: walletAddress.toLowerCase() }
      })
    }

    console.log('WebSocket: User lookup result:', user ? `Found user ${user.id}` : 'User not found')
    return user
  }

  private async joinUserRooms(socket: AuthenticatedSocket, userId: string) {
    // Get all conversations the user is part of
    const conversations = await prisma.conversation.findMany({
      where: {
        participants: {
          contains: `"${userId}"`
        }
      }
    })

    // Join each conversation room
    conversations.forEach(conversation => {
      socket.join(`conversation:${conversation.id}`)
    })

    // Join user's personal room for direct notifications
    socket.join(`user:${userId}`)
  }

  private addUserSocket(userId: string, socketId: string) {
    if (!this.userSockets.has(userId)) {
      this.userSockets.set(userId, new Set())
    }
    this.userSockets.get(userId)!.add(socketId)
  }

  private removeUserSocket(userId: string, socketId: string) {
    const sockets = this.userSockets.get(userId)
    if (sockets) {
      sockets.delete(socketId)
      if (sockets.size === 0) {
        this.userSockets.delete(userId)
      }
    }
  }

  private async broadcastUserStatus(userId: string, status: string) {
    // Get all conversations the user is part of
    const conversations = await prisma.conversation.findMany({
      where: {
        participants: {
          contains: `"${userId}"`
        }
      }
    })

    // Broadcast to each conversation
    conversations.forEach(conversation => {
      this.io.to(`conversation:${conversation.id}`).emit('user_status', {
        userId,
        status
      })
    })
  }

  private async notifyOfflineUsers(conversationId: string, senderId: string, content: string) {
    // Get conversation participants
    const conversation = await prisma.conversation.findUnique({
      where: { id: conversationId }
    })

    if (!conversation) return

    const participantIds = JSON.parse(conversation.participants) as string[]

    // Check which participants are offline
    for (const participantId of participantIds) {
      if (participantId === senderId) continue

      const isOnline = this.userSockets.has(participantId)
      if (!isOnline) {
        // TODO: Send push notification or email
        console.log(`User ${participantId} is offline, would send notification`)
      }
    }
  }

  public sendToUser(userId: string, event: string, data: any) {
    this.io.to(`user:${userId}`).emit(event, data)
  }

  public sendToConversation(conversationId: string, event: string, data: any) {
    this.io.to(`conversation:${conversationId}`).emit(event, data)
  }

  public isUserOnline(userId: string): boolean {
    return this.userSockets.has(userId)
  }

  public getOnlineUsers(): string[] {
    return Array.from(this.userSockets.keys())
  }
}