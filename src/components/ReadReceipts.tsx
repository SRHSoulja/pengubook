'use client'

import { useState, useEffect } from 'react'

interface ReadReceiptUser {
  id: string
  displayName: string
  avatar?: string
  readAt: Date
}

interface ReadReceiptsProps {
  messageId: string
  readBy: ReadReceiptUser[]
  currentUserId: string
  maxAvatars?: number
  showNames?: boolean
  className?: string
}

export default function ReadReceipts({
  messageId,
  readBy,
  currentUserId,
  maxAvatars = 3,
  showNames = false,
  className = ''
}: ReadReceiptsProps) {
  const [showFullList, setShowFullList] = useState(false)

  // Filter out current user from read receipts
  const otherReaders = readBy.filter(user => user.id !== currentUserId)

  if (otherReaders.length === 0) {
    return null
  }

  const visibleReaders = otherReaders.slice(0, maxAvatars)
  const remainingCount = Math.max(0, otherReaders.length - maxAvatars)

  const formatReadTime = (readAt: Date) => {
    const now = new Date()
    const diffMs = now.getTime() - readAt.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    if (diffDays < 7) return `${diffDays}d ago`
    return readAt.toLocaleDateString()
  }

  return (
    <div className={`flex items-center space-x-1 ${className}`}>
      {/* Avatar Stack */}
      <div className="flex -space-x-1">
        {visibleReaders.map((reader, index) => (
          <div
            key={reader.id}
            className="relative group"
            style={{ zIndex: visibleReaders.length - index }}
          >
            <div className="w-4 h-4 rounded-full border border-gray-600 overflow-hidden bg-gradient-to-br from-cyan-400 to-blue-500">
              {reader.avatar ? (
                <img
                  src={reader.avatar}
                  alt={reader.displayName}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-white text-xs font-bold">
                  {reader.displayName.charAt(0).toUpperCase()}
                </div>
              )}
            </div>

            {/* Hover tooltip */}
            <div className="absolute bottom-full mb-2 left-1/2 transform -translate-x-1/2 bg-black/90 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50">
              {reader.displayName}
              <br />
              Read {formatReadTime(reader.readAt)}
            </div>
          </div>
        ))}

        {/* Remaining count indicator */}
        {remainingCount > 0 && (
          <div
            className="w-4 h-4 rounded-full bg-gray-600 border border-gray-500 flex items-center justify-center cursor-pointer hover:bg-gray-500 transition-colors"
            onClick={() => setShowFullList(true)}
          >
            <span className="text-white text-xs font-bold">
              +{remainingCount}
            </span>
          </div>
        )}
      </div>

      {/* Read status text */}
      {showNames && (
        <span className="text-gray-400 text-xs">
          {otherReaders.length === 1
            ? `Read by ${otherReaders[0].displayName}`
            : `Read by ${otherReaders.length} people`
          }
        </span>
      )}

      {/* Full list modal */}
      {showFullList && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowFullList(false)} />
          <div className="relative bg-gray-800 rounded-lg p-6 max-w-sm w-full max-h-96 overflow-y-auto">
            <h3 className="text-white font-semibold mb-4">Read by {otherReaders.length} people</h3>
            <div className="space-y-3">
              {otherReaders.map((reader) => (
                <div key={reader.id} className="flex items-center space-x-3">
                  <div className="w-8 h-8 rounded-full overflow-hidden bg-gradient-to-br from-cyan-400 to-blue-500">
                    {reader.avatar ? (
                      <img
                        src={reader.avatar}
                        alt={reader.displayName}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-white text-sm font-bold">
                        {reader.displayName.charAt(0).toUpperCase()}
                      </div>
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="text-white font-medium">{reader.displayName}</div>
                    <div className="text-gray-400 text-sm">
                      Read {formatReadTime(reader.readAt)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <button
              onClick={() => setShowFullList(false)}
              className="mt-4 w-full px-4 py-2 bg-cyan-600 text-white rounded-lg hover:bg-cyan-700 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// Simple checkmark indicator for single read receipt
export function SimpleReadReceipt({
  isRead,
  readAt,
  className = ''
}: {
  isRead: boolean
  readAt?: Date
  className?: string
}) {
  if (!isRead) {
    return (
      <div className={`w-4 h-4 flex items-center justify-center ${className}`}>
        <div className="w-2 h-2 rounded-full border border-gray-500" />
      </div>
    )
  }

  return (
    <div className={`w-4 h-4 flex items-center justify-center text-cyan-400 ${className}`}>
      <svg
        className="w-3 h-3"
        fill="currentColor"
        viewBox="0 0 20 20"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          fillRule="evenodd"
          d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
          clipRule="evenodd"
        />
      </svg>
    </div>
  )
}

// Double checkmark for delivered/read status
export function DeliveryStatus({
  status,
  className = ''
}: {
  status: 'sending' | 'delivered' | 'read'
  className?: string
}) {
  return (
    <div className={`flex items-center space-x-px ${className}`}>
      {status === 'sending' && (
        <div className="w-3 h-3 border border-gray-500 border-t-cyan-400 rounded-full animate-spin" />
      )}

      {status === 'delivered' && (
        <div className="flex space-x-px text-gray-400">
          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
              clipRule="evenodd"
            />
          </svg>
          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
              clipRule="evenodd"
            />
          </svg>
        </div>
      )}

      {status === 'read' && (
        <div className="flex space-x-px text-cyan-400">
          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
              clipRule="evenodd"
            />
          </svg>
          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
              clipRule="evenodd"
            />
          </svg>
        </div>
      )}
    </div>
  )
}