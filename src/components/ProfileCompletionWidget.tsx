'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/providers/AuthProvider'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

interface ProfileCompletion {
  percentage: number
  completedFields: string[]
  missingFields: string[]
  totalFields: number
  completedCount: number
}

export default function ProfileCompletionWidget() {
  const { user } = useAuth()
  const router = useRouter()
  const [completion, setCompletion] = useState<ProfileCompletion | null>(null)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    // Check if user dismissed the widget
    const isDismissed = localStorage.getItem('profile-completion-dismissed')
    if (isDismissed) {
      setDismissed(true)
    }

    fetchCompletion()
  }, [user])

  const fetchCompletion = async () => {
    if (!user?.id) return

    try {
      const response = await fetch('/api/profile/completion', {
        headers: {
          'x-user-id': user.id,
          'x-wallet-address': user.walletAddress || ''
        }
      })
      if (response.ok) {
        const data = await response.json()
        setCompletion(data.completion)
      } else {
        console.error('Failed to fetch completion:', await response.text())
      }
    } catch (err) {
      console.error('Failed to fetch profile completion:', err)
    }
  }

  const handleDismiss = () => {
    localStorage.setItem('profile-completion-dismissed', 'true')
    setDismissed(true)
  }

  if (!completion || completion.percentage === 100 || dismissed) {
    return null
  }

  const getColorClass = (percentage: number) => {
    if (percentage >= 80) return 'from-green-500 to-emerald-600'
    if (percentage >= 50) return 'from-yellow-500 to-orange-500'
    return 'from-red-500 to-pink-500'
  }

  const getStatusEmoji = (percentage: number) => {
    if (percentage >= 80) return '🎉'
    if (percentage >= 50) return '👍'
    return '📝'
  }

  return (
    <div className="bg-gradient-to-r from-purple-500/20 to-pink-500/20 border border-purple-500/30 rounded-2xl p-4 md:p-6 mb-4 md:mb-6 relative">
      {/* Dismiss Button */}
      <button
        onClick={handleDismiss}
        className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors"
        aria-label="Dismiss"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>

      <div className="flex items-start gap-3 md:gap-4">
        <div className="text-2xl md:text-4xl">{getStatusEmoji(completion.percentage)}</div>

        <div className="flex-1">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-base md:text-lg font-bold text-white">Complete Your Profile</h3>
            <span className="text-lg md:text-2xl font-bold text-white">{completion.percentage}%</span>
          </div>

          {/* Progress Bar */}
          <div className="w-full bg-white/10 rounded-full h-2 md:h-3 mb-2 md:mb-4 overflow-hidden">
            <div
              className={`h-full bg-gradient-to-r ${getColorClass(completion.percentage)} transition-all duration-500 rounded-full`}
              style={{ width: `${completion.percentage}%` }}
            />
          </div>

          <p className="text-gray-200 text-sm mb-3">
            {completion.completedCount} of {completion.totalFields} fields completed
          </p>

          {/* Missing Fields */}
          {completion.missingFields.length > 0 && (
            <div className="mb-4">
              <p className="text-gray-300 text-sm font-semibold mb-2">Still needed:</p>
              <div className="flex flex-wrap gap-2">
                {completion.missingFields.map((field) => (
                  <span
                    key={field}
                    className="bg-white/10 border border-white/20 px-3 py-1 rounded-lg text-xs text-gray-200"
                  >
                    {field}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* CTA Button */}
          <button
            onClick={() => router.push('/profile/edit')}
            className="inline-flex items-center gap-2 bg-gradient-to-r from-cyan-500 to-blue-500 text-white px-4 py-2 rounded-lg hover:from-cyan-600 hover:to-blue-600 transition-colors font-semibold text-sm cursor-pointer"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
            <span>Complete Profile</span>
          </button>
        </div>
      </div>
    </div>
  )
}
