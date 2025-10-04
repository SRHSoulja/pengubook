'use client'

import { useMemo } from 'react'

/**
 * Hook to get the user's current timezone from their browser
 * This automatically adjusts when they travel or change locations
 */
export function useUserTimezone() {
  const timezone = useMemo(() => {
    try {
      return Intl.DateTimeFormat().resolvedOptions().timeZone
    } catch (error) {
      console.warn('Failed to detect timezone, defaulting to UTC')
      return 'UTC'
    }
  }, [])

  return timezone
}

/**
 * Format a date in the user's current timezone
 */
export function formatInUserTimezone(
  date: Date | string,
  options: Intl.DateTimeFormatOptions = {}
): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date

  const defaultOptions: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    ...options
  }

  try {
    return new Intl.DateTimeFormat('en-US', defaultOptions).format(dateObj)
  } catch (error) {
    console.error('Failed to format date:', error)
    return dateObj.toLocaleString()
  }
}

/**
 * Get relative time string (e.g., "2 hours ago", "just now")
 */
export function getRelativeTime(date: Date | string): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date
  const now = new Date()
  const diffMs = now.getTime() - dateObj.getTime()
  const diffSec = Math.floor(diffMs / 1000)
  const diffMin = Math.floor(diffSec / 60)
  const diffHour = Math.floor(diffMin / 60)
  const diffDay = Math.floor(diffHour / 24)
  const diffWeek = Math.floor(diffDay / 7)
  const diffMonth = Math.floor(diffDay / 30)
  const diffYear = Math.floor(diffDay / 365)

  if (diffSec < 60) return 'just now'
  if (diffMin < 60) return `${diffMin}m ago`
  if (diffHour < 24) return `${diffHour}h ago`
  if (diffDay < 7) return `${diffDay}d ago`
  if (diffWeek < 4) return `${diffWeek}w ago`
  if (diffMonth < 12) return `${diffMonth}mo ago`
  return `${diffYear}y ago`
}

/**
 * Component-friendly hook that returns formatting functions
 */
export function useDateFormatter() {
  const timezone = useUserTimezone()

  return {
    timezone,
    format: formatInUserTimezone,
    relative: getRelativeTime,
  }
}
