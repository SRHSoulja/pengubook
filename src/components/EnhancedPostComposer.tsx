'use client'

import { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useAuth } from '@/providers/AuthProvider'
import { useToast } from '@/components/ui/Toast'
import GiphyPicker from '@/components/GiphyPicker'
import dynamic from 'next/dynamic'
import { Theme } from 'emoji-picker-react'

const EmojiPicker = dynamic(() => import('emoji-picker-react'), { ssr: false })

interface EnhancedPostComposerProps {
  onPost: (data: { title: string; content: string; media?: any[] }) => Promise<void>
  onCancel?: () => void
}

const MAX_CHARS = 5000

export default function EnhancedPostComposer({ onPost, onCancel }: EnhancedPostComposerProps) {
  const { user } = useAuth()
  const { toast } = useToast()
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [isPosting, setIsPosting] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [mediaUrls, setMediaUrls] = useState<string[]>([])
  const [showGiphyPicker, setShowGiphyPicker] = useState(false)
  const [showEmojiPicker, setShowEmojiPicker] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const emojiPickerRef = useRef<HTMLDivElement>(null)

  const charCount = content.length
  const charsRemaining = MAX_CHARS - charCount
  const isOverLimit = charCount > MAX_CHARS
  const isNearLimit = charCount > MAX_CHARS * 0.9

  // Auto-grow textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px'
    }
  }, [content])

  // Auto-save to localStorage (draft)
  useEffect(() => {
    if (content || title) {
      localStorage.setItem('post-draft', JSON.stringify({ title, content, timestamp: Date.now() }))
    }
  }, [title, content])

  // Load draft on mount
  useEffect(() => {
    const draft = localStorage.getItem('post-draft')
    if (draft) {
      try {
        const { title: draftTitle, content: draftContent, timestamp } = JSON.parse(draft)
        // Only load if draft is less than 24 hours old
        if (Date.now() - timestamp < 24 * 60 * 60 * 1000) {
          setTitle(draftTitle || '')
          setContent(draftContent || '')
        }
      } catch (e) {
        console.error('Failed to load draft:', e)
      }
    }
  }, [])

  // Close emoji picker when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (emojiPickerRef.current && !emojiPickerRef.current.contains(event.target as Node)) {
        setShowEmojiPicker(false)
      }
    }

    if (showEmojiPicker) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showEmojiPicker])

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return

    // Check wallet connection
    if (!user?.walletAddress) {
      toast('Please connect your wallet before uploading', 'error')
      return
    }

    setIsUploading(true)
    try {
      const uploadedUrls: string[] = []

      for (const file of Array.from(files)) {
        const formData = new FormData()
        formData.append('file', file)
        formData.append('type', 'post-media')

        console.log('[EnhancedPostComposer] Uploading to Railway with wallet:', user.walletAddress)

        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/upload`, {
          method: 'POST',
          headers: {
            'x-wallet-address': user.walletAddress
          },
          body: formData,
          credentials: 'include'
        })

        console.log('[EnhancedPostComposer] Upload response:', response.status)

        if (!response.ok) {
          const errorData = await response.json()
          console.error('[EnhancedPostComposer] Upload failed:', errorData)
          throw new Error(errorData.error || 'Upload failed')
        }

        const result = await response.json()
        if (result.success) {
          uploadedUrls.push(result.url)
        }
      }

      setMediaUrls(prev => [...prev, ...uploadedUrls])
      toast(`Uploaded ${uploadedUrls.length} file(s)`, 'success')
    } catch (error) {
      console.error('Upload error:', error)
      toast('Failed to upload files', 'error')
    } finally {
      setIsUploading(false)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  const handleRemoveMedia = (index: number) => {
    setMediaUrls(prev => prev.filter((_, i) => i !== index))
  }

  const handleGifSelect = (gifUrl: string) => {
    setMediaUrls(prev => [...prev, gifUrl])
    setShowGiphyPicker(false)
    toast('GIF added!', 'success')
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
  }

  const handlePost = async () => {
    if (!content.trim() || isOverLimit || isPosting) return

    setIsPosting(true)
    try {
      await onPost({ title, content, media: mediaUrls })
      // Clear draft on successful post
      localStorage.removeItem('post-draft')
      setTitle('')
      setContent('')
      setMediaUrls([])
      toast('Post published successfully!', 'success')
    } catch (error: any) {
      console.error('Failed to post:', error)
      toast(error.message || 'Failed to publish post', 'error')
    } finally {
      setIsPosting(false)
    }
  }

  const handleCancel = () => {
    setTitle('')
    setContent('')
    onCancel?.()
  }

  // Circular progress for character count
  const getCircleProgress = () => {
    const percentage = (charCount / MAX_CHARS) * 100
    const circumference = 2 * Math.PI * 18 // radius = 18
    const offset = circumference - (percentage / 100) * circumference
    return { circumference, offset }
  }

  const { circumference, offset } = getCircleProgress()

  return (
    <div className="glass-card rounded-2xl p-4 sm:p-6">
      {/* Header */}
      <div className="flex items-center gap-2 sm:gap-3 mb-4">
        <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-cyan-400 to-blue-500 rounded-xl flex items-center justify-center text-white font-bold overflow-hidden flex-shrink-0">
          {user?.avatar ? (
            <img
              src={user.avatar}
              alt={user.displayName}
              className="w-full h-full object-cover"
            />
          ) : (
            user?.displayName?.charAt(0) || 'P'
          )}
        </div>
        <h2 className="text-base sm:text-lg font-semibold text-white truncate">
          What's happening, {user?.displayName || 'Penguin'}?
        </h2>
      </div>

      {/* Title Input (Optional) */}
      <input
        type="text"
        placeholder="Post title (optional)"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        className="w-full px-3 sm:px-4 py-2 sm:py-3 mb-3 rounded-xl bg-white/10 border border-white/20 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-pengu-green focus:border-transparent transition-all text-sm sm:text-base"
      />

      {/* Content Textarea */}
      <div className="relative">
        <textarea
          ref={textareaRef}
          placeholder="Share your thoughts with the colony..."
          value={content}
          onChange={(e) => setContent(e.target.value)}
          className={`w-full px-3 sm:px-4 py-2 sm:py-3 pr-16 sm:pr-20 rounded-xl bg-white/10 border text-white placeholder-gray-400 focus:outline-none focus:ring-2 resize-none transition-all text-sm sm:text-base ${
            isOverLimit
              ? 'border-red-500 focus:ring-red-500'
              : 'border-white/20 focus:ring-pengu-green focus:border-transparent'
          }`}
          rows={4}
          style={{ minHeight: '100px', maxHeight: '400px' }}
        />

        {/* Character Counter - Bottom Right */}
        <div className="absolute bottom-2 sm:bottom-4 right-2 sm:right-4 flex items-center gap-3">
          {/* Circular Progress */}
          <div className="relative w-10 h-10 sm:w-12 sm:h-12">
            <svg className="w-10 h-10 sm:w-12 sm:h-12 transform -rotate-90">
              {/* Background circle */}
              <circle
                cx="20"
                cy="20"
                r="16"
                stroke="currentColor"
                strokeWidth="3"
                fill="none"
                className="text-white/10 sm:hidden"
              />
              <circle
                cx="24"
                cy="24"
                r="18"
                stroke="currentColor"
                strokeWidth="3"
                fill="none"
                className="text-white/10 hidden sm:block"
              />
              {/* Progress circle */}
              <circle
                cx="20"
                cy="20"
                r="16"
                stroke="currentColor"
                strokeWidth="3"
                fill="none"
                className={`transition-all duration-300 sm:hidden ${
                  isOverLimit
                    ? 'text-red-500'
                    : isNearLimit
                    ? 'text-pengu-orange'
                    : 'text-pengu-green'
                }`}
                strokeDasharray={2 * Math.PI * 16}
                strokeDashoffset={2 * Math.PI * 16 - ((charCount / MAX_CHARS) * 100 / 100) * 2 * Math.PI * 16}
                strokeLinecap="round"
              />
              <circle
                cx="24"
                cy="24"
                r="18"
                stroke="currentColor"
                strokeWidth="3"
                fill="none"
                className={`transition-all duration-300 hidden sm:block ${
                  isOverLimit
                    ? 'text-red-500'
                    : isNearLimit
                    ? 'text-pengu-orange'
                    : 'text-pengu-green'
                }`}
                strokeDasharray={circumference}
                strokeDashoffset={offset}
                strokeLinecap="round"
              />
            </svg>
            {/* Character count text */}
            {charCount > 0 && (
              <span
                className={`absolute inset-0 flex items-center justify-center text-[10px] sm:text-xs font-bold ${
                  isOverLimit ? 'text-red-400' : isNearLimit ? 'text-pengu-orange' : 'text-gray-400'
                }`}
              >
                {isNearLimit ? charsRemaining : ''}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Error Message */}
      {isOverLimit && (
        <p className="text-red-400 text-xs sm:text-sm mt-2">
          Character limit exceeded by {Math.abs(charsRemaining)} characters
        </p>
      )}

      {/* Upload Progress Indicator */}
      {isUploading && (
        <div className="mt-3 sm:mt-4 bg-pengu-green/10 border border-pengu-green/30 rounded-lg p-3 sm:p-4">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="w-4 h-4 sm:w-5 sm:h-5 border-2 border-pengu-green border-t-transparent rounded-full animate-spin flex-shrink-0"></div>
            <span className="text-xs sm:text-sm text-pengu-green font-medium">Uploading files...</span>
          </div>
        </div>
      )}

      {/* Media Preview */}
      {mediaUrls.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-3 sm:mt-4">
          {mediaUrls.map((url, index) => {
            const isVideo = url.includes('.mp4') || url.includes('.mov') || url.includes('.webm') || url.includes('video')
            const isGif = url.includes('.gif') || url.includes('giphy.com')
            return (
              <div key={index} className="relative group">
                {isVideo ? (
                  <video
                    src={url}
                    className="w-full h-24 sm:h-32 object-cover rounded-lg"
                    controls
                    muted
                    playsInline
                  />
                ) : (
                  <img
                    src={url}
                    alt={isGif ? 'GIF' : `Media ${index + 1}`}
                    className="w-full h-24 sm:h-32 object-cover rounded-lg"
                  />
                )}
                {isGif && (
                  <div className="absolute bottom-1 left-1 bg-black/60 text-white text-[10px] px-1.5 py-0.5 rounded">
                    GIF
                  </div>
                )}
                <button
                  onClick={() => handleRemoveMedia(index)}
                  className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-sm font-bold"
                  aria-label="Remove media"
                >
                  ✕
                </button>
              </div>
            )
          })}
        </div>
      )}

      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,video/*"
        multiple
        onChange={handleFileUpload}
        className="hidden"
      />

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 mt-4 pt-4 border-t border-white/10">
        <div className="flex gap-1 sm:gap-2 justify-start">
          {/* Image/Video Upload */}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            className="p-2 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white transition-colors disabled:opacity-50 touch-manipulation"
            title="Upload image or video"
            aria-label="Upload media"
          >
            <span className="text-lg sm:text-xl">📸</span>
          </button>
          {/* GIF Picker */}
          <button
            type="button"
            onClick={() => setShowGiphyPicker(true)}
            className="p-2 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white transition-colors touch-manipulation"
            title="Add GIF"
            aria-label="Add GIF"
          >
            <span className="text-lg sm:text-xl">🎭</span>
          </button>
          {/* Emoji Picker */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowEmojiPicker(!showEmojiPicker)}
              className="p-2 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white transition-colors touch-manipulation"
              title="Add emoji"
              aria-label="Add emoji"
            >
              <span className="text-lg sm:text-xl">😀</span>
            </button>
          </div>
        </div>

        <div className="flex gap-2 sm:gap-3">
          {onCancel && (
            <button
              onClick={handleCancel}
              className="flex-1 sm:flex-initial px-4 sm:px-6 py-2 rounded-xl border border-white/20 text-white hover:bg-white/10 transition-all font-medium text-sm sm:text-base touch-manipulation"
            >
              Cancel
            </button>
          )}
          <button
            onClick={handlePost}
            disabled={!content.trim() || isOverLimit || isPosting}
            className={`flex-1 sm:flex-initial px-4 sm:px-6 py-2 rounded-xl font-medium transition-all text-sm sm:text-base touch-manipulation ${
              !content.trim() || isOverLimit || isPosting
                ? 'bg-white/10 text-gray-500 cursor-not-allowed'
                : 'bg-gradient-to-r from-pengu-green to-green-600 text-white hover:from-pengu-400 hover:to-green-700 hover:shadow-lg hover:shadow-pengu-green/20'
            }`}
          >
            {isPosting ? 'Posting...' : 'Post'}
          </button>
        </div>
      </div>

      {/* Draft indicator */}
      {(title || content) && !isPosting && (
        <p className="text-[10px] sm:text-xs text-gray-500 mt-2">
          Draft auto-saved • {new Date().toLocaleTimeString()}
        </p>
      )}

      {/* Emoji Picker Portal - renders at body level */}
      {showEmojiPicker && typeof window !== 'undefined' && createPortal(
        <div ref={emojiPickerRef}>
          <div
            className="fixed inset-0 bg-transparent z-[9998]"
            onClick={() => setShowEmojiPicker(false)}
          />
          <div
            className="fixed bottom-0 left-0 right-0 sm:bottom-auto sm:top-1/2 sm:left-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2 bg-gray-900 rounded-t-2xl sm:rounded-2xl shadow-2xl border border-white/10"
            style={{ zIndex: 10000 }}
          >
            <EmojiPicker
              onEmojiClick={handleEmojiSelect}
              theme={Theme.DARK}
              width={typeof window !== 'undefined' && window.innerWidth < 640 ? '100%' : 350}
              height={400}
              searchPlaceHolder="Search emoji..."
              previewConfig={{ showPreview: false }}
            />
          </div>
        </div>,
        document.body
      )}

      {/* Giphy Picker */}
      <GiphyPicker
        isOpen={showGiphyPicker}
        onClose={() => setShowGiphyPicker(false)}
        onSelect={handleGifSelect}
      />
    </div>
  )
}
