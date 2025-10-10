import { FastifyInstance } from 'fastify'
import { prisma } from '../lib/prisma.js'
import { withAuth } from '../middleware/auth.js'

export default async function postsRoutes(app: FastifyInstance) {

  // GET /posts - Get feed posts
  app.get('/', async (request, reply) => {
    try {
      const { cursor, limit = 20 } = request.query as any

      const posts = await prisma.post.findMany({
        take: parseInt(limit) + 1,
        cursor: cursor ? { id: cursor } : undefined,
        orderBy: { createdAt: 'desc' },
        where: {
          visibility: 'PUBLIC',
          OR: [
            { moderationStatus: 'approved' },
            { moderationStatus: null }
          ]
        },
        include: {
          author: {
            select: {
              id: true,
              username: true,
              displayName: true,
              avatar: true,
              level: true
            }
          },
          _count: {
            select: {
              likes: true,
              comments: true,
              shares: true
            }
          }
        }
      })

      const hasMore = posts.length > parseInt(limit)
      const result = hasMore ? posts.slice(0, -1) : posts
      const nextCursor = hasMore ? posts[posts.length - 1].id : null

      return reply.send({
        posts: result.map((post: any) => ({
          ...post,
          mediaUrls: JSON.parse(post.mediaUrls || '[]')
        })),
        nextCursor,
        hasMore
      })
    } catch (error: any) {
      app.log.error(error)
      return reply.status(500).send({ error: 'Failed to fetch posts' })
    }
  })

  // POST /posts - Create a new post
  app.post('/', { preHandler: withAuth }, async (request, reply) => {
    const user = (request as any).user

    try {
      const { content, mediaUrls = [], isNSFW = false } = request.body as any

      if (!content || content.trim().length === 0) {
        return reply.status(400).send({ error: 'Content is required' })
      }

      const post = await prisma.post.create({
        data: {
          authorId: user.id,
          content,
          mediaUrls: JSON.stringify(mediaUrls),
          isNSFW,
          visibility: 'PUBLIC'
        },
        include: {
          author: {
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

      // Update user's post count
      await prisma.profile.update({
        where: { userId: user.id },
        data: { postsCount: { increment: 1 } }
      })

      return reply.status(201).send({
        ...post,
        mediaUrls: JSON.parse(post.mediaUrls || '[]')
      })
    } catch (error: any) {
      app.log.error(error)
      return reply.status(500).send({ error: 'Failed to create post' })
    }
  })

  // GET /posts/:id - Get single post
  app.get('/:id', async (request, reply) => {
    const { id } = request.params as any

    try {
      const post = await prisma.post.findUnique({
        where: { id },
        include: {
          author: {
            select: {
              id: true,
              username: true,
              displayName: true,
              avatar: true,
              level: true
            }
          },
          _count: {
            select: {
              likes: true,
              comments: true,
              shares: true
            }
          }
        }
      })

      if (!post) {
        return reply.status(404).send({ error: 'Post not found' })
      }

      return reply.send({
        ...post,
        mediaUrls: JSON.parse(post.mediaUrls || '[]')
      })
    } catch (error: any) {
      app.log.error(error)
      return reply.status(500).send({ error: 'Failed to fetch post' })
    }
  })

  // POST /posts/:id/like - Like a post
  app.post('/:id/like', { preHandler: withAuth }, async (request, reply) => {
    const user = (request as any).user
    const { id } = request.params as any

    try {
      // Check if already liked
      const existingLike = await prisma.like.findUnique({
        where: {
          userId_postId: {
            userId: user.id,
            postId: id
          }
        }
      })

      if (existingLike) {
        // Unlike
        await prisma.like.delete({
          where: { id: existingLike.id }
        })
        return reply.send({ liked: false })
      } else {
        // Like
        await prisma.like.create({
          data: {
            userId: user.id,
            postId: id
          }
        })
        return reply.send({ liked: true })
      }
    } catch (error: any) {
      app.log.error(error)
      return reply.status(500).send({ error: 'Failed to toggle like' })
    }
  })

  // DELETE /posts/:id - Delete a post
  app.delete('/:id', { preHandler: withAuth }, async (request, reply) => {
    const user = (request as any).user
    const { id } = request.params as any

    try {
      const post = await prisma.post.findUnique({
        where: { id }
      })

      if (!post) {
        return reply.status(404).send({ error: 'Post not found' })
      }

      if (post.authorId !== user.id && !user.isAdmin) {
        return reply.status(403).send({ error: 'Forbidden' })
      }

      await prisma.post.delete({
        where: { id }
      })

      // Update user's post count
      await prisma.profile.update({
        where: { userId: post.authorId },
        data: { postsCount: { decrement: 1 } }
      })

      return reply.send({ success: true })
    } catch (error: any) {
      app.log.error(error)
      return reply.status(500).send({ error: 'Failed to delete post' })
    }
  })
}
