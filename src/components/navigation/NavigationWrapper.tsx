'use client'

import { useState, useEffect } from 'react'
import DesktopNav from './DesktopNav'
import MobileNav from './MobileNav'

const DESKTOP_BREAKPOINT = 1024 // lg: breakpoint

export default function NavigationWrapper() {
  const [isDesktop, setIsDesktop] = useState(false)
  const [isMounted, setIsMounted] = useState(false)

  useEffect(() => {
    setIsMounted(true)

    // Use matchMedia for better performance than resize listener
    const mediaQuery = window.matchMedia(`(min-width: ${DESKTOP_BREAKPOINT}px)`)

    const handleChange = (e: MediaQueryListEvent | MediaQueryList) => {
      setIsDesktop(e.matches)
    }

    // Set initial value
    handleChange(mediaQuery)

    // Listen for changes
    mediaQuery.addEventListener('change', handleChange)

    return () => mediaQuery.removeEventListener('change', handleChange)
  }, [])

  // Prevent hydration mismatch by not rendering until mounted
  if (!isMounted) {
    return null
  }

  return isDesktop ? <DesktopNav /> : <MobileNav />
}
