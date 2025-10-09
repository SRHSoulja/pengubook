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
 */
export async function moderateImage(
  imageUrl: string,
  minConfidence: number = 60
): Promise<ModerationResult> {
  try {
    const isCloudinaryUrl = imageUrl.includes('cloudinary.com')
    const isUnsupportedFormat = imageUrl.match(/\.(gif|webp|bmp|tiff)$/i)

    let result

    if (isCloudinaryUrl && isUnsupportedFormat) {
      // Convert to JPEG via Cloudinary transformation
      const jpegUrl = imageUrl.replace('/upload/', '/upload/f_jpg,q_auto/')
      const response = await fetch(jpegUrl)
      const imageBuffer = await response.arrayBuffer()

      const command = new DetectModerationLabelsCommand({
        Image: { Bytes: new Uint8Array(imageBuffer) },
        MinConfidence: minConfidence,
      })

      result = await rekognitionClient.send(command)
    } else {
      const response = await fetch(imageUrl)
      const imageBuffer = await response.arrayBuffer()

      const command = new DetectModerationLabelsCommand({
        Image: { Bytes: new Uint8Array(imageBuffer) },
        MinConfidence: minConfidence,
      })

      result = await rekognitionClient.send(command)
    }

    return processRekognitionResult(result, minConfidence)
  } catch (error) {
    console.error('[AWS Moderation] Error moderating image:', error)
    return {
      status: 'pending',
      isNSFW: false,
      labels: [],
      confidence: 0,
      rawResponse: { error: error instanceof Error ? error.message : 'Unknown error' },
    }
  }
}

/**
 * Moderate a video using AWS Rekognition
 */
export async function moderateVideo(
  videoUrl: string,
  minConfidence: number = 60
): Promise<ModerationResult> {
  try {
    // For videos, download and analyze first frame
    const response = await fetch(videoUrl)
    const videoBuffer = await response.arrayBuffer()

    const command = new DetectModerationLabelsCommand({
      Image: { Bytes: new Uint8Array(videoBuffer) },
      MinConfidence: minConfidence,
    })

    const result = await rekognitionClient.send(command)
    return processRekognitionResult(result, minConfidence)
  } catch (error) {
    console.error('[AWS Moderation] Error moderating video:', error)
    return {
      status: 'pending',
      isNSFW: false,
      labels: [],
      confidence: 0,
      rawResponse: { error: error instanceof Error ? error.message : 'Unknown error' },
    }
  }
}

function processRekognitionResult(result: any, minConfidence: number): ModerationResult {
  const labels = result.ModerationLabels || []
  const highConfidenceLabels = labels.filter(
    (label: ModerationLabel) => (label.Confidence || 0) >= minConfidence
  )

  // Check for NSFW content
  const nsfwCategories = ['Explicit Nudity', 'Suggestive', 'Violence', 'Visually Disturbing']
  const isNSFW = highConfidenceLabels.some((label: ModerationLabel) =>
    nsfwCategories.some(category => label.Name?.includes(category) || label.ParentName?.includes(category))
  )

  // Get highest confidence
  const maxConfidence = labels.reduce(
    (max: number, label: ModerationLabel) => Math.max(max, label.Confidence || 0),
    0
  )

  // Determine status
  let status: 'approved' | 'rejected' | 'pending' | 'flagged' = 'approved'
  if (isNSFW && maxConfidence >= 90) {
    status = 'rejected'
  } else if (isNSFW || highConfidenceLabels.length > 0) {
    status = 'flagged'
  }

  return {
    status,
    isNSFW,
    labels: highConfidenceLabels,
    confidence: maxConfidence,
    rawResponse: result,
  }
}
