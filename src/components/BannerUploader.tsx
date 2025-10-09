'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import Cropper from 'react-easy-crop'
import type { Area } from 'react-easy-crop'
import { useToast } from '@/components/ui/Toast'
import { useAuth } from '@/providers/AuthProvider'

interface BannerUploaderProps {
  currentBanner?: string | null
  onBannerChange: (url: string | null) => void
}

export default function BannerUploader({ currentBanner, onBannerChange }: BannerUploaderProps) {
  const { toast } = useToast()
  const { user } = useAuth()
  const [uploading, setUploading] = useState(false)
  const [preview, setPreview] = useState<string | null>(currentBanner || null)
  const [showCropper, setShowCropper] = useState(false)
  const [tempImage, setTempImage] = useState<string | null>(null)
  const [crop, setCrop] = useState({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null)
  const [imageType, setImageType] = useState<string>('image/jpeg')
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Sync preview with currentBanner prop when it changes
  useEffect(() => {
    setPreview(currentBanner || null)
  }, [currentBanner])

  const onCropComplete = useCallback((croppedArea: Area, croppedAreaPixels: Area) => {
    setCroppedAreaPixels(croppedAreaPixels)
  }, [])

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast('Only images are allowed for banners', 'error')
      return
    }

    // Validate file size (10MB)
    if (file.size > 10 * 1024 * 1024) {
      toast('Image must be less than 10MB', 'error')
      return
    }

    // Store the original image type to preserve transparency
    setImageType(file.type)

    // Show cropper with image
    const imageUrl = URL.createObjectURL(file)
    setTempImage(imageUrl)
    setShowCropper(true)
    setCrop({ x: 0, y: 0 })
    setZoom(1)
  }

  const createCroppedImage = async (imageType: string): Promise<Blob> => {
    if (!tempImage || !croppedAreaPixels) {
      throw new Error('No image to crop')
    }

    const image = new Image()
    image.src = tempImage
    await new Promise((resolve) => { image.onload = resolve })

    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('Failed to get canvas context')

    canvas.width = croppedAreaPixels.width
    canvas.height = croppedAreaPixels.height

    // Clear canvas with transparency for PNG images
    if (imageType === 'image/png') {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
    }

    ctx.drawImage(
      image,
      croppedAreaPixels.x,
      croppedAreaPixels.y,
      croppedAreaPixels.width,
      croppedAreaPixels.height,
      0,
      0,
      croppedAreaPixels.width,
      croppedAreaPixels.height
    )

    return new Promise((resolve) => {
      // Use PNG for transparent images, JPEG for others
      const mimeType = imageType === 'image/png' ? 'image/png' : 'image/jpeg'
      const quality = mimeType === 'image/jpeg' ? 0.95 : undefined

      canvas.toBlob((blob) => {
        if (blob) resolve(blob)
      }, mimeType, quality)
    })
  }

  const handleCropConfirm = async () => {
    if (!croppedAreaPixels) return

    setUploading(true)
    setShowCropper(false)

    try {
      const croppedBlob = await createCroppedImage(imageType)
      const fileExtension = imageType === 'image/png' ? 'png' : 'jpg'
      const file = new File([croppedBlob], `banner.${fileExtension}`, { type: imageType })

      const formData = new FormData()
      formData.append('file', file)
      formData.append('type', 'profile-banner')

      if (!user?.walletAddress) {
        throw new Error('Wallet not connected')
      }

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/upload`, {
        method: 'POST',
        headers: {
          'x-wallet-address': user.walletAddress
        },
        body: formData,
        credentials: 'include'
      })

      if (!response.ok) {
        throw new Error('Upload failed')
      }

      const result = await response.json()

      setPreview(result.url)
      onBannerChange(result.url)
      setTempImage(null)

      console.log('✅ Banner uploaded:', result.url)
    } catch (error) {
      console.error('Upload error:', error)
      toast('Failed to upload banner image', 'error')
      setPreview(currentBanner || null)
    } finally {
      setUploading(false)
    }
  }

  const handleCropCancel = () => {
    setShowCropper(false)
    setTempImage(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handleRemove = () => {
    setPreview(null)
    onBannerChange(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  return (
    <>
      {/* Cropper Modal */}
      {showCropper && tempImage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90">
          <div className="w-full max-w-4xl p-6">
            <div className="bg-white/10 backdrop-blur-lg rounded-2xl border border-white/20 p-6">
              <h3 className="text-xl font-bold text-white mb-4">Position Your Banner</h3>

              <div className="relative w-full h-96 bg-black rounded-xl overflow-hidden">
                <Cropper
                  image={tempImage}
                  crop={crop}
                  zoom={zoom}
                  aspect={3 / 1}
                  onCropChange={setCrop}
                  onZoomChange={setZoom}
                  onCropComplete={onCropComplete}
                />
              </div>

              <div className="mt-4">
                <label className="block text-sm font-medium text-white mb-2">Zoom</label>
                <input
                  type="range"
                  min={1}
                  max={3}
                  step={0.1}
                  value={zoom}
                  onChange={(e) => setZoom(parseFloat(e.target.value))}
                  className="w-full"
                />
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={handleCropConfirm}
                  disabled={uploading}
                  className="flex-1 bg-cyan-500 hover:bg-cyan-600 text-white px-6 py-3 rounded-xl font-medium transition-colors disabled:opacity-50"
                >
                  {uploading ? '⏳ Uploading...' : '✓ Apply'}
                </button>
                <button
                  onClick={handleCropCancel}
                  disabled={uploading}
                  className="px-6 py-3 bg-gray-500 hover:bg-gray-600 text-white rounded-xl font-medium transition-colors disabled:opacity-50"
                >
                  ✕ Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-white mb-2">
          Profile Banner
        </label>

        <div className="relative">
        {/* Banner Preview - Matches actual profile display */}
        <div className="w-full h-48 md:h-64 rounded-xl overflow-hidden bg-gradient-to-r from-purple-500 via-pink-500 to-blue-500 relative group">
          {preview ? (
            <>
              <img
                src={preview}
                alt="Banner preview"
                className="w-full h-full object-cover object-center md:object-top"
              />
              {/* Gradient overlay like actual profile */}
              <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-black/60 via-black/30 to-transparent pointer-events-none" />
            </>
          ) : (
            <div className="flex items-center justify-center h-full">
              <div className="text-center text-white/70">
                <div className="text-4xl mb-2">🖼️</div>
                <p className="text-sm">No banner image</p>
              </div>
            </div>
          )}

          {/* Upload Overlay */}
          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="bg-cyan-500 hover:bg-cyan-600 text-white px-4 py-2 rounded-lg font-medium transition-colors disabled:opacity-50"
            >
              {uploading ? '⏳ Uploading...' : preview ? '📸 Change' : '📤 Upload'}
            </button>

            {preview && (
              <button
                type="button"
                onClick={handleRemove}
                disabled={uploading}
                className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg font-medium transition-colors disabled:opacity-50"
              >
                🗑️ Remove
              </button>
            )}
          </div>
        </div>

        {/* Hidden File Input */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileSelect}
          className="hidden"
        />
      </div>

      <p className="text-xs text-gray-300 mt-2">
        Recommended: 1500x500px • Max 10MB • JPG, PNG, or GIF
      </p>
      </div>
    </>
  )
}
