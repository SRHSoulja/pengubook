import { NextRequest, NextResponse } from 'next/server'
import { v2 as cloudinary } from 'cloudinary'
import { moderateImage, moderateVideo } from '@/lib/aws-moderation'
import { withAuth, withRateLimit } from '@/lib/auth-middleware'
import { prisma } from '@/lib/prisma'

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
})

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

// SECURITY: Daily upload quota per user
const DAILY_UPLOAD_LIMIT = 50

// POST: Upload file with authentication and quota enforcement
export const POST = withRateLimit(20, 3600000)( // 20 uploads per hour
  withAuth(async (request: NextRequest, user: any) => {
    try {
      // Check if Cloudinary is configured
      if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
        console.error('[Upload] Cloudinary not configured')
        return NextResponse.json(
          { error: 'Upload service not configured' },
          { status: 500 }
        )
      }

      // SECURITY: Check daily upload quota
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000)
      const uploadCount = await prisma.upload.count({
        where: {
          userId: user.id,
          createdAt: { gte: oneDayAgo }
        }
      })

      if (uploadCount >= DAILY_UPLOAD_LIMIT) {
        return NextResponse.json(
          {
            error: `Daily upload limit exceeded (${DAILY_UPLOAD_LIMIT} uploads per day)`,
            quota: {
              limit: DAILY_UPLOAD_LIMIT,
              used: uploadCount,
              remaining: 0,
              resetTime: new Date(Date.now() + (24 * 60 * 60 * 1000)).toISOString()
            }
          },
          { status: 429 }
        )
      }

      const formData = await request.formData()
      const file = formData.get('file') as File
      const type = formData.get('type') as string || 'post-media'

      if (!file) {
        return NextResponse.json(
          { error: 'No file provided' },
          { status: 400 }
        )
      }

      // Validate file type
      const fileType = file.type.split('/')[0]
      if (!['image', 'video'].includes(fileType)) {
        return NextResponse.json(
          { error: 'Only images and videos are allowed' },
          { status: 400 }
        )
      }

      // Validate file size (server-side enforcement)
      const MAX_IMAGE_SIZE = 10 * 1024 * 1024 // 10MB for images
      const MAX_VIDEO_SIZE = 50 * 1024 * 1024 // 50MB for videos
      const maxSize = fileType === 'video' ? MAX_VIDEO_SIZE : MAX_IMAGE_SIZE

      if (file.size > maxSize) {
        return NextResponse.json(
          { error: `File too large. Max size: ${fileType === 'video' ? '50MB' : '10MB'}` },
          { status: 400 }
        )
      }

      // Convert File to buffer
      const bytes = await file.arrayBuffer()
      const buffer = Buffer.from(bytes)

      // Determine folder structure based on type and file type
      const getFolderPath = () => {
        if (type === 'profile-banner') {
          return 'pebloq/banners/profile'
        } else if (type === 'post-media') {
          return fileType === 'video'
            ? 'pebloq/posts/videos'
            : 'pebloq/posts/images'
        } else if (type.includes('avatar')) {
          return 'pebloq/avatars'
        } else {
          return `pebloq/${fileType}s/${type}`
        }
      }

      // Upload to Cloudinary
      const uploadResult = await new Promise<any>((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
          {
            resource_type: fileType === 'video' ? 'video' : 'image',
            folder: getFolderPath()
          },
          (error, result) => {
            if (error) reject(error)
            else resolve(result)
          }
        )
        uploadStream.end(buffer)
      })

      // SECURITY: Validate video duration (30 seconds max - Vine length)
      if (fileType === 'video') {
        const videoDuration = uploadResult.duration // in seconds
        if (videoDuration && videoDuration > 30) {
          // Delete the uploaded video from Cloudinary
          try {
            await cloudinary.uploader.destroy(uploadResult.public_id, { resource_type: 'video' })
          } catch (deleteError) {
            console.error('[Upload] Failed to delete long video:', deleteError)
          }

          return NextResponse.json(
            {
              error: `Video too long. Maximum duration is 30 seconds (uploaded: ${Math.round(videoDuration)}s)`,
              maxDuration: 30,
              videoDuration: Math.round(videoDuration)
            },
            { status: 400 }
          )
        }
      }

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
          labels: moderationResult.labels,
          contentWarnings,
          response: moderationResult.rawResponse
        }

        console.log('[Upload] AWS Moderation result:', {
          userId: user.id.slice(0, 8) + '...',
          status: moderationResult.status,
          isNSFW: moderationResult.isNSFW,
          confidence: moderationResult.confidence
        })
      } catch (moderationError) {
        console.error('[Upload] AWS Moderation failed:', moderationError)
        moderationData = {
          status: 'pending',
          kind: 'aws_rekognition',
          isNSFW: false,
          confidence: 0,
          labels: [],
          contentWarnings: [],
          response: { error: 'Moderation failed' }
        }
      }

      // SECURITY: Track upload in database for quota enforcement
      await prisma.upload.create({
        data: {
          userId: user.id,
          publicId: uploadResult.public_id,
          url: uploadResult.secure_url,
          type: fileType,
          size: file.size
        }
      })

      console.log('[Upload] Success:', {
        userId: user.id.slice(0, 8) + '...',
        type: fileType,
        publicId: uploadResult.public_id,
        size: file.size,
        quota: {
          used: uploadCount + 1,
          remaining: DAILY_UPLOAD_LIMIT - uploadCount - 1
        }
      })

      return NextResponse.json({
        success: true,
        url: uploadResult.secure_url,
        publicId: uploadResult.public_id,
        type: fileType,
        width: uploadResult.width,
        height: uploadResult.height,
        format: uploadResult.format,
        moderation: moderationData,
        quota: {
          limit: DAILY_UPLOAD_LIMIT,
          used: uploadCount + 1,
          remaining: DAILY_UPLOAD_LIMIT - uploadCount - 1
        },
        ...(fileType === 'video' && {
          duration: uploadResult.duration,
          thumbnailUrl: uploadResult.secure_url.replace(/\.(mp4|mov|avi)$/, '.jpg')
        })
      })

    } catch (error: any) {
      console.error('[Upload] Error:', error)
      return NextResponse.json(
        { error: error.message || 'Upload failed' },
        { status: 500 }
      )
    }
  })
)

// DELETE: Remove uploaded file with ownership validation
export const DELETE = withAuth(async (request: NextRequest, user: any) => {
  try {
    const { publicId } = await request.json()

    if (!publicId) {
      return NextResponse.json(
        { error: 'Public ID required' },
        { status: 400 }
      )
    }

    // SECURITY: Verify ownership (user owns this upload or is admin)
    const upload = await prisma.upload.findFirst({
      where: { publicId }
    })

    if (!upload) {
      return NextResponse.json(
        { error: 'Upload not found' },
        { status: 404 }
      )
    }

    if (upload.userId !== user.id && !user.isAdmin) {
      return NextResponse.json(
        { error: 'Forbidden: You can only delete your own uploads' },
        { status: 403 }
      )
    }

    // Delete from Cloudinary
    await cloudinary.uploader.destroy(publicId)

    // Delete from database
    await prisma.upload.delete({
      where: { id: upload.id }
    })

    console.log('[Upload] Deleted:', {
      userId: user.id.slice(0, 8) + '...',
      publicId,
      isAdmin: user.isAdmin
    })

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('[Upload] Delete error:', error)
    return NextResponse.json(
      { error: error.message || 'Delete failed' },
      { status: 500 }
    )
  }
})
