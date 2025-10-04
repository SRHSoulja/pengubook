'use client'

import { useState } from 'react'

interface NSFWBlurOverlayProps {
  contentWarnings: string[] // Array of warning labels like ["Explicit Nudity", "Violence"]
  children: React.ReactNode // The blurred content
  autoShow?: boolean // User preference to auto-show ALL NSFW
  allowedCategories?: string[] // User's allowed NSFW categories (granular control)
}

export default function NSFWBlurOverlay({
  contentWarnings,
  children,
  autoShow = false,
  allowedCategories = []
}: NSFWBlurOverlayProps) {
  // Check if user's allowed categories cover all content warnings
  const shouldAutoShow = autoShow || (
    allowedCategories.length > 0 &&
    contentWarnings.every(warning => allowedCategories.includes(warning))
  )

  const [revealed, setRevealed] = useState(shouldAutoShow)

  // If user has auto-show enabled OR all categories are allowed, render normally
  if (shouldAutoShow) {
    return <>{children}</>
  }

  // If user clicked to reveal, show content without blur
  if (revealed) {
    return (
      <div className="relative">
        {children}
        <div className="mt-2 text-center">
          <button
            onClick={() => setRevealed(false)}
            className="text-xs text-gray-400 hover:text-gray-300 underline"
          >
            Hide NSFW Content
          </button>
        </div>
      </div>
    )
  }

  // Show blurred content with warning
  return (
    <div className="relative">
      {/* Blurred background content */}
      <div className="blur-3xl opacity-50 pointer-events-none">
        {children}
      </div>

      {/* Warning overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-red-900/40 via-black/60 to-orange-900/40 backdrop-blur-2xl rounded-lg flex flex-col items-center justify-center p-6 border-2 border-red-500/30">
        {/* Warning icon */}
        <div className="text-6xl mb-4 animate-pulse">⚠️</div>

        {/* NSFW badge */}
        <div className="bg-red-600 text-white px-4 py-2 rounded-full font-bold text-lg mb-3 shadow-lg">
          NSFW CONTENT
        </div>

        {/* Content warnings */}
        {contentWarnings.length > 0 && (
          <div className="mb-4 text-center">
            <p className="text-sm text-gray-300 mb-2">This content contains:</p>
            <div className="flex flex-wrap gap-2 justify-center">
              {contentWarnings.map((warning, index) => (
                <span
                  key={index}
                  className="bg-orange-600/80 text-white px-3 py-1 rounded-lg text-xs font-semibold shadow-md"
                >
                  {warning}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Description */}
        <p className="text-gray-300 text-sm text-center mb-4 max-w-md">
          This content has been flagged as Not Safe For Work (NSFW) by AI moderation.
          Click below to reveal.
        </p>

        {/* Reveal button */}
        <button
          onClick={() => setRevealed(true)}
          className="bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white px-6 py-3 rounded-xl font-bold transition-all transform hover:scale-105 shadow-lg"
        >
          View NSFW Content
        </button>

        {/* Settings hint */}
        <p className="text-xs text-gray-400 mt-4">
          You can enable auto-show in your{' '}
          <a href="/profile/edit" className="text-cyan-400 hover:underline">
            settings
          </a>
        </p>
      </div>
    </div>
  )
}
