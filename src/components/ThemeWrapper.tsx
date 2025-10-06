'use client'

import { useEffect, ReactNode } from 'react'
import { usePathname } from 'next/navigation'
import { useTheme } from '@/providers/ThemeProvider'

export default function ThemeWrapper({ children }: { children: ReactNode }) {
  const { currentTheme } = useTheme()
  const pathname = usePathname()

  useEffect(() => {
    if (typeof window === 'undefined') return

    const root = document.documentElement
    const body = document.body

    // Check if we're on the landing page - landing page keeps its custom background
    const isLandingPage = pathname === '/'

    // Apply theme CSS variables (always apply for components to use)
    root.style.setProperty('--theme-from', currentTheme.colors.from)
    root.style.setProperty('--theme-via', currentTheme.colors.via)
    root.style.setProperty('--theme-to', currentTheme.colors.to)
    root.style.setProperty('--theme-accent', currentTheme.colors.accent)
    root.style.setProperty('--theme-text', currentTheme.colors.text)
    root.style.setProperty('--theme-glass', currentTheme.colors.glass)

    // Apply theme data attribute
    root.setAttribute('data-theme', currentTheme.id)

    // Only apply background gradient to body if NOT on landing page
    if (!isLandingPage) {
      body.style.background = `linear-gradient(135deg, ${currentTheme.colors.from}, ${currentTheme.colors.via}, ${currentTheme.colors.to})`
      body.style.minHeight = '100vh'
      body.style.transition = 'all 0.5s ease'
      body.style.backgroundAttachment = 'fixed'
    }

    // Dispatch custom event for components that need to react
    window.dispatchEvent(new CustomEvent('themeChanged', { detail: currentTheme }))
  }, [currentTheme, pathname])

  return <>{children}</>
}
