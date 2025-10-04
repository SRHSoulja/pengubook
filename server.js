const { createServer } = require('http')
const { parse } = require('url')
const next = require('next')
const { Server } = require('socket.io')
const { PrismaClient } = require('@prisma/client')
const { encryptMessage, decryptMessage } = require('./lib/server-encryption')

const dev = process.env.NODE_ENV !== 'production'
const hostname = 'localhost'
const port = process.env.PORT || 3001

const prisma = new PrismaClient()

// Create Next.js app
const app = next({ dev, hostname, port })
const handle = app.getRequestHandler()

app.prepare().then(() => {
  const server = createServer(async (req, res) => {
    try {
      const parsedUrl = parse(req.url, true)
      await handle(req, res, parsedUrl)
    } catch (err) {
      console.error('Error occurred handling', req.url, err)
      res.statusCode = 500
      res.end('internal server error')
    }
  })

  // Initialize Socket.IO
  const io = new Server(server, {
    cors: {
      origin: [
        'http://localhost:3001',
        'http://localhost:3000',
        'http://127.0.0.1:3001',
        'http://127.0.0.1:3000',
        process.env.NEXT_PUBLIC_APP_URL
      ].filter(Boolean),
      credentials: true
    }
  })

  // Store user sockets: userId -> Set of socketIds
  const userSockets = new Map()

  io.on('connection', (socket) => {
    console.log('New WebSocket connection:', socket.id)

    // Handle authentication
    socket.on('authenticate', async (data) => {
      console.log('WebSocket: Received authenticate event for:', data.walletAddress)
      try {
        // Try exact match first
        let user = await prisma.user.findUnique({
          where: { walletAddress: data.walletAddress }
        })

        // If not found, try lowercase match
        if (!user) {
          user = await prisma.user.findUnique({
            where: { walletAddress: data.walletAddress.toLowerCase() }
          })
        }

        if (user) {
          socket.userId = user.id
          socket.walletAddress = data.walletAddress

          // Track user's socket
          if (!userSockets.has(user.id)) {
            userSockets.set(user.id, new Set())
          }
          userSockets.get(user.id).add(socket.id)

          // Get all conversations the user is part of
          const conversations = await prisma.conversation.findMany({
            where: {
              participants: {
                contains: user.id
              }
            }
          })

          // Join each conversation room
          conversations.forEach(conversation => {
            socket.join(`conversation:${conversation.id}`)
          })

          // Join user's personal room
          socket.join(`user:${user.id}`)

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
    socket.on('join_conversation', async (conversationId) => {
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
    socket.on('send_message', async (data) => {
      if (!socket.userId) {
        socket.emit('error', 'Not authenticated')
        return
      }

      try {
        // Create message in database with encrypted content
        const message = await prisma.message.create({
          data: {
            conversationId: data.conversationId,
            senderId: socket.userId,
            content: encryptMessage(data.content), // Encrypt before storing
            messageType: data.messageType || 'TEXT',
            mediaUrls: JSON.stringify(data.mediaUrls || [])
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
            lastMessage: data.content.length > 100 ? data.content.substring(0, 100) + '...' : data.content,
            lastMessageAt: new Date()
          }
        })

        // Format message for client with decrypted content
        const formattedMessage = {
          id: message.id,
          content: decryptMessage(message.content), // Decrypt for sending to client
          messageType: message.messageType,
          mediaUrls: JSON.parse(message.mediaUrls || '[]'),
          sender: message.sender,
          createdAt: message.createdAt
        }

        // Emit to all participants in the conversation
        io.to(`conversation:${data.conversationId}`).emit('new_message', {
          conversationId: data.conversationId,
          message: formattedMessage
        })
      } catch (error) {
        console.error('Error sending message:', error)
        socket.emit('error', 'Failed to send message')
      }
    })

    // Handle typing indicators
    socket.on('typing_start', (data) => {
      if (!socket.userId) return

      socket.to(`conversation:${data.conversationId}`).emit('user_typing', {
        conversationId: data.conversationId,
        userId: socket.userId,
        isTyping: true
      })
    })

    socket.on('typing_stop', (data) => {
      if (!socket.userId) return

      socket.to(`conversation:${data.conversationId}`).emit('user_typing', {
        conversationId: data.conversationId,
        userId: socket.userId,
        isTyping: false
      })
    })

    // Handle disconnect
    socket.on('disconnect', () => {
      if (socket.userId) {
        const sockets = userSockets.get(socket.userId)
        if (sockets) {
          sockets.delete(socket.id)
          if (sockets.size === 0) {
            userSockets.delete(socket.userId)
          }
        }
      }
      console.log('WebSocket disconnected:', socket.id)
    })
  })

  console.log('WebSocket server initialized')

  server.listen(port, () => {
    console.log(`> Ready on http://${hostname}:${port}`)
    console.log(`> WebSocket server ready`)
  })
})
