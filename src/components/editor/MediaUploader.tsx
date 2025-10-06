'use client'

import { useState, useRef, useCallback } from 'react'
import { useToast } from '@/components/ui/Toast'

export interface MediaFile {
  id: string
  file: File
  preview: string
  type: 'image' | 'video'
  uploading?: boolean
  uploaded?: boolean
  url?: string
}

interface MediaUploaderProps {
  mediaFiles: MediaFile[]
  onMediaFilesChange: (files: MediaFile[] | ((prev: MediaFile[]) => MediaFile[])) => void
  allowMedia?: boolean
  maxFiles?: number
}

export default function MediaUploader({
  mediaFiles,
  onMediaFilesChange,
  allowMedia = true,
  maxFiles = 4
}: MediaUploaderProps) {
  const { addToast } = useToast()
  const [isUploading, setIsUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Generate a preview URL for media files
  const generatePreview = (file: File): string => {
    return URL.createObjectURL(file)
  }

  // Handle file selection
  const handleFileSelect = useCallback(async (files: FileList) => {
    if (!allowMedia) return

    const newFiles: MediaFile[] = []

    for (let i = 0; i < Math.min(files.length, maxFiles); i++) {
      const file = files[i]

      // Validate file type
      if (!file.type.startsWith('image/') && !file.type.startsWith('video/')) {
        addToast('Only images and videos are supported', 'error')
        continue
      }

      // Validate file size (10MB limit)
      if (file.size > 10 * 1024 * 1024) {
        addToast('File size must be less than 10MB', 'error')
        continue
      }

      const mediaFile: MediaFile = {
        id: Date.now() + i.toString(),
        file,
        preview: generatePreview(file),
        type: file.type.startsWith('image/') ? 'image' : 'video',
        uploading: false,
        uploaded: false
      }

      newFiles.push(mediaFile)
    }

    const updatedFiles = [...mediaFiles, ...newFiles]
    onMediaFilesChange(updatedFiles)

    // Upload files
    uploadFiles(newFiles)
  }, [allowMedia, maxFiles, mediaFiles, onMediaFilesChange])

  // Upload files to server
  const uploadFiles = async (filesToUpload: MediaFile[]) => {
    setIsUploading(true)

    const uploadPromises = filesToUpload.map(async (mediaFile) => {
      // Update uploading state
      onMediaFilesChange(prev => prev.map(f =>
        f.id === mediaFile.id ? { ...f, uploading: true } : f
      ))

      const formData = new FormData()
      formData.append('file', mediaFile.file)
      formData.append('type', 'post-media')

      try {
        const response = await fetch('/api/upload', {
          method: 'POST',
          body: formData
        })

        if (!response.ok) {
          throw new Error('Upload failed')
        }

        const result = await response.json()

        // Update uploaded state
        onMediaFilesChange(prev => prev.map(f =>
          f.id === mediaFile.id
            ? { ...f, uploading: false, uploaded: true, url: result.url }
            : f
        ))
      } catch (error) {
        console.error('Upload error:', error)
        // Remove failed upload
        onMediaFilesChange(prev => prev.filter(f => f.id !== mediaFile.id))
        addToast('Failed to upload file', 'error')
      }
    })

    await Promise.all(uploadPromises)
    setIsUploading(false)
  }

  // Remove media file
  const removeMediaFile = (id: string) => {
    const updatedFiles = mediaFiles.filter(f => f.id !== id)
    onMediaFilesChange(updatedFiles)
  }

  // Handle drag and drop
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    const files = e.dataTransfer.files
    if (files.length > 0) {
      handleFileSelect(files)
    }
  }, [handleFileSelect])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
  }, [])

  return (
    <div className="space-y-3">
      {/* Upload Button */}
      {allowMedia && (
        <div className="flex items-center space-x-2">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            className="flex items-center space-x-2 px-3 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-purple-800 text-white rounded-lg transition-colors"
          >
            <span>📎</span>
            <span>Attach Media</span>
          </button>
          {isUploading && (
            <span className="text-sm text-yellow-400">Uploading...</span>
          )}
        </div>
      )}

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept="image/*,video/*"
        onChange={(e) => e.target.files && handleFileSelect(e.target.files)}
        className="hidden"
      />

      {/* Drag and drop area */}
      {allowMedia && mediaFiles.length === 0 && (
        <div
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          className="border-2 border-dashed border-gray-600 rounded-lg p-6 text-center text-gray-300 hover:border-purple-500 transition-colors"
        >
          <p>Drag and drop media files here, or click to select</p>
          <p className="text-sm mt-1">Supports images and videos up to 10MB</p>
        </div>
      )}

      {/* Media Preview Grid */}
      {mediaFiles.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {mediaFiles.map((mediaFile) => (
            <div key={mediaFile.id} className="relative group">
              <div className="aspect-square bg-gray-800 rounded-lg overflow-hidden">
                {mediaFile.type === 'image' ? (
                  <img
                    src={mediaFile.preview}
                    alt="Preview"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <video
                    src={mediaFile.preview}
                    className="w-full h-full object-cover"
                    muted
                  />
                )}

                {/* Upload status overlay */}
                {mediaFile.uploading && (
                  <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                    <div className="animate-spin w-6 h-6 border-2 border-white border-t-transparent rounded-full" />
                  </div>
                )}

                {/* Remove button */}
                <button
                  onClick={() => removeMediaFile(mediaFile.id)}
                  className="absolute top-2 right-2 bg-red-600 hover:bg-red-700 text-white rounded-full w-6 h-6 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                  aria-label="Remove media file"
                >
                  ✕
                </button>

                {/* Upload success indicator */}
                {mediaFile.uploaded && (
                  <div className="absolute bottom-2 left-2 bg-green-600 text-white rounded-full w-6 h-6 flex items-center justify-center">
                    ✓
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}