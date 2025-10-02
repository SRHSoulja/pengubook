'use client'

import { useEffect, ReactNode } from 'react'
import { useTheme } from '@/providers/ThemeProvider'

export default function ThemeWrapper({ children }: { children: ReactNode }) {
  const { currentTheme } = useTheme()

  useEffect(() => {
    if (typeof window === 'undefined') return

    const root = document.documentElement
    const body = document.body

    // Apply theme CSS variables
    root.style.setProperty('--theme-from', currentTheme.colors.from)
    root.style.setProperty('--theme-via', currentTheme.colors.via)
    root.style.setProperty('--theme-to', currentTheme.colors.to)
    root.style.setProperty('--theme-accent', currentTheme.colors.accent)
    root.style.setProperty('--theme-text', currentTheme.colors.text)
    root.style.setProperty('--theme-glass', currentTheme.colors.glass)

    // Apply theme data attribute
    root.setAttribute('data-theme', currentTheme.id)

    // Apply background gradient to body
    body.style.background = `linear-gradient(135deg, ${currentTheme.colors.from}, ${currentTheme.colors.via}, ${currentTheme.colors.to})`
    body.style.minHeight = '100vh'
    body.style.transition = 'all 0.5s ease'
    body.style.backgroundAttachment = 'fixed'

    // Dispatch custom event for components that need to react
    window.dispatchEvent(new CustomEvent('themeChanged', { detail: currentTheme }))
  }, [currentTheme])

  return <>{children}</>
}
