'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { GiphyService } from '@/lib/giphy'
import { useToast } from '@/components/ui/Toast'
import { useAuth } from '@/providers/AuthProvider'

interface RichContentEditorProps {
  value: string
  onChange: (content: string, mediaUrls?: string[]) => void
  placeholder?: string
  maxLength?: number
  allowMedia?: boolean
  allowGifs?: boolean
  allowEmbeds?: boolean
}

interface MediaFile {
  id: string
  file: File
  preview: string
  type: 'image' | 'video'
  uploading?: boolean
  uploaded?: boolean
  url?: string
}

export default function RichContentEditor({
  value,
  onChange,
  placeholder = "What's on your mind?",
  maxLength = 2000,
  allowMedia = true,
  allowGifs = true,
  allowEmbeds = true
}: RichContentEditorProps) {
  const { toast } = useToast()
  const { user } = useAuth()
  const [mediaFiles, setMediaFiles] = useState<MediaFile[]>([])
  const [isUploading, setIsUploading] = useState(false)
  const [gifSearchQuery, setGifSearchQuery] = useState('')
  const [showGifPicker, setShowGifPicker] = useState(false)
  const [gifs, setGifs] = useState<any[]>([])
  const [loadingGifs, setLoadingGifs] = useState(false)
  const [embedUrl, setEmbedUrl] = useState('')
  const [showEmbedInput, setShowEmbedInput] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Generate a preview URL for media files
  const generatePreview = (file: File): string => {
    return URL.createObjectURL(file)
  }

  // Handle file selection
  const handleFileSelect = useCallback(async (files: FileList) => {
    if (!allowMedia) return

    const newFiles: MediaFile[] = []

    for (let i = 0; i < Math.min(files.length, 4); i++) {
      const file = files[i]

      // Validate file type
      if (!file.type.startsWith('image/') && !file.type.startsWith('video/')) {
        toast('Only images and videos are supported', 'error')
        continue
      }

      // Validate file size (10MB limit)
      if (file.size > 10 * 1024 * 1024) {
        toast('File size must be less than 10MB', 'error')
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

    setMediaFiles(prev => [...prev, ...newFiles])

    // Upload files
    uploadFiles(newFiles)
  }, [allowMedia])

  // Upload files to server
  const uploadFiles = async (filesToUpload: MediaFile[]) => {
    setIsUploading(true)

    const uploadPromises = filesToUpload.map(async (mediaFile) => {
      // Update uploading state
      setMediaFiles(prev => prev.map(f =>
        f.id === mediaFile.id ? { ...f, uploading: true } : f
      ))

      const formData = new FormData()
      formData.append('file', mediaFile.file)
      formData.append('type', 'message_media')

      try {
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

        if (response.ok) {
          const data = await response.json()

          // Update file with uploaded URL
          setMediaFiles(prev => prev.map(f =>
            f.id === mediaFile.id
              ? { ...f, uploading: false, uploaded: true, url: data.url }
              : f
          ))

          return data.url
        } else {
          throw new Error('Upload failed')
        }
      } catch (error) {
        console.error('Upload error:', error)
        // Remove failed upload
        setMediaFiles(prev => prev.filter(f => f.id !== mediaFile.id))
        return null
      }
    })

    const uploadedUrls = await Promise.all(uploadPromises)
    const successfulUploads = uploadedUrls.filter(url => url !== null)

    // Update parent component with media URLs
    onChange(value, successfulUploads)
    setIsUploading(false)
  }

  // Remove media file
  const removeMediaFile = (id: string) => {
    const fileToRemove = mediaFiles.find(f => f.id === id)
    if (fileToRemove?.preview) {
      URL.revokeObjectURL(fileToRemove.preview)
    }

    setMediaFiles(prev => prev.filter(f => f.id !== id))

    // Update media URLs
    const remainingUrls = mediaFiles
      .filter(f => f.id !== id && f.uploaded && f.url)
      .map(f => f.url!)

    onChange(value, remainingUrls)
  }

  // Handle text input
  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value
    if (newValue.length <= maxLength) {
      onChange(newValue, mediaFiles.filter(f => f.uploaded).map(f => f.url!))
    }
  }

  // Search GIFs
  const searchGifs = useCallback(async (query: string) => {
    if (!query.trim()) {
      // Load trending GIFs
      setLoadingGifs(true)
      try {
        const response = await GiphyService.trending(12)
        setGifs(response.data)
      } catch (error) {
        console.error('Failed to load trending GIFs:', error)
      } finally {
        setLoadingGifs(false)
      }
      return
    }

    setLoadingGifs(true)
    try {
      const response = await GiphyService.search(query, 12)
      setGifs(response.data)
    } catch (error) {
      console.error('Failed to search GIFs:', error)
    } finally {
      setLoadingGifs(false)
    }
  }, [])

  // Load trending GIFs when GIF picker opens
  useEffect(() => {
    if (showGifPicker && gifs.length === 0) {
      searchGifs('')
    }
  }, [showGifPicker, searchGifs, gifs.length])

  // Search GIFs when query changes
  useEffect(() => {
    if (showGifPicker) {
      const timeoutId = setTimeout(() => {
        searchGifs(gifSearchQuery)
      }, 300)

      return () => clearTimeout(timeoutId)
    }
  }, [gifSearchQuery, showGifPicker, searchGifs])

  // Insert GIF
  const insertGif = (gif: any) => {
    const gifUrl = GiphyService.getDisplayUrl(gif, 'medium')

    const newMediaFile: MediaFile = {
      id: Date.now().toString(),
      file: new File([], 'gif'),
      preview: gifUrl,
      type: 'image',
      uploading: false,
      uploaded: true,
      url: gifUrl
    }

    setMediaFiles(prev => [...prev, newMediaFile])
    onChange(value, [...mediaFiles.filter(f => f.uploaded).map(f => f.url!), gifUrl])
    setShowGifPicker(false)
    setGifSearchQuery('')
    setGifs([])
  }

  // Add embed
  const addEmbed = () => {
    if (!embedUrl) return

    // Validate URL
    try {
      new URL(embedUrl)
    } catch {
      toast('Please enter a valid URL', 'error')
      return
    }

    // For now, just add the URL to the text content
    // In a real implementation, you'd parse and create rich embeds
    const newContent = value + (value ? '\n\n' : '') + embedUrl
    onChange(newContent, mediaFiles.filter(f => f.uploaded).map(f => f.url!))
    setEmbedUrl('')
    setShowEmbedInput(false)
  }

  return (
    <div className="space-y-4">
      {/* Text Area */}
      <div className="relative">
        <textarea
          value={value}
          onChange={handleTextChange}
          placeholder={placeholder}
          rows={4}
          className="w-full px-4 py-3 bg-black/30 text-white placeholder-gray-400 border border-white/20 rounded-lg focus:outline-none focus:border-cyan-400 resize-none"
        />
        <div className="absolute bottom-3 right-3 text-xs text-gray-500">
          {value.length}/{maxLength}
        </div>
      </div>

      {/* Media Preview */}
      {mediaFiles.length > 0 && (
        <div className="grid grid-cols-2 gap-2">
          {mediaFiles.map((mediaFile) => (
            <div key={mediaFile.id} className="relative group">
              {mediaFile.type === 'image' ? (
                <img
                  src={mediaFile.preview}
                  alt="Upload preview"
                  className="w-full h-32 object-cover rounded-lg"
                />
              ) : (
                <video
                  src={mediaFile.preview}
                  className="w-full h-32 object-cover rounded-lg"
                  controls={false}
                  muted
                />
              )}

              {/* Upload overlay */}
              {mediaFile.uploading && (
                <div className="absolute inset-0 bg-black/50 flex items-center justify-center rounded-lg">
                  <div className="text-white text-sm">
                    <div className="animate-spin w-6 h-6 border-2 border-white border-t-transparent rounded-full mb-2 mx-auto"></div>
                    Uploading...
                  </div>
                </div>
              )}

              {/* Remove button */}
              <button
                onClick={() => removeMediaFile(mediaFile.id)}
                className="absolute top-2 right-2 w-6 h-6 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-xs"
              >
                ×
              </button>

              {/* Upload success indicator */}
              {mediaFile.uploaded && !mediaFile.uploading && (
                <div className="absolute top-2 left-2 w-6 h-6 bg-green-500 text-white rounded-full flex items-center justify-center text-xs">
                  ✓
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* GIF Search */}
      {showGifPicker && allowGifs && (
        <div className="p-4 bg-black/20 rounded-lg border border-white/20">
          <div className="flex gap-2 mb-4">
            <input
              type="text"
              value={gifSearchQuery}
              onChange={(e) => setGifSearchQuery(e.target.value)}
              placeholder="Search GIFs..."
              className="flex-1 px-3 py-2 bg-black/30 text-white placeholder-gray-400 border border-white/20 rounded-lg focus:outline-none focus:border-cyan-400"
            />
            <button
              onClick={() => setShowGifPicker(false)}
              className="px-4 py-2 bg-gray-500/20 text-gray-300 rounded-lg hover:bg-gray-500/30 transition-colors"
            >
              Cancel
            </button>
          </div>

          {/* GIF Results */}
          {loadingGifs ? (
            <div className="text-center text-gray-300 py-8">
              <div className="animate-spin w-8 h-8 border-2 border-cyan-300 border-t-transparent rounded-full mx-auto mb-4"></div>
              <p className="text-sm">Searching for GIFs...</p>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-2 max-h-60 overflow-y-auto">
              {gifs.map((gif) => (
                <button
                  key={gif.id}
                  onClick={() => insertGif(gif)}
                  className="relative group aspect-square bg-gray-800 rounded-lg overflow-hidden hover:ring-2 hover:ring-cyan-400 transition-all"
                >
                  <img
                    src={GiphyService.getDisplayUrl(gif, 'small')}
                    alt={gif.title}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform"
                  />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                    <span className="text-white opacity-0 group-hover:opacity-100 transition-opacity text-sm font-semibold">Add GIF</span>
                  </div>
                </button>
              ))}
            </div>
          )}

          {!loadingGifs && gifs.length === 0 && (
            <div className="text-center text-gray-300 py-8">
              <div className="text-4xl mb-2">🔍</div>
              <p className="text-sm">No GIFs found</p>
              <p className="text-xs">Try a different search term</p>
            </div>
          )}

          {/* Popular searches */}
          {!gifSearchQuery && (
            <div className="mt-4">
              <p className="text-gray-300 text-sm mb-2">Popular:</p>
              <div className="flex flex-wrap gap-2">
                {GiphyService.getPopularSearches().slice(0, 8).map((term) => (
                  <button
                    key={term}
                    onClick={() => setGifSearchQuery(term)}
                    className="px-3 py-1 bg-purple-500/20 text-purple-300 rounded-full text-sm hover:bg-purple-500/30 transition-colors"
                  >
                    {term}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Embed Input */}
      {showEmbedInput && allowEmbeds && (
        <div className="p-4 bg-black/20 rounded-lg border border-white/20">
          <div className="flex gap-2">
            <input
              type="url"
              value={embedUrl}
              onChange={(e) => setEmbedUrl(e.target.value)}
              placeholder="https://example.com/video or link to embed"
              className="flex-1 px-3 py-2 bg-black/30 text-white placeholder-gray-400 border border-white/20 rounded-lg focus:outline-none focus:border-cyan-400"
            />
            <button
              onClick={addEmbed}
              className="px-4 py-2 bg-blue-500/20 text-blue-300 rounded-lg hover:bg-blue-500/30 transition-colors"
              disabled={!embedUrl}
            >
              Add
            </button>
            <button
              onClick={() => setShowEmbedInput(false)}
              className="px-4 py-2 bg-gray-500/20 text-gray-300 rounded-lg hover:bg-gray-500/30 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Toolbar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {/* Media Upload */}
          {allowMedia && (
            <>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="image/*,video/*"
                className="hidden"
                onChange={(e) => e.target.files && handleFileSelect(e.target.files)}
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-2 px-3 py-2 bg-purple-500/20 text-purple-300 rounded-lg hover:bg-purple-500/30 transition-colors text-sm"
                disabled={isUploading || mediaFiles.length >= 4}
                title="Add images or videos (max 4)"
              >
                <span>📸</span>
                Media
              </button>
            </>
          )}

          {/* GIF Button */}
          {allowGifs && (
            <button
              onClick={() => setShowGifPicker(!showGifPicker)}
              className="flex items-center gap-2 px-3 py-2 bg-pink-500/20 text-pink-300 rounded-lg hover:bg-pink-500/30 transition-colors text-sm"
            >
              <span>🎭</span>
              GIF
            </button>
          )}

          {/* Embed Button */}
          {allowEmbeds && (
            <button
              onClick={() => setShowEmbedInput(!showEmbedInput)}
              className="flex items-center gap-2 px-3 py-2 bg-blue-500/20 text-blue-300 rounded-lg hover:bg-blue-500/30 transition-colors text-sm"
            >
              <span>🔗</span>
              Link
            </button>
          )}
        </div>

        {/* Upload status */}
        {isUploading && (
          <div className="text-sm text-cyan-300 flex items-center gap-2">
            <div className="animate-spin w-4 h-4 border-2 border-cyan-300 border-t-transparent rounded-full"></div>
            Uploading media...
          </div>
        )}
      </div>
    </div>
  )
}