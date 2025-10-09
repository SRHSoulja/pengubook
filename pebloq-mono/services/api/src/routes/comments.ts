import { FastifyInstance } from 'fastify'
import { prisma } from '../lib/prisma.js'
import { withAuth } from '../middleware/auth.js'

export default async function commentsRoutes(app: FastifyInstance) {

  // GET /comments/post/:postId - Get comments for a post
  app.get('/post/:postId', async (request, reply) => {
    const { postId } = request.params as any
    const { cursor, limit = 20 } = request.query as any

    try {
      const comments = await prisma.comment.findMany({
        where: { postId },
        take: parseInt(limit) + 1,
        cursor: cursor ? { id: cursor } : undefined,
        orderBy: { createdAt: 'desc' },
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

      const hasMore = comments.length > parseInt(limit)
      const result = hasMore ? comments.slice(0, -1) : comments
      const nextCursor = hasMore ? comments[comments.length - 1].id : null

      return reply.send({
        comments: result,
        nextCursor,
        hasMore
      })
    } catch (error: any) {
      app.log.error(error)
      return reply.status(500).send({ error: 'Failed to fetch comments' })
    }
  })

  // POST /comments - Create a comment
  app.post('/', { preHandler: withAuth }, async (request, reply) => {
    const user = (request as any).user
    const { postId, content } = request.body as any

    try {
      if (!postId || !content || content.trim().length === 0) {
        return reply.status(400).send({ error: 'Post ID and content required' })
      }

      const comment = await prisma.comment.create({
        data: {
          userId: user.id,
          postId,
          content
        },
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

      return reply.status(201).send(comment)
    } catch (error: any) {
      app.log.error(error)
      return reply.status(500).send({ error: 'Failed to create comment' })
    }
  })

  // DELETE /comments/:id - Delete a comment
  app.delete('/:id', { preHandler: withAuth }, async (request, reply) => {
    const user = (request as any).user
    const { id } = request.params as any

    try {
      const comment = await prisma.comment.findUnique({
        where: { id }
      })

      if (!comment) {
        return reply.status(404).send({ error: 'Comment not found' })
      }

      if (comment.userId !== user.id && !user.isAdmin) {
        return reply.status(403).send({ error: 'Forbidden' })
      }

      await prisma.comment.delete({
        where: { id }
      })

      return reply.send({ success: true })
    } catch (error: any) {
      app.log.error(error)
      return reply.status(500).send({ error: 'Failed to delete comment' })
    }
  })
}
