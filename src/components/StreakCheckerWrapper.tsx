'use client'

import { useStreakChecker } from '@/hooks/useStreakChecker'

/**
 * Wrapper component that includes the streak checker hook
 * This should be placed in the app layout to run globally
 */
export default function StreakCheckerWrapper() {
  useStreakChecker()
  return null
}
