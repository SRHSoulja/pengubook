'use client'

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'

interface Theme {
  id: string
  name: string
  description: string
  bgGradient: string
  accentColor: string
  textColor: string
  glassTint: string
  emoji: string
}

const defaultTheme: Theme = {
  id: 'abstract-green',
  name: 'Abstract Green',
  description: 'The official Abstract protocol theme',
  bgGradient: 'from-gray-900 via-green-900 to-emerald-900',
  accentColor: 'emerald-400',
  textColor: 'white',
  glassTint: 'emerald-500/10',
  emoji: '🟢'
}

interface ThemeContextType {
  currentTheme: Theme
  setTheme: (theme: Theme) => void
  applyTheme: (theme: Theme) => void
  themeKey: string
}

const ThemeContext = createContext<ThemeContextType>({
  currentTheme: defaultTheme,
  setTheme: () => {},
  applyTheme: () => {},
  themeKey: 'default'
})

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [currentTheme, setCurrentTheme] = useState<Theme>(defaultTheme)
  const [themeKey, setThemeKey] = useState<string>('default')

  // Load saved theme on mount
  useEffect(() => {
    const savedTheme = localStorage.getItem('pengubook-theme')
    if (savedTheme) {
      try {
        const theme = JSON.parse(savedTheme)
        setCurrentTheme(theme)
      } catch (e) {
        console.error('Failed to parse saved theme')
      }
    }
  }, [])

  // Apply theme whenever currentTheme changes
  useEffect(() => {
    applyThemeToDOM(currentTheme)
  }, [currentTheme])

  const applyThemeToDOM = (theme: Theme) => {
    if (typeof window === 'undefined') return

    const root = document.documentElement

    // Force immediate re-render by updating a data attribute
    root.setAttribute('data-theme', theme.id)

    // Update body class to force background changes immediately
    document.body.className = `bg-gradient-to-br ${theme.bgGradient} min-h-screen transition-all duration-500`

    // Also trigger a custom event for components to listen to
    window.dispatchEvent(new CustomEvent('themeChanged', { detail: theme }))
  }

  const setTheme = (theme: Theme) => {
    setCurrentTheme(theme)
    setThemeKey(`${theme.id}-${Date.now()}`) // Force re-render
    localStorage.setItem('pengubook-theme', JSON.stringify(theme))
  }

  const applyTheme = (theme: Theme) => {
    setTheme(theme)
  }

  return (
    <ThemeContext.Provider value={{ currentTheme, setTheme, applyTheme, themeKey }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  const context = useContext(ThemeContext)
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider')
  }
  return context
}