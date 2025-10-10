import { FastifyInstance } from 'fastify'
import { prisma } from '../lib/prisma.js'
import { withAuth } from '../middleware/auth.js'

export default async function communitiesRoutes(app: FastifyInstance) {

  // GET /communities - List communities
  app.get('/', async (request, reply) => {
    const { cursor, limit = 20, category } = request.query as any

    try {
      const where: any = {}
      if (category) {
        where.category = category
      }

      const communities = await prisma.community.findMany({
        where,
        take: parseInt(limit) + 1,
        cursor: cursor ? { id: cursor } : undefined,
        orderBy: { membersCount: 'desc' }
      })

      const hasMore = communities.length > parseInt(limit)
      const result = hasMore ? communities.slice(0, -1) : communities
      const nextCursor = hasMore ? communities[communities.length - 1].id : null

      return reply.send({
        communities: result,
        nextCursor,
        hasMore
      })
    } catch (error: any) {
      app.log.error(error)
      return reply.status(500).send({ error: 'Failed to fetch communities' })
    }
  })

  // POST /communities - Create community
  app.post('/', { preHandler: withAuth }, async (request, reply) => {
    const user = (request as any).user
    const {
      name,
      displayName,
      description,
      category,
      visibility = 'PUBLIC'
    } = request.body as any

    try {
      if (!name || !displayName || !description || !category) {
        return reply.status(400).send({ error: 'Missing required fields' })
      }

      const community = await prisma.community.create({
        data: {
          name,
          displayName,
          description,
          category,
          visibility,
          creatorId: user.id,
          members: {
            create: {
              userId: user.id,
              role: 'CREATOR'
            }
          }
        }
      })

      return reply.status(201).send(community)
    } catch (error: any) {
      app.log.error(error)
      return reply.status(500).send({ error: 'Failed to create community' })
    }
  })

  // GET /communities/:id - Get community details
  app.get('/:id', async (request, reply) => {
    const { id } = request.params as any

    try {
      const community = await prisma.community.findUnique({
        where: { id },
        include: {
          _count: {
            select: {
              members: true
            }
          }
        }
      })

      if (!community) {
        return reply.status(404).send({ error: 'Community not found' })
      }

      return reply.send(community)
    } catch (error: any) {
      app.log.error(error)
      return reply.status(500).send({ error: 'Failed to fetch community' })
    }
  })

  // POST /communities/:id/join - Join/leave community
  app.post('/:id/join', { preHandler: withAuth }, async (request, reply) => {
    const user = (request as any).user
    const { id } = request.params as any

    try {
      // Check if already a member
      const existing = await prisma.communityMember.findUnique({
        where: {
          userId_communityId: {
            userId: user.id,
            communityId: id
          }
        }
      })

      if (existing) {
        // Leave community
        await prisma.communityMember.delete({
          where: { id: existing.id }
        })

        await prisma.community.update({
          where: { id },
          data: { membersCount: { decrement: 1 } }
        })

        return reply.send({ joined: false })
      } else {
        // Join community
        await prisma.communityMember.create({
          data: {
            userId: user.id,
            communityId: id,
            role: 'MEMBER'
          }
        })

        await prisma.community.update({
          where: { id },
          data: { membersCount: { increment: 1 } }
        })

        return reply.send({ joined: true })
      }
    } catch (error: any) {
      app.log.error(error)
      return reply.status(500).send({ error: 'Failed to join/leave community' })
    }
  })

  // GET /communities/:id/members - Get community members
  app.get('/:id/members', async (request, reply) => {
    const { id } = request.params as any
    const { cursor, limit = 20 } = request.query as any

    try {
      const members = await prisma.communityMember.findMany({
        where: { communityId: id },
        take: parseInt(limit) + 1,
        cursor: cursor ? { id: cursor } : undefined,
        orderBy: { joinedAt: 'desc' },
        include: {
          user: {
            select: {
              id: true,
              username: true,
              displayName: true,
              avatar: true,
              level: true
            }
          }
        }
      })

      const hasMore = members.length > parseInt(limit)
      const result = hasMore ? members.slice(0, -1) : members
      const nextCursor = hasMore ? members[members.length - 1].id : null

      return reply.send({
        members: result,
        nextCursor,
        hasMore
      })
    } catch (error: any) {
      app.log.error(error)
      return reply.status(500).send({ error: 'Failed to fetch members' })
    }
  })
}
