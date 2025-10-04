'use client'

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'

interface Theme {
  id: string
  name: string
  description: string
  colors: {
    from: string
    via: string
    to: string
    accent: string
    text: string
    glass: string
  }
  emoji: string
}

const predefinedThemes: Theme[] = [
  {
    id: 'abstract-green',
    name: 'Abstract Green',
    description: 'The official Abstract protocol theme',
    colors: {
      from: '#111827', // gray-900
      via: '#064e3b',  // green-900
      to: '#065f46',   // emerald-900
      accent: '#10b981',
      text: '#ffffff',
      glass: 'rgba(16, 185, 129, 0.1)'
    },
    emoji: '🟢'
  },
  {
    id: 'classic',
    name: 'Classic Arctic',
    description: 'The original PeBloq experience',
    colors: {
      from: '#1e3a8a', // blue-900
      via: '#581c87',  // purple-900
      to: '#312e81',   // indigo-900
      accent: '#00ffff',
      text: '#ffffff',
      glass: 'rgba(255, 255, 255, 0.1)'
    },
    emoji: '🐧'
  },
  {
    id: 'cyber-punk',
    name: 'Cyber Punk',
    description: 'Matrix-inspired dark theme',
    colors: {
      from: '#000000',
      via: '#111827',  // gray-900
      to: '#1f2937',   // gray-800
      accent: '#00ff41',
      text: '#00ff41',
      glass: 'rgba(0, 255, 65, 0.1)'
    },
    emoji: '🤖'
  },
  {
    id: 'aurora',
    name: 'Aurora Borealis',
    description: 'Northern lights vibes',
    colors: {
      from: '#581c87', // purple-900
      via: '#1e3a8a',  // blue-900
      to: '#064e3b',   // green-900
      accent: '#ff1493',
      text: '#ffffff',
      glass: 'rgba(147, 51, 234, 0.1)'
    },
    emoji: '🌌'
  },
  {
    id: 'sunset',
    name: 'Digital Sunset',
    description: 'Warm orange and pink tones',
    colors: {
      from: '#9a3412', // orange-900
      via: '#7f1d1d',  // red-900
      to: '#831843',   // pink-900
      accent: '#ffff00',
      text: '#ffffff',
      glass: 'rgba(249, 115, 22, 0.1)'
    },
    emoji: '🌅'
  },
  {
    id: 'ocean',
    name: 'Deep Ocean',
    description: 'Mysterious blue depths',
    colors: {
      from: '#172554', // blue-950
      via: '#164e63',  // cyan-900
      to: '#134e4a',   // teal-900
      accent: '#00ffff',
      text: '#ffffff',
      glass: 'rgba(6, 182, 212, 0.1)'
    },
    emoji: '🌊'
  },
  {
    id: 'neon-city',
    name: 'Neon City',
    description: 'Vibrant cyberpunk aesthetics',
    colors: {
      from: '#312e81', // indigo-900
      via: '#581c87',  // purple-900
      to: '#831843',   // pink-900
      accent: '#8a2be2',
      text: '#ffffff',
      glass: 'rgba(236, 72, 153, 0.1)'
    },
    emoji: '🏙️'
  }
]

const defaultTheme: Theme = predefinedThemes[0] // Abstract Green

interface ThemeContextType {
  currentTheme: Theme
  predefinedThemes: Theme[]
  customThemes: Theme[]
  setTheme: (theme: Theme) => void
  applyTheme: (theme: Theme) => void
  saveCustomTheme: (theme: Theme, slotIndex: number) => void
  deleteCustomTheme: (slotIndex: number) => void
  themeKey: string
}

const ThemeContext = createContext<ThemeContextType>({
  currentTheme: defaultTheme,
  predefinedThemes,
  customThemes: [],
  setTheme: () => {},
  applyTheme: () => {},
  saveCustomTheme: () => {},
  deleteCustomTheme: () => {},
  themeKey: 'default'
})

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [currentTheme, setCurrentTheme] = useState<Theme>(defaultTheme)
  const [themeKey, setThemeKey] = useState<string>('default')
  const [customThemes, setCustomThemes] = useState<Theme[]>([])

  // Load saved theme and custom themes on mount
  useEffect(() => {
    const savedTheme = localStorage.getItem('pengubook-theme')
    if (savedTheme) {
      try {
        const theme = JSON.parse(savedTheme)
        // Find the theme in predefinedThemes or use as custom
        const foundTheme = predefinedThemes.find(t => t.id === theme.id) || theme
        setCurrentTheme(foundTheme)
      } catch (e) {
        console.error('Failed to parse saved theme')
      }
    }

    // Load custom themes from localStorage
    const savedCustomThemes = localStorage.getItem('pengubook-custom-themes')
    if (savedCustomThemes) {
      try {
        const themes = JSON.parse(savedCustomThemes)
        setCustomThemes(themes)
      } catch (e) {
        console.error('Failed to parse custom themes')
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

    // Apply CSS custom properties for the theme
    root.style.setProperty('--theme-from', theme.colors.from)
    root.style.setProperty('--theme-via', theme.colors.via)
    root.style.setProperty('--theme-to', theme.colors.to)
    root.style.setProperty('--theme-accent', theme.colors.accent)
    root.style.setProperty('--theme-text', theme.colors.text)
    root.style.setProperty('--theme-glass', theme.colors.glass)

    // Force immediate re-render by updating a data attribute
    root.setAttribute('data-theme', theme.id)

    // Update body with inline style for immediate effect
    document.body.style.background = `linear-gradient(135deg, ${theme.colors.from}, ${theme.colors.via}, ${theme.colors.to})`
    document.body.style.minHeight = '100vh'
    document.body.style.transition = 'all 0.5s ease'

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

  const saveCustomTheme = (theme: Theme, slotIndex: number) => {
    // Create a copy of custom themes array with 3 slots
    const newCustomThemes = [...customThemes]

    // Ensure we have 3 slots (fill with null if needed)
    while (newCustomThemes.length < 3) {
      newCustomThemes.push({
        id: `custom-${newCustomThemes.length}`,
        name: 'Empty Slot',
        description: 'No custom theme saved',
        colors: { from: '#1e1b4b', via: '#7c2d12', to: '#312e81', accent: '#00ffff', text: '#ffffff', glass: 'rgba(255, 255, 255, 0.1)' },
        emoji: '➕'
      })
    }

    // Update the specific slot
    newCustomThemes[slotIndex] = {
      ...theme,
      id: `custom-${slotIndex}`
    }

    setCustomThemes(newCustomThemes)
    localStorage.setItem('pengubook-custom-themes', JSON.stringify(newCustomThemes))
  }

  const deleteCustomTheme = (slotIndex: number) => {
    const newCustomThemes = [...customThemes]

    // Reset the slot to empty
    newCustomThemes[slotIndex] = {
      id: `custom-${slotIndex}`,
      name: 'Empty Slot',
      description: 'No custom theme saved',
      colors: { from: '#1e1b4b', via: '#7c2d12', to: '#312e81', accent: '#00ffff', text: '#ffffff', glass: 'rgba(255, 255, 255, 0.1)' },
      emoji: '➕'
    }

    setCustomThemes(newCustomThemes)
    localStorage.setItem('pengubook-custom-themes', JSON.stringify(newCustomThemes))
  }

  return (
    <ThemeContext.Provider value={{ currentTheme, predefinedThemes, customThemes, setTheme, applyTheme, saveCustomTheme, deleteCustomTheme, themeKey }}>
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