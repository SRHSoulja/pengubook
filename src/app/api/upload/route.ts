import { NextRequest, NextResponse } from 'next/server'
import { v2 as cloudinary } from 'cloudinary'
import { moderateImage, moderateVideo } from '@/lib/aws-moderation'

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
})

export const dynamic = 'force-dynamic'

// Increase body size limit for file uploads
export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
  try {
    // Check if Cloudinary is configured
    if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
      console.error('[Upload] Cloudinary not configured')
      return NextResponse.json(
        { error: 'Upload service not configured' },
        { status: 500 }
      )
    }

    console.log('[Upload] Cloudinary config:', {
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET?.substring(0, 5) + '...'
    })

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

    // Validate file size
    const MAX_IMAGE_SIZE = 10 * 1024 * 1024 // 10MB for images
    const MAX_VIDEO_SIZE = 50 * 1024 * 1024 // 50MB for videos (Vine-length)
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
        return 'pengubook/banners/profile'
      } else if (type === 'post-media') {
        return fileType === 'video'
          ? 'pengubook/posts/videos'
          : 'pengubook/posts/images'
      } else if (type.includes('avatar')) {
        return 'pengubook/avatars'
      } else {
        // Default fallback
        return `pengubook/${fileType}s/${type}`
      }
    }

    // Upload to Cloudinary (storage only, no built-in moderation)
    const uploadResult = await new Promise<any>((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          resource_type: fileType === 'video' ? 'video' : 'image',
          folder: getFolderPath(),
          // For videos: limit duration
          ...(fileType === 'video' && {
            duration: 30, // Max 30 seconds (Vine length)
          })
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

      // Extract content warning tags from labels
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
        contentWarnings, // Add extracted warning tags
        response: moderationResult.rawResponse
      }

      console.log('[Upload] AWS Moderation result:', {
        status: moderationResult.status,
        isNSFW: moderationResult.isNSFW,
        confidence: moderationResult.confidence,
        labelsCount: moderationResult.labels.length,
        contentWarnings: contentWarnings
      })
    } catch (moderationError) {
      console.error('[Upload] AWS Moderation failed:', moderationError)
      // Continue with upload even if moderation fails
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

    console.log('[Upload] Success:', {
      type: fileType,
      publicId: uploadResult.public_id,
      url: uploadResult.secure_url,
      size: file.size,
      originalName: file.name,
      moderation: moderationData?.status || 'pending'
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
}

// Optional: Add DELETE endpoint to remove uploaded files
export async function DELETE(request: NextRequest) {
  try {
    const { publicId } = await request.json()

    if (!publicId) {
      return NextResponse.json(
        { error: 'Public ID required' },
        { status: 400 }
      )
    }

    await cloudinary.uploader.destroy(publicId)

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('[Upload] Delete error:', error)
    return NextResponse.json(
      { error: error.message || 'Delete failed' },
      { status: 500 }
    )
  }
}
