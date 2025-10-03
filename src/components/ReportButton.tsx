'use client'

import { useState } from 'react'
import { useAuth } from '@/providers/AuthProvider'

interface ReportButtonProps {
  targetId?: string      // For reporting users
  postId?: string        // For reporting posts
  commentId?: string     // For reporting comments
  messageId?: string     // For reporting messages
  targetName?: string    // Display name of what's being reported
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

const reportReasons = [
  { value: 'SPAM', label: 'Spam or unwanted content' },
  { value: 'HARASSMENT', label: 'Harassment or bullying' },
  { value: 'INAPPROPRIATE_CONTENT', label: 'Inappropriate or offensive content' },
  { value: 'COPYRIGHT', label: 'Copyright violation' },
  { value: 'IMPERSONATION', label: 'Impersonation or fake account' },
  { value: 'VIOLENCE', label: 'Violence or dangerous content' },
  { value: 'HATE_SPEECH', label: 'Hate speech or discrimination' },
  { value: 'SELF_HARM', label: 'Self-harm or suicide content' },
  { value: 'FALSE_INFORMATION', label: 'False or misleading information' },
  { value: 'OTHER', label: 'Other violation' }
]

export default function ReportButton({
  targetId,
  postId,
  commentId,
  messageId,
  targetName,
  size = 'md',
  className = ''
}: ReportButtonProps) {
  const { user } = useAuth()
  const [showModal, setShowModal] = useState(false)
  const [reason, setReason] = useState('')
  const [description, setDescription] = useState('')
  const [loading, setLoading] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState('')

  const sizeClasses = {
    sm: 'w-4 h-4 p-1 text-xs',
    md: 'w-5 h-5 p-1.5 text-sm',
    lg: 'w-6 h-6 p-2 text-base'
  }

  const handleSubmitReport = async () => {
    if (!reason || loading) return

    setLoading(true)
    setError('')

    try {
      const response = await fetch('/api/reports', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-wallet-address': user?.walletAddress || ''
        },
        body: JSON.stringify({
          targetId,
          postId,
          commentId,
          messageId,
          reason,
          description: description.trim() || null
        })
      })

      const data = await response.json()

      if (response.ok) {
        setSubmitted(true)
        setTimeout(() => {
          setShowModal(false)
          setSubmitted(false)
          setReason('')
          setDescription('')
        }, 2000)
      } else {
        setError(data.error || 'Failed to submit report')
      }
    } catch (err) {
      console.error('Error submitting report:', err)
      setError('Error submitting report')
    } finally {
      setLoading(false)
    }
  }

  if (!user) return null

  // Don't allow reporting yourself
  if (targetId === user.id) return null

  return (
    <>
      <button
        onClick={() => setShowModal(true)}
        className={`
          ${sizeClasses[size]}
          text-gray-400 hover:text-red-400 transition-colors duration-200
          rounded-full hover:bg-red-400/10 flex items-center space-x-1
          ${className}
        `}
        title="Report this content"
      >
        <svg
          className={`${size === 'sm' ? 'w-4 h-4' : size === 'md' ? 'w-5 h-5' : 'w-6 h-6'}`}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <path d="M3 3l18 18M12 3l8 8-8 8M4 11l8 8" />
        </svg>
      </button>

      {showModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-black/90 backdrop-blur-lg border border-white/20 rounded-2xl p-6 w-96 max-w-md">
            {submitted ? (
              <div className="text-center">
                <div className="text-4xl mb-4">✅</div>
                <h3 className="text-lg font-semibold mb-2 text-white">Report Submitted</h3>
                <p className="text-gray-300 text-sm">
                  Thank you for helping keep our community safe. We'll review this report.
                </p>
              </div>
            ) : (
              <>
                <h3 className="text-lg font-semibold mb-4 text-white">
                  Report {postId ? 'Post' : commentId ? 'Comment' : messageId ? 'Message' : 'User'}
                  {targetName && (
                    <span className="text-gray-400 text-sm block">
                      {targetName}
                    </span>
                  )}
                </h3>

                {error && (
                  <div className="mb-4 p-3 bg-red-500/20 border border-red-500/50 rounded-lg text-red-300 text-sm">
                    {error}
                  </div>
                )}

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-2 text-gray-300">
                      Why are you reporting this?
                    </label>
                    <select
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                      className="w-full bg-black/30 border border-white/20 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-red-400"
                    >
                      <option value="">Select a reason...</option>
                      {reportReasons.map((r) => (
                        <option key={r.value} value={r.value} className="bg-gray-800">
                          {r.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2 text-gray-300">
                      Additional details (optional)
                    </label>
                    <textarea
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Provide any additional context that might help our moderation team..."
                      rows={3}
                      maxLength={500}
                      className="w-full bg-black/30 border border-white/20 rounded-lg px-3 py-2 text-white placeholder-gray-400 focus:outline-none focus:border-red-400 resize-none"
                    />
                    <div className="text-xs text-gray-400 mt-1">
                      {description.length}/500 characters
                    </div>
                  </div>
                </div>

                <div className="flex space-x-3 mt-6">
                  <button
                    onClick={() => setShowModal(false)}
                    disabled={loading}
                    className="flex-1 bg-gray-500/20 text-gray-300 border border-gray-500/50 py-2 rounded-lg hover:bg-gray-500/30 transition-colors disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSubmitReport}
                    disabled={!reason || loading}
                    className="flex-1 bg-red-500 text-white py-2 rounded-lg hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {loading ? 'Submitting...' : 'Submit Report'}
                  </button>
                </div>

                <div className="mt-4 text-xs text-gray-400 text-center">
                  Reports are reviewed by our moderation team and appropriate action will be taken.
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  )
}