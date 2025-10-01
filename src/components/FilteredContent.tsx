'use client'

import { useState } from 'react'
import { getContentFilterSummary } from '@/lib/content-filter'

interface FilteredContentProps {
  children: React.ReactNode
  shouldWarn: boolean
  matchedPhrases: string[]
  contentType?: 'post' | 'comment'
}

export default function FilteredContent({
  children,
  shouldWarn,
  matchedPhrases,
  contentType = 'post'
}: FilteredContentProps) {
  const [isRevealed, setIsRevealed] = useState(false)

  if (!shouldWarn) {
    return <>{children}</>
  }

  if (!isRevealed) {
    return (
      <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4 text-center">
        <div className="flex items-center justify-center mb-3">
          <svg className="w-5 h-5 text-yellow-400 mr-2" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
            <line x1="12" y1="9" x2="12" y2="13" />
            <line x1="12" y1="17" x2="12.01" y2="17" />
          </svg>
          <span className="text-yellow-300 font-medium">Content Warning</span>
        </div>

        <p className="text-yellow-200 text-sm mb-3">
          {getContentFilterSummary(matchedPhrases)}
        </p>

        <button
          onClick={() => setIsRevealed(true)}
          className="bg-yellow-500/20 hover:bg-yellow-500/30 text-yellow-300 px-4 py-2 rounded-lg text-sm border border-yellow-500/50 transition-colors"
        >
          Show {contentType}
        </button>

        <p className="text-yellow-200/70 text-xs mt-2">
          You can manage your muted phrases in Settings
        </p>
      </div>
    )
  }

  return (
    <div>
      <div className="bg-yellow-500/5 border border-yellow-500/20 rounded-lg p-2 mb-3">
        <div className="flex items-center justify-between">
          <span className="text-yellow-300/80 text-xs">
            This {contentType} contains muted content
          </span>
          <button
            onClick={() => setIsRevealed(false)}
            className="text-yellow-400/60 hover:text-yellow-400 text-xs"
          >
            Hide again
          </button>
        </div>
      </div>
      {children}
    </div>
  )
}