'use client'

import { useState, useEffect } from 'react'
import { useTheme } from '@/providers/ThemeProvider'

interface ThemeCustomizerProps {
  isOpen: boolean
  onClose: () => void
}

export default function ThemeCustomizer({ isOpen, onClose }: ThemeCustomizerProps) {
  const { currentTheme, predefinedThemes, applyTheme } = useTheme()
  const [selectedTheme, setSelectedTheme] = useState(currentTheme)
  const [customFromColor, setCustomFromColor] = useState('#1e1b4b')
  const [customViaColor, setCustomViaColor] = useState('#7c2d12')
  const [customToColor, setCustomToColor] = useState('#312e81')
  const [customAccent, setCustomAccent] = useState('#00ffff')

  useEffect(() => {
    setSelectedTheme(currentTheme)
  }, [currentTheme])

  const handleApplyTheme = (theme: typeof currentTheme) => {
    setSelectedTheme(theme)
    applyTheme(theme)
  }

  const createCustomTheme = () => {
    const customTheme = {
      id: 'custom',
      name: 'Custom Theme',
      description: 'Your personal creation',
      colors: {
        from: customFromColor,
        via: customViaColor,
        to: customToColor,
        accent: customAccent,
        text: '#ffffff',
        glass: 'rgba(255, 255, 255, 0.1)'
      },
      emoji: '🎨'
    }
    handleApplyTheme(customTheme)
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
                onClick={() => handleApplyTheme(theme)}
                className={`relative glass-card hover-lift click-scale cursor-pointer p-4 transition-all ${
                  selectedTheme.id === theme.id ? 'ring-2 ring-cyan-400 shadow-lg shadow-cyan-400/20' : ''
                }`}
              >
                {/* Theme Preview */}
                <div
                  className="h-24 rounded-lg mb-3 relative overflow-hidden"
                  style={{
                    background: `linear-gradient(135deg, ${theme.colors.from}, ${theme.colors.via}, ${theme.colors.to})`
                  }}
                >
                  <div
                    className="absolute inset-0 backdrop-blur-sm"
                    style={{ backgroundColor: theme.colors.glass }}
                  ></div>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-2xl animate-float">{theme.emoji}</span>
                  </div>
                  <div className="absolute top-2 right-2">
                    <div
                      className="w-3 h-3 rounded-full animate-pulse"
                      style={{ backgroundColor: theme.colors.accent }}
                    ></div>
                  </div>
                </div>

                {/* Theme Info */}
                <div className="space-y-1">
                  <h4 className="font-display font-semibold text-white">{theme.name}</h4>
                  <p className="text-xs text-gray-400">{theme.description}</p>
                </div>

                {/* Selected indicator */}
                {selectedTheme.id === theme.id && (
                  <div className="absolute top-2 left-2 bg-cyan-400 text-black rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold">
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
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    From Color
                  </label>
                  <input
                    type="color"
                    value={customFromColor}
                    onChange={(e) => setCustomFromColor(e.target.value)}
                    className="w-full h-10 rounded cursor-pointer"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Via Color
                  </label>
                  <input
                    type="color"
                    value={customViaColor}
                    onChange={(e) => setCustomViaColor(e.target.value)}
                    className="w-full h-10 rounded cursor-pointer"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    To Color
                  </label>
                  <input
                    type="color"
                    value={customToColor}
                    onChange={(e) => setCustomToColor(e.target.value)}
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
                  background: `linear-gradient(135deg, ${customFromColor}, ${customViaColor}, ${customToColor})`
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
                onClick={createCustomTheme}
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