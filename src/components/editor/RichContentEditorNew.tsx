'use client'

import { useState, useRef } from 'react'
import MediaUploader, { MediaFile } from './MediaUploader'
import GifPicker from './GifPicker'
import EmbedInput, { EmbedData } from './EmbedInput'

interface RichContentEditorProps {
  value: string
  onChange: (content: string, mediaUrls?: string[]) => void
  placeholder?: string
  maxLength?: number
  allowMedia?: boolean
  allowGifs?: boolean
  allowEmbeds?: boolean
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
  const [mediaFiles, setMediaFiles] = useState<MediaFile[]>([])
  const [showGifPicker, setShowGifPicker] = useState(false)
  const [showEmbedInput, setShowEmbedInput] = useState(false)
  const [embeds, setEmbeds] = useState<EmbedData[]>([])
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Auto-resize textarea
  const adjustTextareaHeight = () => {
    const textarea = textareaRef.current
    if (textarea) {
      textarea.style.height = 'auto'
      textarea.style.height = `${textarea.scrollHeight}px`
    }
  }

  // Handle text change
  const handleTextChange = (newValue: string) => {
    if (newValue.length <= maxLength) {
      onChange(newValue, getMediaUrls())
      adjustTextareaHeight()
    }
  }

  // Get media URLs for submission
  const getMediaUrls = () => {
    return mediaFiles
      .filter(f => f.uploaded && f.url)
      .map(f => f.url!)
  }

  // Handle GIF selection
  const handleGifSelect = (gifUrl: string) => {
    const newValue = value + (value ? '\n\n' : '') + `![GIF](${gifUrl})`
    handleTextChange(newValue)
  }

  // Handle embed addition
  const handleAddEmbed = (embedData: EmbedData) => {
    setEmbeds(prev => [...prev, embedData])
    const embedText = `[${embedData.title || 'Link'}](${embedData.url})`
    const newValue = value + (value ? '\n\n' : '') + embedText
    handleTextChange(newValue)
  }

  // Remove embed
  const removeEmbed = (index: number) => {
    setEmbeds(prev => prev.filter((_, i) => i !== index))
  }

  // Handle media files change
  const handleMediaFilesChange = (files: MediaFile[] | ((prev: MediaFile[]) => MediaFile[])) => {
    if (typeof files === 'function') {
      setMediaFiles(prev => {
        const newFiles = files(prev)
        onChange(value, newFiles.filter(f => f.uploaded && f.url).map(f => f.url!))
        return newFiles
      })
    } else {
      setMediaFiles(files)
      onChange(value, files.filter(f => f.uploaded && f.url).map(f => f.url!))
    }
  }

  return (
    <div className="space-y-4">
      {/* Main textarea */}
      <div className="relative">
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => handleTextChange(e.target.value)}
          placeholder={placeholder}
          className="w-full p-4 bg-black/30 border border-white/20 rounded-xl text-white placeholder-gray-400 resize-none focus:outline-none focus:ring-2 focus:ring-purple-500 min-h-[120px] max-h-[300px]"
          rows={4}
          onInput={adjustTextareaHeight}
        />

        {/* Character count */}
        <div className="absolute bottom-3 right-3 text-xs text-gray-400">
          <span className={value.length > maxLength * 0.9 ? 'text-yellow-400' : ''}>
            {value.length}
          </span>
          <span className="text-gray-500">/{maxLength}</span>
        </div>
      </div>

      {/* Media Uploader */}
      <MediaUploader
        mediaFiles={mediaFiles}
        onMediaFilesChange={handleMediaFilesChange}
        allowMedia={allowMedia}
      />

      {/* Embeds Display */}
      {embeds.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-gray-300">Links & Embeds</h4>
          {embeds.map((embed, index) => (
            <div key={index} className="flex items-center justify-between p-3 bg-black/30 rounded-lg border border-white/10">
              <div className="flex items-center space-x-3">
                {embed.thumbnail && (
                  <img
                    src={embed.thumbnail}
                    alt="Embed preview"
                    className="w-10 h-10 object-cover rounded"
                  />
                )}
                <div>
                  <p className="text-white text-sm font-medium truncate max-w-xs">
                    {embed.title}
                  </p>
                  <p className="text-purple-400 text-xs truncate max-w-xs">
                    {embed.url}
                  </p>
                </div>
              </div>
              <button
                onClick={() => removeEmbed(index)}
                className="text-gray-400 hover:text-red-400 transition-colors"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Toolbar */}
      <div className="flex items-center justify-between pt-3 border-t border-white/10">
        <div className="flex items-center space-x-2">
          {/* GIF Button */}
          {allowGifs && (
            <button
              type="button"
              onClick={() => setShowGifPicker(true)}
              className="flex items-center space-x-1 px-3 py-2 bg-black/30 hover:bg-black/50 border border-white/20 rounded-lg text-gray-300 hover:text-white transition-colors"
              title="Add GIF"
            >
              <span>🎬</span>
              <span className="text-sm">GIF</span>
            </button>
          )}

          {/* Embed Button */}
          {allowEmbeds && (
            <button
              type="button"
              onClick={() => setShowEmbedInput(true)}
              className="flex items-center space-x-1 px-3 py-2 bg-black/30 hover:bg-black/50 border border-white/20 rounded-lg text-gray-300 hover:text-white transition-colors"
              title="Add Link"
            >
              <span>🔗</span>
              <span className="text-sm">Link</span>
            </button>
          )}
        </div>

        {/* Format hints */}
        <div className="text-xs text-gray-400">
          <span>Supports **bold**, *italic*, and markdown</span>
        </div>
      </div>

      {/* Modals */}
      <GifPicker
        isOpen={showGifPicker}
        onClose={() => setShowGifPicker(false)}
        onSelectGif={handleGifSelect}
      />

      <EmbedInput
        isOpen={showEmbedInput}
        onClose={() => setShowEmbedInput(false)}
        onAddEmbed={handleAddEmbed}
      />
    </div>
  )
}