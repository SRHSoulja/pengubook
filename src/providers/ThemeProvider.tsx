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
  id: 'classic',
  name: 'Classic Arctic',
  description: 'The original PenguBook experience',
  bgGradient: 'from-blue-900 via-purple-900 to-indigo-900',
  accentColor: 'neon-cyan',
  textColor: 'white',
  glassTint: 'white/10',
  emoji: '🐧'
}

interface ThemeContextType {
  currentTheme: Theme
  setTheme: (theme: Theme) => void
  applyTheme: (theme: Theme) => void
}

const ThemeContext = createContext<ThemeContextType>({
  currentTheme: defaultTheme,
  setTheme: () => {},
  applyTheme: () => {}
})

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [currentTheme, setCurrentTheme] = useState<Theme>(defaultTheme)

  // Load saved theme on mount
  useEffect(() => {
    const savedTheme = localStorage.getItem('pengubook-theme')
    if (savedTheme) {
      try {
        const theme = JSON.parse(savedTheme)
        setCurrentTheme(theme)
        applyThemeToDOM(theme)
      } catch (e) {
        console.error('Failed to parse saved theme')
      }
    }
  }, [])

  const applyThemeToDOM = (theme: Theme) => {
    const root = document.documentElement

    // Apply CSS custom properties for theme
    root.style.setProperty('--theme-bg-gradient', theme.bgGradient)
    root.style.setProperty('--theme-accent-color', theme.accentColor)
    root.style.setProperty('--theme-text-color', theme.textColor)
    root.style.setProperty('--theme-glass-tint', theme.glassTint)

    // Update body class for background
    document.body.className = `bg-gradient-to-br ${theme.bgGradient} web3-grid-bg min-h-screen`
  }

  const setTheme = (theme: Theme) => {
    setCurrentTheme(theme)
    localStorage.setItem('pengubook-theme', JSON.stringify(theme))
    applyThemeToDOM(theme)
  }

  const applyTheme = (theme: Theme) => {
    setTheme(theme)
  }

  return (
    <ThemeContext.Provider value={{ currentTheme, setTheme, applyTheme }}>
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