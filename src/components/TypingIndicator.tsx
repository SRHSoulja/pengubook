'use client'

import { useEffect, useState } from 'react'

interface TypingIndicatorProps {
  typingUsers: string[]
  getUserName: (userId: string) => string
  className?: string
}

export default function TypingIndicator({ typingUsers, getUserName, className = '' }: TypingIndicatorProps) {
  const [dotsAnimation, setDotsAnimation] = useState(0)

  // Animate the typing dots
  useEffect(() => {
    if (typingUsers.length === 0) return

    const interval = setInterval(() => {
      setDotsAnimation(prev => (prev + 1) % 4)
    }, 500)

    return () => clearInterval(interval)
  }, [typingUsers.length])

  if (typingUsers.length === 0) {
    return null
  }

  const formatTypingMessage = () => {
    if (typingUsers.length === 1) {
      return `${getUserName(typingUsers[0])} is typing`
    } else if (typingUsers.length === 2) {
      return `${getUserName(typingUsers[0])} and ${getUserName(typingUsers[1])} are typing`
    } else if (typingUsers.length === 3) {
      return `${getUserName(typingUsers[0])}, ${getUserName(typingUsers[1])}, and ${getUserName(typingUsers[2])} are typing`
    } else {
      return `${getUserName(typingUsers[0])}, ${getUserName(typingUsers[1])}, and ${typingUsers.length - 2} others are typing`
    }
  }

  const getDots = () => {
    return '.'.repeat(dotsAnimation) + ' '.repeat(3 - dotsAnimation)
  }

  return (
    <div className={`flex items-center space-x-2 text-gray-400 text-sm py-2 ${className}`}>
      {/* Typing Animation */}
      <div className="flex space-x-1">
        <div className={`w-2 h-2 bg-cyan-400 rounded-full animate-bounce ${dotsAnimation === 0 ? 'opacity-100' : 'opacity-50'}`}
             style={{ animationDelay: '0ms' }} />
        <div className={`w-2 h-2 bg-cyan-400 rounded-full animate-bounce ${dotsAnimation === 1 ? 'opacity-100' : 'opacity-50'}`}
             style={{ animationDelay: '150ms' }} />
        <div className={`w-2 h-2 bg-cyan-400 rounded-full animate-bounce ${dotsAnimation === 2 ? 'opacity-100' : 'opacity-50'}`}
             style={{ animationDelay: '300ms' }} />
      </div>

      {/* Typing message */}
      <span className="flex-1">
        {formatTypingMessage()}
        <span className="font-mono ml-1 w-4 inline-block">
          {getDots()}
        </span>
      </span>
    </div>
  )
}

// Alternative compact typing indicator for smaller spaces
export function CompactTypingIndicator({ typingUsers, className = '' }: { typingUsers: string[], className?: string }) {
  if (typingUsers.length === 0) return null

  return (
    <div className={`flex items-center space-x-2 text-gray-400 text-xs ${className}`}>
      <div className="flex space-x-1">
        <div className="w-1 h-1 bg-cyan-400 rounded-full animate-pulse" />
        <div className="w-1 h-1 bg-cyan-400 rounded-full animate-pulse" style={{ animationDelay: '200ms' }} />
        <div className="w-1 h-1 bg-cyan-400 rounded-full animate-pulse" style={{ animationDelay: '400ms' }} />
      </div>
      <span>
        {typingUsers.length === 1 ? '1 person' : `${typingUsers.length} people`} typing
      </span>
    </div>
  )
}