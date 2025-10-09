import { FastifyInstance } from 'fastify'
import { prisma } from '../lib/prisma.js'
import { withAuth } from '../middleware/auth.js'

export default async function usersRoutes(app: FastifyInstance) {

  // GET /users/profile - Get current user profile
  app.get('/profile', { preHandler: withAuth }, async (request, reply) => {
    const user = (request as any).user

    try {
      const profile = await prisma.user.findUnique({
        where: { id: user.id },
        include: {
          profile: true
        }
      })

      if (!profile) {
        return reply.status(404).send({ error: 'User not found' })
      }

      return reply.send(profile)
    } catch (error: any) {
      app.log.error(error)
      return reply.status(500).send({ error: 'Failed to fetch profile' })
    }
  })

  // GET /users/:id - Get user by ID
  app.get('/:id', async (request, reply) => {
    const { id } = request.params as any

    try {
      const user = await prisma.user.findUnique({
        where: { id },
        include: {
          profile: true,
          _count: {
            select: {
              posts: true,
              followers: true,
              following: true
            }
          }
        }
      })

      if (!user) {
        return reply.status(404).send({ error: 'User not found' })
      }

      return reply.send(user)
    } catch (error: any) {
      app.log.error(error)
      return reply.status(500).send({ error: 'Failed to fetch user' })
    }
  })

  // GET /users/search - Search users
  app.get('/search', async (request, reply) => {
    const { q, limit = 10 } = request.query as any

    if (!q || q.trim().length === 0) {
      return reply.status(400).send({ error: 'Query is required' })
    }

    try {
      const users = await prisma.user.findMany({
        where: {
          OR: [
            { username: { contains: q, mode: 'insensitive' } },
            { displayName: { contains: q, mode: 'insensitive' } }
          ]
        },
        take: parseInt(limit),
        select: {
          id: true,
          username: true,
          displayName: true,
          avatar: true,
          level: true,
          profile: {
            select: {
              followersCount: true
            }
          }
        }
      })

      return reply.send({ users })
    } catch (error: any) {
      app.log.error(error)
      return reply.status(500).send({ error: 'Failed to search users' })
    }
  })
}
