import { FastifyInstance } from 'fastify'
import { v2 as cloudinary } from 'cloudinary'
import { prisma } from '../lib/prisma.js'
import { withAuth } from '../middleware/auth.js'
import { moderateImage, moderateVideo } from '../lib/aws-moderation.js'

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
})

const DAILY_UPLOAD_LIMIT = 50

export default async function uploadRoutes(app: FastifyInstance) {

  // POST /upload/sign - Generate signed upload URL for direct client upload
  app.post('/sign', { preHandler: withAuth }, async (request, reply) => {
    const user = (request as any).user
    const { folder = 'pebloq/posts/images' } = request.body as any

    try {
      // Check quota
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000)
      const uploadCount = await prisma.upload.count({
        where: { userId: user.id, createdAt: { gte: oneDayAgo } }
      })

      if (uploadCount >= DAILY_UPLOAD_LIMIT) {
        return reply.status(429).send({
          error: `Daily upload limit exceeded (${DAILY_UPLOAD_LIMIT}/day)`,
          quota: {
            limit: DAILY_UPLOAD_LIMIT,
            used: uploadCount,
            remaining: 0
          }
        })
      }

      // Generate signature for client-side upload
      const timestamp = Math.round(new Date().getTime() / 1000)
      const signature = cloudinary.utils.api_sign_request(
        { timestamp, folder },
        process.env.CLOUDINARY_API_SECRET!
      )

      return reply.send({
        signature,
        timestamp,
        cloudName: process.env.CLOUDINARY_CLOUD_NAME,
        apiKey: process.env.CLOUDINARY_API_KEY,
        folder
      })
    } catch (error: any) {
      app.log.error(error)
      return reply.status(500).send({ error: 'Failed to generate upload signature' })
    }
  })

  // POST /upload/register - Register direct upload for quota + moderation
  app.post('/register', { preHandler: withAuth }, async (request, reply) => {
    const user = (request as any).user
    const { secure_url, public_id, bytes, resource_type } = request.body as any

    try {
      // Track upload
      await prisma.upload.create({
        data: {
          userId: user.id,
          publicId: public_id,
          url: secure_url,
          type: resource_type === 'video' ? 'video' : 'image',
          size: bytes
        }
      })

      // Get quota info
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000)
      const uploadCount = await prisma.upload.count({
        where: { userId: user.id, createdAt: { gte: oneDayAgo } }
      })

      return reply.send({
        success: true,
        quota: {
          limit: DAILY_UPLOAD_LIMIT,
          used: uploadCount,
          remaining: DAILY_UPLOAD_LIMIT - uploadCount
        }
      })
    } catch (error: any) {
      app.log.error(error)
      return reply.status(500).send({ error: 'Failed to register upload' })
    }
  })

  // POST /upload - Server upload (for small files)
  app.post('/', { preHandler: withAuth }, async (request, reply) => {
    const user = (request as any).user

    try {
      // Check quota
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000)
      const uploadCount = await prisma.upload.count({
        where: { userId: user.id, createdAt: { gte: oneDayAgo } }
      })

      if (uploadCount >= DAILY_UPLOAD_LIMIT) {
        return reply.status(429).send({
          error: `Daily upload limit exceeded (${DAILY_UPLOAD_LIMIT}/day)`
        })
      }

      // Get uploaded file
      const data = await request.file()
      if (!data) {
        return reply.status(400).send({ error: 'No file provided' })
      }

      const buffer = await data.toBuffer()
      const fileType = data.mimetype.split('/')[0]

      if (!['image', 'video'].includes(fileType)) {
        return reply.status(400).send({ error: 'Only images and videos allowed' })
      }

      // Upload to Cloudinary
      const uploadResult = await new Promise<any>((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
          {
            resource_type: fileType === 'video' ? 'video' : 'image',
            folder: `pebloq/posts/${fileType}s`
          },
          (error, result) => {
            if (error) reject(error)
            else resolve(result)
          }
        )
        uploadStream.end(buffer)
      })

      // Moderate content using AWS Rekognition
      let moderationData = null
      try {
        const moderationResult = fileType === 'video'
          ? await moderateVideo(uploadResult.secure_url, 60)
          : await moderateImage(uploadResult.secure_url, 60)

        const contentWarnings = moderationResult.labels
          .filter(label => (label.Confidence || 0) >= 60)
          .map(label => label.Name || '')
          .filter(name => name.length > 0)

        moderationData = {
          status: moderationResult.status,
          kind: 'aws_rekognition',
          isNSFW: moderationResult.isNSFW,
          confidence: moderationResult.confidence,
          contentWarnings
        }

        console.log('[Upload] Moderation result:', moderationData)

        // Reject if flagged as NSFW with high confidence
        if (moderationResult.status === 'rejected') {
          // Delete from Cloudinary
          await cloudinary.uploader.destroy(uploadResult.public_id)
          return reply.status(400).send({
            error: 'Content violates community guidelines',
            moderation: moderationData
          })
        }
      } catch (moderationError) {
        console.error('[Upload] CRITICAL: Content moderation failed', moderationError)

        // FAIL CLOSED - Delete uploaded file and reject request
        await cloudinary.uploader.destroy(uploadResult.public_id)

        return reply.status(503).send({
          error: 'Content moderation service temporarily unavailable. Please try again later.',
          code: 'MODERATION_UNAVAILABLE'
        })
      }

      // Track upload
      await prisma.upload.create({
        data: {
          userId: user.id,
          publicId: uploadResult.public_id,
          url: uploadResult.secure_url,
          type: fileType,
          size: buffer.length
        }
      })

      return reply.send({
        success: true,
        url: uploadResult.secure_url,
        publicId: uploadResult.public_id,
        type: fileType,
        width: uploadResult.width,
        height: uploadResult.height,
        moderation: moderationData
      })
    } catch (error: any) {
      app.log.error(error)
      return reply.status(500).send({ error: 'Upload failed' })
    }
  })

  // DELETE /upload - Delete upload
  app.delete('/', { preHandler: withAuth }, async (request, reply) => {
    const user = (request as any).user
    const { publicId } = request.body as any

    try {
      // Validate publicId format
      if (!publicId || typeof publicId !== 'string') {
        return reply.status(400).send({ error: 'Invalid publicId' })
      }

      // Enforce allowed folder structure (whitelist pattern)
      const allowedPattern = /^pebloq\/posts\/(images|videos)\/[a-zA-Z0-9_-]+$/
      if (!allowedPattern.test(publicId)) {
        return reply.status(400).send({ error: 'Invalid publicId format' })
      }

      // Prevent path traversal
      if (publicId.includes('..') || publicId.includes('//')) {
        return reply.status(400).send({ error: 'Path traversal detected' })
      }

      // Verify ownership
      const upload = await prisma.upload.findFirst({
        where: { publicId }
      })

      if (!upload || (upload.userId !== user.id && !user.isAdmin)) {
        return reply.status(403).send({ error: 'Forbidden' })
      }

      // Delete from Cloudinary first (fail fast if Cloudinary fails)
      const result = await cloudinary.uploader.destroy(publicId)
      if (result.result !== 'ok' && result.result !== 'not found') {
        throw new Error('Cloudinary deletion failed')
      }

      // Delete from DB
      await prisma.upload.delete({
        where: { id: upload.id }
      })

      return reply.send({ success: true })
    } catch (error: any) {
      app.log.error(error)
      return reply.status(500).send({ error: 'Delete failed' })
    }
  })
}
