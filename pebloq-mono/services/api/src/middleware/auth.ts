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
    const authHeader = request.headers.authorization
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return reply.status(401).send({ error: 'Unauthorized: No token provided' })
    }

    const token = authHeader.substring(7)
    const decoded = jwt.verify(token, JWT_SECRET) as JWTPayload

    // Check if session is revoked
    const revoked = await prisma.revokedSession.findUnique({
      where: { sessionToken: token }
    })

    if (revoked) {
      return reply.status(401).send({ error: 'Unauthorized: Session revoked' })
    }

    // Get user
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId }
    })

    if (!user) {
      return reply.status(401).send({ error: 'Unauthorized: User not found' })
    }

    if (user.isBanned) {
      return reply.status(403).send({ error: 'Forbidden: User is banned' })
    }

    // Attach user to request
    (request as any).user = user
  } catch (error) {
    return reply.status(401).send({ error: 'Unauthorized: Invalid token' })
  }
}
