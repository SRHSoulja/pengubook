import { NextRequest, NextResponse } from 'next/server'
import { moderateImage, moderateVideo } from '@/lib/aws-moderation'
import { withAuth } from '@/lib/auth-middleware'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

// SECURITY: Daily upload quota per user
const DAILY_UPLOAD_LIMIT = 50

/**
 * POST: Track and moderate directly uploaded file
 * This endpoint is called AFTER client uploads directly to Cloudinary
 */
export const POST = withAuth(async (request: NextRequest, user: any) => {
  try {
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

    const body = await request.json()
    const { secure_url, public_id, resource_type, bytes, duration, width, height } = body

    if (!secure_url || !public_id || !resource_type) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // SECURITY: Validate video duration (30 seconds max)
    if (resource_type === 'video' && duration && duration > 30) {
      return NextResponse.json(
        {
          error: `Video too long. Maximum duration is 30 seconds (uploaded: ${Math.round(duration)}s)`,
          maxDuration: 30,
          videoDuration: Math.round(duration)
        },
        { status: 400 }
      )
    }

    // Moderate content using AWS Rekognition
    let moderationData = null
    try {
      const moderationResult = resource_type === 'video'
        ? await moderateVideo(secure_url, 60)
        : await moderateImage(secure_url, 60)

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

      console.log('[Direct Upload] AWS Moderation result:', {
        userId: user.id.slice(0, 8) + '...',
        status: moderationResult.status,
        isNSFW: moderationResult.isNSFW,
        confidence: moderationResult.confidence
      })
    } catch (moderationError) {
      console.error('[Direct Upload] AWS Moderation failed:', moderationError)
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
        publicId: public_id,
        url: secure_url,
        type: resource_type,
        size: bytes
      }
    })

    console.log('[Direct Upload] Success:', {
      userId: user.id.slice(0, 8) + '...',
      type: resource_type,
      publicId: public_id,
      size: bytes,
      quota: {
        used: uploadCount + 1,
        remaining: DAILY_UPLOAD_LIMIT - uploadCount - 1
      }
    })

    return NextResponse.json({
      success: true,
      url: secure_url,
      publicId: public_id,
      type: resource_type,
      width,
      height,
      moderation: moderationData,
      quota: {
        limit: DAILY_UPLOAD_LIMIT,
        used: uploadCount + 1,
        remaining: DAILY_UPLOAD_LIMIT - uploadCount - 1
      },
      ...(resource_type === 'video' && {
        duration,
        thumbnailUrl: secure_url.replace(/\.(mp4|mov|avi|webm)$/, '.jpg')
      })
    })

  } catch (error: any) {
    console.error('[Direct Upload] Error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to process upload' },
      { status: 500 }
    )
  }
})
