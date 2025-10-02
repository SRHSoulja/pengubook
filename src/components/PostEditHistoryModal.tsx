'use client'

import { useState, useEffect } from 'react'

interface PostEdit {
  id: string
  content: string
  editedAt: string
  reason: string | null
}

interface PostEditHistoryModalProps {
  postId: string
  isOpen: boolean
  onClose: () => void
}

export default function PostEditHistoryModal({
  postId,
  isOpen,
  onClose
}: PostEditHistoryModalProps) {
  const [edits, setEdits] = useState<PostEdit[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (isOpen && postId) {
      fetchEditHistory()
    }
  }, [isOpen, postId])

  const fetchEditHistory = async () => {
    try {
      setLoading(true)
      setError('')

      const response = await fetch(`/api/posts/${postId}/edits`)
      const data = await response.json()

      if (response.ok) {
        setEdits(data.edits || [])
      } else {
        setError(data.error || 'Failed to fetch edit history')
      }
    } catch (err) {
      console.error('Error fetching edit history:', err)
      setError('Failed to fetch edit history')
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    })
  }

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-gradient-to-br from-gray-900 to-gray-800 border border-white/20 rounded-2xl p-6 max-w-2xl w-full max-h-[80vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-bold text-white">Edit History</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="text-center py-8">
              <div className="w-8 h-8 border-4 border-cyan-400 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-gray-400">Loading edit history...</p>
            </div>
          ) : error ? (
            <div className="text-center py-8">
              <p className="text-red-400">{error}</p>
            </div>
          ) : edits.length === 0 ? (
            <div className="text-center py-8">
              <div className="text-4xl mb-2">📝</div>
              <p className="text-gray-400">No edit history</p>
              <p className="text-sm text-gray-500 mt-2">This post hasn't been edited yet</p>
            </div>
          ) : (
            <div className="space-y-4">
              {edits.map((edit, index) => (
                <div
                  key={edit.id}
                  className="bg-gray-700/30 rounded-lg p-4 border border-white/10"
                >
                  {/* Edit timestamp */}
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-cyan-400">
                        {index === 0 ? 'Latest Version' : `Edit ${edits.length - index}`}
                      </span>
                      {index === 0 && (
                        <span className="text-xs bg-cyan-500/20 text-cyan-400 px-2 py-0.5 rounded-full">
                          Current
                        </span>
                      )}
                    </div>
                    <span className="text-xs text-gray-500">
                      {formatDate(edit.editedAt)}
                    </span>
                  </div>

                  {/* Edit reason */}
                  {edit.reason && (
                    <div className="mb-3 text-sm">
                      <span className="text-gray-400">Reason: </span>
                      <span className="text-yellow-400 italic">{edit.reason}</span>
                    </div>
                  )}

                  {/* Content */}
                  <div className="bg-black/20 rounded-lg p-3">
                    <p className="text-white whitespace-pre-wrap break-words">
                      {edit.content}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer info */}
        {!loading && !error && edits.length > 0 && (
          <div className="mt-4 pt-4 border-t border-white/10">
            <p className="text-xs text-gray-500 text-center">
              Showing {edits.length} {edits.length === 1 ? 'version' : 'versions'} of this post
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
