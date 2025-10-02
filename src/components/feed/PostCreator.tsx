'use client'

import { useState, useRef } from 'react'
import { PostType, Visibility, PostCreateRequest } from '@/types'
import { useAbstractClient } from '@abstract-foundation/agw-react'
import GiphyPicker from '@/components/GiphyPicker'
import dynamic from 'next/dynamic'

const EmojiPicker = dynamic(() => import('emoji-picker-react'), { ssr: false })

interface PostCreatorProps {
  onPostCreated?: (post: any) => void
  className?: string
}

export default function PostCreator({ onPostCreated, className = '' }: PostCreatorProps) {
  const { data: client } = useAbstractClient()
  const [content, setContent] = useState('')
  const [contentType, setContentType] = useState<PostType>('TEXT')
  const [visibility, setVisibility] = useState<Visibility>('PUBLIC')
  const [mediaUrls, setMediaUrls] = useState<string[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [mediaInput, setMediaInput] = useState('')
  const [showGiphyPicker, setShowGiphyPicker] = useState(false)
  const [showEmojiPicker, setShowEmojiPicker] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!content.trim() || !client?.account?.address || isSubmitting) return

    setIsSubmitting(true)

    try {
      const postData: PostCreateRequest = {
        content: content.trim(),
        contentType,
        visibility,
        mediaUrls: mediaUrls.filter(url => url.trim() !== '')
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
        setContentType('TEXT')
        setVisibility('PUBLIC')

        // Notify parent component
        if (onPostCreated) {
          onPostCreated(result.data)
        }
      } else {
        console.error('Failed to create post:', result.error)
      }
    } catch (error) {
      console.error('Error creating post:', error)
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
    if (newUrls.length === 0 && contentType !== 'TEXT') {
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
            <div className="w-12 h-12 bg-gradient-to-r from-cyan-400 to-blue-500 rounded-full flex items-center justify-center">
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

            {/* Media URLs */}
            {mediaUrls.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm text-gray-300">Media attachments:</p>
                {mediaUrls.map((url, index) => (
                  <div key={index} className="flex items-center justify-between bg-white/5 rounded-lg p-2">
                    <span className="text-sm text-gray-300 truncate flex-1">{url}</span>
                    <button
                      type="button"
                      onClick={() => removeMediaUrl(index)}
                      className="text-red-400 hover:text-red-300 ml-2"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Add media input */}
            <div className="flex space-x-2">
              <input
                type="url"
                value={mediaInput}
                onChange={(e) => setMediaInput(e.target.value)}
                placeholder="Add image/video URL..."
                className="flex-1 bg-white/5 text-white placeholder-gray-300 rounded-lg px-3 py-2 border border-white/10 outline-none focus:border-cyan-400"
              />
              <button
                type="button"
                onClick={addMediaUrl}
                className="bg-cyan-500 text-white px-4 py-2 rounded-lg hover:bg-cyan-600 transition-colors"
              >
                Add
              </button>
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                  className="bg-yellow-500 text-white px-4 py-2 rounded-lg hover:bg-yellow-600 transition-colors flex items-center gap-2"
                >
                  😀 Emoji
                </button>
                {showEmojiPicker && (
                  <div className="absolute bottom-full mb-2 right-0 z-50">
                    <EmojiPicker onEmojiClick={handleEmojiSelect} theme="dark" />
                  </div>
                )}
              </div>
              <button
                type="button"
                onClick={() => setShowGiphyPicker(true)}
                className="bg-purple-500 text-white px-4 py-2 rounded-lg hover:bg-purple-600 transition-colors flex items-center gap-2"
              >
                🎭 GIF
              </button>
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
            <span className={`text-sm ${content.length > 1800 ? 'text-red-400' : 'text-gray-400'}`}>
              {content.length}/2000
            </span>
          </div>

          {/* Post button */}
          <button
            type="submit"
            disabled={!content.trim() || isSubmitting || content.length > 2000}
            className={`px-6 py-2 rounded-xl font-semibold transition-all transform hover:scale-105 ${
              !content.trim() || isSubmitting || content.length > 2000
                ? 'bg-gray-500 text-gray-300 cursor-not-allowed'
                : 'bg-gradient-to-r from-cyan-500 to-blue-500 text-white hover:from-cyan-600 hover:to-blue-600 shadow-lg'
            }`}
          >
            {isSubmitting ? (
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                <span>Posting...</span>
              </div>
            ) : (
              'Post to Colony'
            )}
          </button>
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