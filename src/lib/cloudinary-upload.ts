/**
 * Direct client-side upload to Cloudinary
 * Bypasses Vercel's 4.5MB body size limit
 */

export interface CloudinaryUploadResult {
  secure_url: string
  public_id: string
  width: number
  height: number
  format: string
  resource_type: 'image' | 'video'
  bytes: number
  duration?: number
  thumbnail_url?: string
}

export interface UploadProgress {
  loaded: number
  total: number
  percentage: number
}

/**
 * Upload file directly to Cloudinary using unsigned upload
 * @param file File to upload
 * @param onProgress Progress callback
 * @returns Cloudinary upload result
 */
export async function uploadToCloudinary(
  file: File,
  onProgress?: (progress: UploadProgress) => void
): Promise<CloudinaryUploadResult> {
  const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || 'du4d6q6jx'
  const uploadPreset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET || 'pebloq_unsigned'

  console.log('[Cloudinary Upload] Config:', {
    cloudName,
    uploadPreset,
    hasEnvCloudName: !!process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
    hasEnvPreset: !!process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET
  })

  const formData = new FormData()
  formData.append('file', file)
  formData.append('upload_preset', uploadPreset)

  // Determine folder based on file type
  const isVideo = file.type.startsWith('video/')
  const folder = isVideo ? 'pebloq/posts/videos' : 'pebloq/posts/images'
  formData.append('folder', folder)

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()

    // Track upload progress
    xhr.upload.addEventListener('progress', (e) => {
      if (e.lengthComputable && onProgress) {
        onProgress({
          loaded: e.loaded,
          total: e.total,
          percentage: Math.round((e.loaded / e.total) * 100)
        })
      }
    })

    xhr.addEventListener('load', () => {
      if (xhr.status === 200) {
        const result = JSON.parse(xhr.responseText)

        // Generate thumbnail URL for videos
        const thumbnailUrl = result.resource_type === 'video'
          ? result.secure_url.replace(/\.(mp4|mov|avi|webm)$/, '.jpg')
          : undefined

        resolve({
          secure_url: result.secure_url,
          public_id: result.public_id,
          width: result.width,
          height: result.height,
          format: result.format,
          resource_type: result.resource_type,
          bytes: result.bytes,
          duration: result.duration,
          thumbnail_url: thumbnailUrl
        })
      } else {
        reject(new Error(`Upload failed: ${xhr.statusText}`))
      }
    })

    xhr.addEventListener('error', () => {
      reject(new Error('Upload failed: Network error'))
    })

    xhr.addEventListener('abort', () => {
      reject(new Error('Upload cancelled'))
    })

    xhr.open('POST', `https://api.cloudinary.com/v1_1/${cloudName}/upload`)
    xhr.send(formData)
  })
}
