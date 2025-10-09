import { FastifyRequest, FastifyReply } from 'fastify'
import jwt from 'jsonwebtoken'
import { prisma } from '../lib/prisma.js'

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key'

interface JWTPayload {
  userId: string
  walletAddress?: string
  iat: number
  exp: number
}

export async function withAuth(request: FastifyRequest, reply: FastifyReply) {
  try {
    console.log('[Auth] Request:', request.method, request.url)
    console.log('[Auth] Headers:', {
      authorization: request.headers.authorization ? 'Bearer token present' : 'missing',
      'x-wallet-address': request.headers['x-wallet-address'] || 'missing',
      'content-type': request.headers['content-type']
    })

    // OPTION 1: JWT Token Authentication
    const authHeader = request.headers.authorization
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7)
      const decoded = jwt.verify(token, JWT_SECRET) as JWTPayload

      // Check if session is revoked
      const revoked = await prisma.revokedSession.findUnique({
        where: { sessionToken: token }
      })

      if (revoked) {
        console.log('[Auth] Session revoked')
        return reply.status(401).send({ error: 'Unauthorized: Session revoked' })
      }

      // Get user
      const user = await prisma.user.findUnique({
        where: { id: decoded.userId }
      })

      if (!user) {
        console.log('[Auth] User not found for JWT token')
        return reply.status(401).send({ error: 'Unauthorized: User not found' })
      }

      if (user.isBanned) {
        console.log('[Auth] User is banned')
        return reply.status(403).send({ error: 'Forbidden: User is banned' })
      }

      console.log('[Auth] JWT authentication successful for user:', user.id)
      // Attach user to request
      (request as any).user = user
      return
    }

    // OPTION 2: Wallet Address Authentication (for Vercel frontend compatibility)
    const walletAddress = request.headers['x-wallet-address'] as string
    if (walletAddress) {
      console.log('[Auth] Attempting wallet auth for address:', walletAddress)

      // Get user by wallet address
      const user = await prisma.user.findUnique({
        where: { walletAddress: walletAddress.toLowerCase() }
      })

      if (!user) {
        console.log('[Auth] No user found for wallet address:', walletAddress.toLowerCase())
        return reply.status(401).send({ error: 'Unauthorized: User not found' })
      }

      if (user.isBanned) {
        console.log('[Auth] User is banned')
        return reply.status(403).send({ error: 'Forbidden: User is banned' })
      }

      console.log('[Auth] Wallet authentication successful for user:', user.id)
      // Attach user to request
      (request as any).user = user
      return
    }

    // No authentication provided
    console.log('[Auth] No authentication provided')
    return reply.status(401).send({ error: 'Unauthorized: No token or wallet address provided' })
  } catch (error) {
    console.log('[Auth] Error:', error)
    return reply.status(401).send({ error: 'Unauthorized: Invalid credentials' })
  }
}
