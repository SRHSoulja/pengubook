'use client'

import { useState, useRef } from 'react'
import { PostType, Visibility, PostCreateRequest } from '@/types'
import { useAbstractClient } from '@abstract-foundation/agw-react'
import GiphyPicker from '@/components/GiphyPicker'
import Button, { IconButton } from '@/components/ui/Button'
import dynamic from 'next/dynamic'
import { Theme } from 'emoji-picker-react'
import { useToast } from '@/components/ui/Toast'

const EmojiPicker = dynamic(() => import('emoji-picker-react'), { ssr: false })

interface PostCreatorProps {
  onPostCreated?: (post: any) => void
  className?: string
}

interface UploadedFile {
  url: string
  type: 'image' | 'video'
  publicId: string
  width?: number
  height?: number
  thumbnailUrl?: string
  isNSFW?: boolean
  contentWarnings?: string[]
}

export default function PostCreator({ onPostCreated, className = '' }: PostCreatorProps) {
  const { data: client } = useAbstractClient()
  const { success, error } = useToast()
  const [content, setContent] = useState('')
  const [contentType, setContentType] = useState<PostType>('TEXT')
  const [visibility, setVisibility] = useState<Visibility>('PUBLIC')
  const [mediaUrls, setMediaUrls] = useState<string[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [mediaInput, setMediaInput] = useState('')
  const [showGiphyPicker, setShowGiphyPicker] = useState(false)
  const [showEmojiPicker, setShowEmojiPicker] = useState(false)
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([])
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState<string>('')
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return

    setIsUploading(true)
    setUploadProgress('Uploading...')

    try {
      for (const file of Array.from(files)) {
        const formData = new FormData()
        formData.append('file', file)
        formData.append('type', 'post-media')

        setUploadProgress(`Uploading ${file.name}...`)

        const apiUrl = process.env.NEXT_PUBLIC_API_URL || ''
        const response = await fetch(`${apiUrl}/upload`, {
          method: 'POST',
          headers: {
            'x-wallet-address': client?.account?.address || ''
          },
          body: formData,
          credentials: 'include'
        })

        const result = await response.json()

        if (result.success) {
          const uploadedFile: UploadedFile = {
            url: result.url,
            type: result.type,
            publicId: result.publicId,
            width: result.width,
            height: result.height,
            thumbnailUrl: result.thumbnailUrl,
            isNSFW: result.moderation?.isNSFW,
            contentWarnings: result.moderation?.contentWarnings
          }

          setUploadedFiles(prev => [...prev, uploadedFile])
          setMediaUrls(prev => [...prev, result.url])

          // Auto-set content type based on upload
          if (result.type === 'video' && contentType === 'TEXT') {
            setContentType('VIDEO')
          } else if (result.type === 'image' && contentType === 'TEXT') {
            setContentType('IMAGE')
          }

          setUploadProgress('')
        } else {
          error(`Upload failed: ${result.error}`)
        }
      }
    } catch (err) {
      console.error('Upload error:', err)
      error('Failed to upload file')
    } finally {
      setIsUploading(false)
      setUploadProgress('')
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!content.trim() || !client?.account?.address || isSubmitting) return

    setIsSubmitting(true)

    try {
      // Combine uploaded files and manual URLs
      const allMediaUrls = [
        ...uploadedFiles.map(f => f.url),
        ...mediaUrls.filter(url => url.trim() !== '')
      ]

      const postData: PostCreateRequest = {
        content: content.trim(),
        contentType,
        visibility,
        mediaUrls: allMediaUrls
      }

      const response = await fetch('/api/posts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-wallet-address': client.account.address
        },
        body: JSON.stringify(postData)
      })

      const result = await response.json()

      if (result.success) {
        // Clear form
        setContent('')
        setMediaUrls([])
        setMediaInput('')
        setUploadedFiles([])
        setContentType('TEXT')
        setVisibility('PUBLIC')

        success('Post created successfully!')

        // Notify parent component
        if (onPostCreated) {
          onPostCreated(result.data)
        }
      } else {
        console.error('Failed to create post:', result.error)
        error(result.error || 'Failed to create post')
      }
    } catch (err) {
      console.error('Error creating post:', err)
      error('Failed to create post')
    } finally {
      setIsSubmitting(false)
    }
  }

  const addMediaUrl = () => {
    if (mediaInput.trim() && !mediaUrls.includes(mediaInput.trim())) {
      setMediaUrls([...mediaUrls, mediaInput.trim()])
      setMediaInput('')
      if (contentType === 'TEXT') {
        setContentType('IMAGE') // Assume image by default when media is added
      }
    }
  }

  const removeMediaUrl = (index: number) => {
    const newUrls = mediaUrls.filter((_, i) => i !== index)
    setMediaUrls(newUrls)
    if (newUrls.length === 0 && uploadedFiles.length === 0 && contentType !== 'TEXT') {
      setContentType('TEXT')
    }
  }

  const removeUploadedFile = (index: number) => {
    const fileToRemove = uploadedFiles[index]
    setUploadedFiles(prev => prev.filter((_, i) => i !== index))
    setMediaUrls(prev => prev.filter(url => url !== fileToRemove.url))

    if (uploadedFiles.length === 1 && mediaUrls.length === 0 && contentType !== 'TEXT') {
      setContentType('TEXT')
    }
  }

  const handleGifSelect = (gifUrl: string) => {
    setMediaUrls([...mediaUrls, gifUrl])
    setShowGiphyPicker(false)
    if (contentType === 'TEXT') {
      setContentType('IMAGE')
    }
  }

  const handleEmojiSelect = (emojiData: any) => {
    const emoji = emojiData.emoji
    const textarea = textareaRef.current
    if (textarea) {
      const start = textarea.selectionStart
      const end = textarea.selectionEnd
      const newContent = content.substring(0, start) + emoji + content.substring(end)
      setContent(newContent)

      // Set cursor position after emoji
      setTimeout(() => {
        textarea.focus()
        textarea.setSelectionRange(start + emoji.length, start + emoji.length)
      }, 0)
    } else {
      setContent(content + emoji)
    }
    setShowEmojiPicker(false)
  }

  return (
    <div className={`bg-white/10 backdrop-blur-lg rounded-2xl border border-white/20 p-6 ${className}`}>
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Main content area */}
        <div className="flex space-x-4">
          <div className="flex-shrink-0">
            <div className="w-12 h-12 bg-gradient-to-r from-pengu-green to-pengu-600 rounded-full flex items-center justify-center shadow-lg shadow-pengu-green/20">
              <span className="text-2xl">🐧</span>
            </div>
          </div>

          <div className="flex-1 space-y-4">
            <textarea
              ref={textareaRef}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Share your icy thoughts with the colony... ❄️"
              className="w-full bg-transparent text-white placeholder-gray-300 border-none outline-none resize-none text-lg min-h-[120px]"
              maxLength={2000}
            />

            {/* Uploaded Files Preview */}
            {uploadedFiles.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm text-gray-300 font-medium">Uploaded files:</p>
                <div className="grid grid-cols-2 gap-2">
                  {uploadedFiles.map((file, index) => (
                    <div key={index} className="relative group">
                      {file.type === 'image' ? (
                        <img
                          src={file.url}
                          alt="Upload preview"
                          className="w-full h-32 object-cover rounded-lg border border-white/20"
                        />
                      ) : (
                        <video
                          src={file.url}
                          className="w-full h-32 object-cover rounded-lg border border-white/20"
                          muted
                          loop
                          autoPlay
                        />
                      )}
                      {file.isNSFW && (
                        <div className="absolute top-1 left-1 bg-red-500 text-white text-xs px-2 py-1 rounded">
                          NSFW
                        </div>
                      )}
                      <button
                        type="button"
                        onClick={() => removeUploadedFile(index)}
                        className="absolute top-1 right-1 bg-red-500 text-white w-6 h-6 rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                        aria-label="Remove uploaded file"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Manual URL attachments */}
            {mediaUrls.filter(url => !uploadedFiles.some(f => f.url === url)).length > 0 && (
              <div className="space-y-2">
                <p className="text-sm text-gray-300 font-medium">URL attachments:</p>
                {mediaUrls
                  .map((url, originalIndex) => ({ url, originalIndex }))
                  .filter(({ url }) => !uploadedFiles.some(f => f.url === url))
                  .map(({ url, originalIndex }) => (
                    <div key={originalIndex} className="flex items-center justify-between bg-white/5 rounded-lg p-2">
                      <span className="text-sm text-gray-300 truncate flex-1">{url}</span>
                      <button
                        type="button"
                        onClick={() => removeMediaUrl(originalIndex)}
                        className="text-red-400 hover:text-red-300 ml-2 min-w-[44px] min-h-[44px] flex items-center justify-center"
                        aria-label="Remove URL"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
              </div>
            )}

            {/* Upload Progress */}
            {isUploading && (
              <div className="bg-pengu-green/10 border border-pengu-green/30 rounded-lg p-3">
                <div className="flex items-center space-x-2">
                  <div className="w-4 h-4 border-2 border-pengu-green border-t-transparent rounded-full animate-spin"></div>
                  <span className="text-sm text-pengu-green">{uploadProgress}</span>
                </div>
              </div>
            )}

            {/* Media Controls */}
            <div className="flex flex-wrap items-center gap-2">
              {/* File Upload Button */}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,video/*"
                multiple
                onChange={handleFileSelect}
                className="hidden"
                aria-label="Upload files"
              />
              <Button
                type="button"
                variant="primary"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
                iconLeft={<span>📎</span>}
              >
                Upload File
              </Button>

              {/* URL Input */}
              <input
                type="url"
                value={mediaInput}
                onChange={(e) => setMediaInput(e.target.value)}
                placeholder="Or paste image/video URL..."
                className="flex-1 min-w-[200px] bg-white/5 text-white placeholder-gray-300 rounded-lg px-3 py-2 min-h-[44px] border border-white/10 outline-none focus:border-pengu-green"
              />
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={addMediaUrl}
              >
                Add URL
              </Button>

              {/* Emoji Button */}
              <div className="relative">
                <Button
                  type="button"
                  variant="warning"
                  size="sm"
                  onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                  iconLeft={<span>😀</span>}
                >
                  Emoji
                </Button>
                {showEmojiPicker && (
                  <div className="absolute bottom-full mb-2 right-0 z-50">
                    <EmojiPicker onEmojiClick={handleEmojiSelect} theme={Theme.DARK} />
                  </div>
                )}
              </div>

              {/* GIF Button */}
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setShowGiphyPicker(true)}
                iconLeft={<span>🎭</span>}
              >
                GIF
              </Button>
            </div>
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center justify-between pt-4 border-t border-white/10">
          <div className="flex items-center space-x-4">
            {/* Content Type */}
            <select
              value={contentType}
              onChange={(e) => setContentType(e.target.value as PostType)}
              className="bg-white/10 text-white border border-white/20 rounded-lg px-3 py-1 text-sm outline-none focus:border-cyan-400"
            >
              <option value="TEXT">💬 Text</option>
              <option value="IMAGE">🖼️ Image</option>
              <option value="VIDEO">🎥 Video</option>
              <option value="TIP_ANNOUNCEMENT">💰 Tip Announcement</option>
              <option value="ACHIEVEMENT">🏆 Achievement</option>
            </select>

            {/* Visibility */}
            <select
              value={visibility}
              onChange={(e) => setVisibility(e.target.value as Visibility)}
              className="bg-white/10 text-white border border-white/20 rounded-lg px-3 py-1 text-sm outline-none focus:border-cyan-400"
            >
              <option value="PUBLIC">🌍 Public</option>
              <option value="FOLLOWERS_ONLY">👥 Followers Only</option>
              <option value="PRIVATE">🔒 Private</option>
            </select>

            {/* Character count */}
            <span className={`text-sm ${content.length > 1800 ? 'text-red-400' : 'text-gray-300'}`}>
              {content.length}/2000
            </span>
          </div>

          {/* Post button */}
          <Button
            type="submit"
            variant="primary"
            size="lg"
            disabled={!content.trim() || isSubmitting || content.length > 2000}
            loading={isSubmitting}
          >
            {!isSubmitting && 'Post to Colony'}
          </Button>
        </div>
      </form>

      {/* Giphy Picker Modal */}
      <GiphyPicker
        isOpen={showGiphyPicker}
        onClose={() => setShowGiphyPicker(false)}
        onSelect={handleGifSelect}
      />
    </div>
  )
}
