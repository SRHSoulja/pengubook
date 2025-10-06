'use client'

import { useState, useRef, useEffect } from 'react'
import { useAuth } from '@/providers/AuthProvider'

interface EnhancedPostComposerProps {
  onPost: (data: { title: string; content: string; media?: any[] }) => Promise<void>
  onCancel?: () => void
}

const MAX_CHARS = 5000

export default function EnhancedPostComposer({ onPost, onCancel }: EnhancedPostComposerProps) {
  const { user } = useAuth()
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [isPosting, setIsPosting] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

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

  const handlePost = async () => {
    if (!content.trim() || isOverLimit || isPosting) return

    setIsPosting(true)
    try {
      await onPost({ title, content })
      // Clear draft on successful post
      localStorage.removeItem('post-draft')
      setTitle('')
      setContent('')
    } catch (error) {
      console.error('Failed to post:', error)
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
    <div className="glass-card rounded-2xl p-6">
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <div className="w-12 h-12 bg-gradient-to-br from-cyan-400 to-blue-500 rounded-xl flex items-center justify-center text-white font-bold overflow-hidden">
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
        <h2 className="text-lg font-semibold text-white">
          What's happening, {user?.displayName || 'Penguin'}?
        </h2>
      </div>

      {/* Title Input (Optional) */}
      <input
        type="text"
        placeholder="Post title (optional)"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        className="w-full px-4 py-3 mb-3 rounded-xl bg-white/10 border border-white/20 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-pengu-green focus:border-transparent transition-all"
      />

      {/* Content Textarea */}
      <div className="relative">
        <textarea
          ref={textareaRef}
          placeholder="Share your thoughts with the colony..."
          value={content}
          onChange={(e) => setContent(e.target.value)}
          className={`w-full px-4 py-3 rounded-xl bg-white/10 border text-white placeholder-gray-400 focus:outline-none focus:ring-2 resize-none transition-all ${
            isOverLimit
              ? 'border-red-500 focus:ring-red-500'
              : 'border-white/20 focus:ring-pengu-green focus:border-transparent'
          }`}
          rows={4}
          style={{ minHeight: '120px', maxHeight: '400px' }}
        />

        {/* Character Counter - Bottom Right */}
        <div className="absolute bottom-4 right-4 flex items-center gap-3">
          {/* Circular Progress */}
          <div className="relative w-12 h-12">
            <svg className="w-12 h-12 transform -rotate-90">
              {/* Background circle */}
              <circle
                cx="24"
                cy="24"
                r="18"
                stroke="currentColor"
                strokeWidth="3"
                fill="none"
                className="text-white/10"
              />
              {/* Progress circle */}
              <circle
                cx="24"
                cy="24"
                r="18"
                stroke="currentColor"
                strokeWidth="3"
                fill="none"
                className={`transition-all duration-300 ${
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
                className={`absolute inset-0 flex items-center justify-center text-xs font-bold ${
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
        <p className="text-red-400 text-sm mt-2">
          Character limit exceeded by {Math.abs(charsRemaining)} characters
        </p>
      )}

      {/* Action Buttons */}
      <div className="flex items-center justify-between mt-4 pt-4 border-t border-white/10">
        <div className="flex gap-2">
          {/* Media upload buttons would go here */}
          <button className="p-2 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white transition-colors">
            <span className="text-xl">📸</span>
          </button>
          <button className="p-2 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white transition-colors">
            <span className="text-xl">🎭</span>
          </button>
          <button className="p-2 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white transition-colors">
            <span className="text-xl">😀</span>
          </button>
        </div>

        <div className="flex gap-3">
          {onCancel && (
            <button
              onClick={handleCancel}
              className="px-6 py-2 rounded-xl border border-white/20 text-white hover:bg-white/10 transition-all font-medium"
            >
              Cancel
            </button>
          )}
          <button
            onClick={handlePost}
            disabled={!content.trim() || isOverLimit || isPosting}
            className={`px-6 py-2 rounded-xl font-medium transition-all ${
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
        <p className="text-xs text-gray-500 mt-2">
          Draft auto-saved • {new Date().toLocaleTimeString()}
        </p>
      )}
    </div>
  )
}
