import { FastifyInstance } from 'fastify'
import { prisma } from '../lib/prisma.js'
import jwt from 'jsonwebtoken'
import crypto from 'crypto'
import { SiweMessage } from 'siwe'

// CRITICAL: JWT_SECRET must be set in production
const JWT_SECRET = process.env.JWT_SECRET
if (!JWT_SECRET || JWT_SECRET.length < 32) {
  console.error('FATAL: JWT_SECRET environment variable must be set and at least 32 characters long')
  console.error('Generate one with: openssl rand -base64 64')
  process.exit(1)
}

export default async function authRoutes(app: FastifyInstance) {

  // POST /auth/nonce - Generate nonce for wallet signature
  app.post('/nonce', async (request, reply) => {
    try {
      const { walletAddress } = request.body as any

      if (!walletAddress) {
        return reply.status(400).send({ error: 'Wallet address required' })
      }

      // Generate cryptographically secure nonce
      const nonce = crypto.randomBytes(32).toString('hex')

      // Get client IP and user agent
      const ipAddress = request.headers['x-forwarded-for'] || request.ip || 'unknown'
      const userAgent = request.headers['user-agent'] || 'unknown'

      // Store nonce in database
      const expiresAt = new Date(Date.now() + 15 * 60 * 1000) // 15 minutes
      await prisma.authNonce.create({
        data: {
          nonce,
          walletAddress: walletAddress.toLowerCase(),
          ipAddress: String(ipAddress),
          userAgent,
          expiresAt
        }
      })

      return reply.send({ nonce })
    } catch (error: any) {
      app.log.error(error)
      return reply.status(500).send({ error: 'Failed to generate nonce' })
    }
  })

  // POST /auth/wallet-login - Verify signature and create session
  app.post('/wallet-login', async (request, reply) => {
    try {
      const { walletAddress, signature, message } = request.body as any

      if (!walletAddress || !signature || !message) {
        return reply.status(400).send({ error: 'Missing required fields' })
      }

      // Verify the SIWE message
      const siweMessage = new SiweMessage(message)
      const verification = await siweMessage.verify({ signature })

      if (!verification.success) {
        return reply.status(401).send({ error: 'Invalid signature' })
      }

      // Check nonce exists and is valid
      const nonceRecord = await prisma.authNonce.findFirst({
        where: {
          nonce: siweMessage.nonce,
          walletAddress: walletAddress.toLowerCase(),
          used: false,
          expiresAt: { gt: new Date() }
        }
      })

      if (!nonceRecord) {
        return reply.status(401).send({ error: 'Invalid or expired nonce' })
      }

      // Mark nonce as used
      await prisma.authNonce.update({
        where: { id: nonceRecord.id },
        data: { used: true, usedAt: new Date() }
      })

      // Find or create user
      let user = await prisma.user.findUnique({
        where: { walletAddress: walletAddress.toLowerCase() }
      })

      if (!user) {
        // Create new user
        user = await prisma.user.create({
          data: {
            walletAddress: walletAddress.toLowerCase(),
            username: `user_${walletAddress.slice(2, 10)}`,
            displayName: `Pengu ${walletAddress.slice(2, 6)}`,
            profile: {
              create: {}
            }
          },
          include: {
            profile: true
          }
        })
      }

      // Generate JWT
      const token = jwt.sign(
        {
          userId: user.id,
          walletAddress: user.walletAddress
        },
        JWT_SECRET,
        { expiresIn: '7d' }
      )

      return reply.send({
        token,
        user: {
          id: user.id,
          walletAddress: user.walletAddress,
          username: user.username,
          displayName: user.displayName,
          avatar: user.avatar,
          isAdmin: user.isAdmin,
          level: user.level,
          xp: user.xp
        }
      })
    } catch (error: any) {
      app.log.error(error)
      return reply.status(500).send({ error: 'Login failed' })
    }
  })

  // POST /auth/verify-session - Verify JWT token
  app.post('/verify-session', async (request, reply) => {
    try {
      const authHeader = request.headers.authorization
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return reply.status(401).send({ error: 'No token provided' })
      }

      const token = authHeader.substring(7)
      const decoded = jwt.verify(token, JWT_SECRET) as any

      // Check if session is revoked
      const revoked = await prisma.revokedSession.findUnique({
        where: { sessionToken: token }
      })

      if (revoked) {
        return reply.status(401).send({ error: 'Session revoked' })
      }

      // Get user
      const user = await prisma.user.findUnique({
        where: { id: decoded.userId },
        include: {
          profile: true
        }
      })

      if (!user) {
        return reply.status(401).send({ error: 'User not found' })
      }

      return reply.send({ valid: true, user })
    } catch (error: any) {
      return reply.status(401).send({ error: 'Invalid token' })
    }
  })

  // POST /auth/logout - Revoke session
  app.post('/logout', async (request, reply) => {
    try {
      const authHeader = request.headers.authorization
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return reply.status(401).send({ error: 'No token provided' })
      }

      const token = authHeader.substring(7)
      const decoded = jwt.verify(token, JWT_SECRET) as any

      // Add token to revoked sessions
      const expiresAt = new Date(decoded.exp * 1000)
      await prisma.revokedSession.create({
        data: {
          sessionToken: token,
          userId: decoded.userId,
          reason: 'logout',
          expiresAt
        }
      })

      return reply.send({ success: true })
    } catch (error: any) {
      app.log.error(error)
      return reply.status(500).send({ error: 'Logout failed' })
    }
  })

  // POST /auth/link-social - Link Discord/Twitter to wallet user
  app.post('/link-social', async (request, reply) => {
    try {
      const authHeader = request.headers.authorization
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return reply.status(401).send({ error: 'No token provided' })
      }

      const token = authHeader.substring(7)
      const decoded = jwt.verify(token, JWT_SECRET) as any

      const {
        provider,
        accountId,
        name,
        avatar,
        handle
      } = request.body as any

      if (!provider || !accountId) {
        return reply.status(400).send({ error: 'Provider and account ID required' })
      }

      // Update user with social account info
      const updateData: any = {}

      if (provider === 'discord') {
        updateData.discordId = accountId
        updateData.discordName = name
        updateData.discordAvatar = avatar
      } else if (provider === 'twitter') {
        updateData.twitterId = accountId
        updateData.twitterHandle = handle
        // Upgrade Twitter avatar quality
        updateData.twitterAvatar = avatar?.replace('_normal.', '_400x400.')
      }

      const user = await prisma.user.update({
        where: { id: decoded.userId },
        data: updateData,
        include: {
          profile: true
        }
      })

      return reply.send({ success: true, user })
    } catch (error: any) {
      app.log.error(error)
      return reply.status(500).send({ error: 'Failed to link social account' })
    }
  })

  // POST /auth/unlink-social - Unlink social account
  app.post('/unlink-social', async (request, reply) => {
    try {
      const authHeader = request.headers.authorization
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return reply.status(401).send({ error: 'No token provided' })
      }

      const token = authHeader.substring(7)
      const decoded = jwt.verify(token, JWT_SECRET) as any

      const { provider } = request.body as any

      if (!provider) {
        return reply.status(400).send({ error: 'Provider required' })
      }

      const updateData: any = {}

      if (provider === 'discord') {
        updateData.discordId = null
        updateData.discordName = null
        updateData.discordAvatar = null
      } else if (provider === 'twitter') {
        updateData.twitterId = null
        updateData.twitterHandle = null
        updateData.twitterAvatar = null
      }

      const user = await prisma.user.update({
        where: { id: decoded.userId },
        data: updateData
      })

      return reply.send({ success: true, user })
    } catch (error: any) {
      app.log.error(error)
      return reply.status(500).send({ error: 'Failed to unlink social account' })
    }
  })
}
