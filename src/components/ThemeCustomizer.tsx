'use client'

import { useState, useEffect } from 'react'

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

const predefinedThemes: Theme[] = [
  {
    id: 'classic',
    name: 'Classic Arctic',
    description: 'The original PenguBook experience',
    bgGradient: 'from-blue-900 via-purple-900 to-indigo-900',
    accentColor: 'neon-cyan',
    textColor: 'white',
    glassTint: 'white/10',
    emoji: '🐧'
  },
  {
    id: 'cyber-punk',
    name: 'Cyber Punk',
    description: 'Matrix-inspired dark theme',
    bgGradient: 'from-black via-gray-900 to-gray-800',
    accentColor: 'neon-green',
    textColor: 'neon-green',
    glassTint: 'green-500/10',
    emoji: '🤖'
  },
  {
    id: 'aurora',
    name: 'Aurora Borealis',
    description: 'Northern lights vibes',
    bgGradient: 'from-purple-900 via-blue-900 to-green-900',
    accentColor: 'neon-pink',
    textColor: 'white',
    glassTint: 'purple-500/10',
    emoji: '🌌'
  },
  {
    id: 'sunset',
    name: 'Digital Sunset',
    description: 'Warm orange and pink tones',
    bgGradient: 'from-orange-900 via-red-900 to-pink-900',
    accentColor: 'neon-yellow',
    textColor: 'white',
    glassTint: 'orange-500/10',
    emoji: '🌅'
  },
  {
    id: 'ocean',
    name: 'Deep Ocean',
    description: 'Mysterious blue depths',
    bgGradient: 'from-blue-950 via-cyan-900 to-teal-900',
    accentColor: 'neon-cyan',
    textColor: 'white',
    glassTint: 'cyan-500/10',
    emoji: '🌊'
  },
  {
    id: 'neon-city',
    name: 'Neon City',
    description: 'Vibrant cyberpunk aesthetics',
    bgGradient: 'from-indigo-900 via-purple-900 to-pink-900',
    accentColor: 'neon-purple',
    textColor: 'white',
    glassTint: 'pink-500/10',
    emoji: '🏙️'
  }
]

interface ThemeCustomizerProps {
  isOpen: boolean
  onClose: () => void
  onThemeChange: (theme: Theme) => void
}

export default function ThemeCustomizer({ isOpen, onClose, onThemeChange }: ThemeCustomizerProps) {
  const [selectedTheme, setSelectedTheme] = useState<Theme>(predefinedThemes[0])
  const [customBgColor1, setCustomBgColor1] = useState('#1e1b4b')
  const [customBgColor2, setCustomBgColor2] = useState('#7c2d12')
  const [customAccent, setCustomAccent] = useState('#00ffff')

  useEffect(() => {
    // Load saved theme from localStorage
    const savedTheme = localStorage.getItem('pengubook-theme')
    if (savedTheme) {
      try {
        const theme = JSON.parse(savedTheme)
        setSelectedTheme(theme)
      } catch (e) {
        console.error('Failed to parse saved theme')
      }
    }
  }, [])

  const applyTheme = (theme: Theme) => {
    setSelectedTheme(theme)
    onThemeChange(theme)
    localStorage.setItem('pengubook-theme', JSON.stringify(theme))
  }

  const createCustomTheme = (): Theme => {
    return {
      id: 'custom',
      name: 'Custom Theme',
      description: 'Your personal creation',
      bgGradient: `from-[${customBgColor1}] to-[${customBgColor2}]`,
      accentColor: customAccent,
      textColor: 'white',
      glassTint: 'white/10',
      emoji: '🎨'
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="glass-card-strong max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-white/20">
          <div className="flex items-center space-x-3">
            <span className="text-2xl animate-float">🎨</span>
            <div>
              <h2 className="text-2xl font-display font-bold text-gradient">Theme Customizer</h2>
              <p className="text-gray-400">Personalize your PenguBook experience</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="cyber-button bg-gradient-to-r from-red-500/20 to-red-600/20 border-red-400/50 text-red-300"
          >
            ✕ Close
          </button>
        </div>

        {/* Theme Grid */}
        <div className="p-6">
          <h3 className="text-lg font-display font-semibold text-white mb-4">Predefined Themes</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
            {predefinedThemes.map((theme) => (
              <div
                key={theme.id}
                onClick={() => applyTheme(theme)}
                className={`relative glass-card hover-lift click-scale cursor-pointer p-4 transition-all ${
                  selectedTheme.id === theme.id ? 'ring-2 ring-neon-cyan shadow-neon' : ''
                }`}
              >
                {/* Theme Preview */}
                <div className={`h-24 rounded-lg bg-gradient-to-br ${theme.bgGradient} mb-3 relative overflow-hidden`}>
                  <div className={`absolute inset-0 bg-${theme.glassTint} backdrop-blur-sm`}></div>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-2xl animate-float">{theme.emoji}</span>
                  </div>
                  <div className="absolute top-2 right-2">
                    <div className={`w-3 h-3 bg-${theme.accentColor} rounded-full animate-pulse`}></div>
                  </div>
                </div>

                {/* Theme Info */}
                <div className="space-y-1">
                  <h4 className="font-display font-semibold text-white">{theme.name}</h4>
                  <p className="text-xs text-gray-400">{theme.description}</p>
                </div>

                {/* Selected indicator */}
                {selectedTheme.id === theme.id && (
                  <div className="absolute top-2 left-2 bg-neon-cyan text-black rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold">
                    ✓
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Custom Theme Creator */}
          <div className="border-t border-white/20 pt-6">
            <h3 className="text-lg font-display font-semibold text-white mb-4">Create Custom Theme</h3>
            <div className="glass-card p-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Background Color 1
                  </label>
                  <input
                    type="color"
                    value={customBgColor1}
                    onChange={(e) => setCustomBgColor1(e.target.value)}
                    className="w-full h-10 rounded cursor-pointer"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Background Color 2
                  </label>
                  <input
                    type="color"
                    value={customBgColor2}
                    onChange={(e) => setCustomBgColor2(e.target.value)}
                    className="w-full h-10 rounded cursor-pointer"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Accent Color
                  </label>
                  <input
                    type="color"
                    value={customAccent}
                    onChange={(e) => setCustomAccent(e.target.value)}
                    className="w-full h-10 rounded cursor-pointer"
                  />
                </div>
              </div>

              {/* Custom Theme Preview */}
              <div
                className="h-32 rounded-lg mb-4 relative overflow-hidden"
                style={{
                  background: `linear-gradient(135deg, ${customBgColor1}, ${customBgColor2})`
                }}
              >
                <div className="absolute inset-0 bg-white/10 backdrop-blur-sm"></div>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-3xl animate-float">🎨</span>
                </div>
                <div
                  className="absolute top-4 right-4 w-4 h-4 rounded-full animate-pulse"
                  style={{ backgroundColor: customAccent }}
                ></div>
              </div>

              <button
                onClick={() => applyTheme(createCustomTheme())}
                className="w-full cyber-button bg-gradient-to-r from-purple-500/20 to-pink-500/20 border-purple-400/50 text-purple-300"
              >
                🎨 Apply Custom Theme
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}