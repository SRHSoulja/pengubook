import { RekognitionClient, DetectModerationLabelsCommand } from '@aws-sdk/client-rekognition'

// Initialize AWS Rekognition client
const rekognitionClient = new RekognitionClient({
  region: process.env.AWS_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
  },
})

export interface ModerationLabel {
  Name?: string
  Confidence?: number
  ParentName?: string
}

export interface ModerationResult {
  status: 'approved' | 'rejected' | 'pending' | 'flagged'
  isNSFW: boolean
  labels: ModerationLabel[]
  confidence: number
  rawResponse: any
}

/**
 * Moderate an image using AWS Rekognition
 * @param imageUrl - URL of the image to moderate
 * @param minConfidence - Minimum confidence threshold (0-100)
 * @returns Moderation result
 */
export async function moderateImage(
  imageUrl: string,
  minConfidence: number = 60
): Promise<ModerationResult> {
  try {
    // AWS Rekognition only supports JPEG and PNG via Bytes parameter
    // For GIF/WebP/other formats, send the URL directly if it's a Cloudinary URL
    const isCloudinaryUrl = imageUrl.includes('cloudinary.com')
    const isUnsupportedFormat = imageUrl.match(/\.(gif|webp|bmp|tiff)$/i)

    let result

    if (isCloudinaryUrl && isUnsupportedFormat) {
      // Use Cloudinary's URL transformation to convert to JPEG
      // Replace upload/ with upload/f_jpg,q_auto/
      const jpegUrl = imageUrl.replace('/upload/', '/upload/f_jpg,q_auto/')

      const response = await fetch(jpegUrl)
      const imageBuffer = await response.arrayBuffer()

      const command = new DetectModerationLabelsCommand({
        Image: {
          Bytes: new Uint8Array(imageBuffer),
        },
        MinConfidence: minConfidence,
      })

      result = await rekognitionClient.send(command)
    } else {
      // Standard processing for JPEG/PNG
      const response = await fetch(imageUrl)
      const imageBuffer = await response.arrayBuffer()

      // Call AWS Rekognition
      const command = new DetectModerationLabelsCommand({
        Image: {
          Bytes: new Uint8Array(imageBuffer),
        },
        MinConfidence: minConfidence,
      })

      result = await rekognitionClient.send(command)
    }

    // Process result from both paths
    return processRekognitionResult(result, minConfidence)
  } catch (error) {
    console.error('[AWS Moderation] Error moderating image:', error)

    // Return pending status on error to be safe
    return {
      status: 'pending',
      isNSFW: false,
      labels: [],
      confidence: 0,
      rawResponse: { error: error instanceof Error ? error.message : 'Unknown error' },
    }
  }
}

// Helper function to process Rekognition result
function processRekognitionResult(result: any, minConfidence: number): ModerationResult {
  // Analyze moderation labels
  const labels = result.ModerationLabels || []
  const highConfidenceLabels = labels.filter(
    (label) => (label.Confidence || 0) >= minConfidence
  )

  // Determine if content is NSFW
  const hasNSFWContent = highConfidenceLabels.some((label) => {
    const name = label.Name?.toLowerCase() || ''
    return (
      name.includes('explicit') ||
      name.includes('nudity') ||
      name.includes('sexual') ||
      name.includes('graphic') ||
      name.includes('violence') ||
      name.includes('gore')
    )
  })

  // Calculate average confidence
  const avgConfidence =
    highConfidenceLabels.length > 0
      ? highConfidenceLabels.reduce((sum, label) => sum + (label.Confidence || 0), 0) /
        highConfidenceLabels.length
      : 0

  // Determine status
  let status: 'approved' | 'rejected' | 'pending' | 'flagged'
  if (hasNSFWContent && avgConfidence >= 90) {
    status = 'rejected' // Very high confidence NSFW
  } else if (hasNSFWContent && avgConfidence >= minConfidence) {
    status = 'flagged' // Moderate confidence NSFW - user can review
  } else if (highConfidenceLabels.length > 0) {
    status = 'pending' // Some labels detected but not NSFW
  } else {
    status = 'approved' // Clean content
  }

  return {
    status,
    isNSFW: hasNSFWContent,
    labels: highConfidenceLabels,
    confidence: avgConfidence,
    rawResponse: result,
  }
}

/**
 * Moderate a video using AWS Rekognition
 *
 * CURRENT: Analyzes video thumbnail only (simple, fast)
 * UPGRADE PATH: To enable full video analysis (all frames):
 *   1. Add AWS_S3_BUCKET to .env
 *   2. Upload video to S3 before moderation
 *   3. Use StartContentModeration + GetContentModeration APIs
 *   4. Implement async job polling
 *
 * This architecture allows easy upgrade without breaking existing code.
 */
export async function moderateVideo(
  videoUrlOrThumbnail: string,
  minConfidence: number = 60
): Promise<ModerationResult> {
  // Check if full video moderation is enabled
  const useFullVideoModeration = process.env.AWS_ENABLE_FULL_VIDEO_MODERATION === 'true'

  if (useFullVideoModeration) {
    // TODO: Implement full video moderation when needed
    // return await moderateVideoFrames(videoUrlOrThumbnail, minConfidence)
    console.log('[Video Moderation] Full video analysis not yet implemented, falling back to thumbnail')
  }

  // Current: Moderate thumbnail as proxy
  return moderateImage(videoUrlOrThumbnail, minConfidence)
}

/**
 * FUTURE: Full video frame-by-frame moderation
 * Uncomment and implement when scaling requires it
 */
// async function moderateVideoFrames(
//   s3VideoKey: string,
//   minConfidence: number
// ): Promise<ModerationResult> {
//   const s3Bucket = process.env.AWS_S3_BUCKET || ''
//
//   // Start async moderation job
//   const startCommand = new StartContentModerationCommand({
//     Video: { S3Object: { Bucket: s3Bucket, Name: s3VideoKey } },
//     MinConfidence: minConfidence,
//   })
//   const startResult = await rekognitionClient.send(startCommand)
//
//   // Poll for results (implement proper polling with timeout)
//   // ... implementation here ...
//
//   return {
//     status: 'pending',
//     isNSFW: false,
//     labels: [],
//     confidence: 0,
//     rawResponse: startResult
//   }
// }
