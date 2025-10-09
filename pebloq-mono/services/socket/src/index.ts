import { Server } from 'socket.io'
import { createServer } from 'http'
import jwt from 'jsonwebtoken'
import { PrismaClient } from '@prisma/client'

const PORT = parseInt(process.env.PORT || '4001')
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key'

const prisma = new PrismaClient()

const httpServer = createServer()
const io = new Server(httpServer, {
  cors: {
    origin: [
      process.env.NEXT_PUBLIC_WEB_URL || 'http://localhost:3000',
      'http://localhost:3000'
    ],
    credentials: true
  }
})

// Store user sockets
const userSockets = new Map<string, Set<string>>()

io.on('connection', (socket) => {
  console.log('🔌 New WebSocket connection:', socket.id)

  // Authenticate with JWT
  socket.on('authenticate', async (data: { token: string }) => {
    try {
      const decoded = jwt.verify(data.token, JWT_SECRET) as any
      const user = await prisma.user.findUnique({
        where: { id: decoded.userId }
      })

      if (!user) {
        socket.emit('authentication_error', 'User not found')
        return
      }

      // @ts-ignore
      socket.data.userId = user.id
      // @ts-ignore
      socket.data.user = user

      // Track socket
      if (!userSockets.has(user.id)) {
        userSockets.set(user.id, new Set())
      }
      userSockets.get(user.id)!.add(socket.id)

      // Join user's personal room
      socket.join(`user:${user.id}`)
      socket.emit('authenticated', { userId: user.id })

      console.log(`✅ User ${user.id} authenticated on socket ${socket.id}`)
    } catch (error) {
      console.error('❌ Auth error:', error)
      socket.emit('authentication_error', 'Invalid token')
    }
  })

  // Typing indicators (example)
  socket.on('typing_start', (data: { conversationId: string }) => {
    // @ts-ignore
    if (!socket.data.userId) return
    socket.to(`conversation:${data.conversationId}`).emit('user_typing', {
      conversationId: data.conversationId,
      // @ts-ignore
      userId: socket.data.userId,
      isTyping: true
    })
  })

  socket.on('typing_stop', (data: { conversationId: string }) => {
    // @ts-ignore
    if (!socket.data.userId) return
    socket.to(`conversation:${data.conversationId}`).emit('user_typing', {
      conversationId: data.conversationId,
      // @ts-ignore
      userId: socket.data.userId,
      isTyping: false
    })
  })

  // Disconnect
  socket.on('disconnect', () => {
    // @ts-ignore
    if (socket.data.userId) {
      // @ts-ignore
      const sockets = userSockets.get(socket.data.userId)
      if (sockets) {
        sockets.delete(socket.id)
        if (sockets.size === 0) {
          // @ts-ignore
          userSockets.delete(socket.data.userId)
        }
      }
    }
    console.log('👋 WebSocket disconnected:', socket.id)
  })
})

// Health check endpoint
httpServer.on('request', (req, res) => {
  if (req.url === '/health' && req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({
      status: 'ok',
      service: 'pebloq-socket',
      timestamp: new Date().toISOString()
    }))
  }
})

httpServer.listen(PORT, () => {
  console.log(`🔌 PeBloq Socket.IO server ready at http://localhost:${PORT}`)
  console.log(`📊 Health check: http://localhost:${PORT}/health`)
})
