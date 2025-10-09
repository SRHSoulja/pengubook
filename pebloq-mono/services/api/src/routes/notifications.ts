import { FastifyInstance } from 'fastify'
import { prisma } from '../lib/prisma.js'
import { withAuth } from '../middleware/auth.js'

export default async function notificationsRoutes(app: FastifyInstance) {

  // GET /notifications - Get user notifications
  app.get('/', { preHandler: withAuth }, async (request, reply) => {
    const user = (request as any).user
    const { cursor, limit = 20 } = request.query as any

    try {
      const notifications = await prisma.notification.findMany({
        where: { toUserId: user.id },
        take: parseInt(limit) + 1,
        cursor: cursor ? { id: cursor } : undefined,
        orderBy: { createdAt: 'desc' },
        include: {
          fromUser: {
            select: {
              id: true,
              username: true,
              displayName: true,
              avatar: true
            }
          }
        }
      })

      const hasMore = notifications.length > parseInt(limit)
      const result = hasMore ? notifications.slice(0, -1) : notifications
      const nextCursor = hasMore ? notifications[notifications.length - 1].id : null

      return reply.send({
        notifications: result,
        nextCursor,
        hasMore
      })
    } catch (error: any) {
      app.log.error(error)
      return reply.status(500).send({ error: 'Failed to fetch notifications' })
    }
  })

  // POST /notifications/:id/read - Mark notification as read
  app.post('/:id/read', { preHandler: withAuth }, async (request, reply) => {
    const user = (request as any).user
    const { id } = request.params as any

    try {
      const notification = await prisma.notification.findUnique({
        where: { id }
      })

      if (!notification || notification.toUserId !== user.id) {
        return reply.status(404).send({ error: 'Notification not found' })
      }

      await prisma.notification.update({
        where: { id },
        data: { isRead: true }
      })

      return reply.send({ success: true })
    } catch (error: any) {
      app.log.error(error)
      return reply.status(500).send({ error: 'Failed to mark notification as read' })
    }
  })

  // POST /notifications/read-all - Mark all notifications as read
  app.post('/read-all', { preHandler: withAuth }, async (request, reply) => {
    const user = (request as any).user

    try {
      await prisma.notification.updateMany({
        where: {
          toUserId: user.id,
          isRead: false
        },
        data: { isRead: true }
      })

      return reply.send({ success: true })
    } catch (error: any) {
      app.log.error(error)
      return reply.status(500).send({ error: 'Failed to mark all as read' })
    }
  })
}
