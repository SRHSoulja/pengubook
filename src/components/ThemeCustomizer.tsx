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

  const handleSaveAndClose = () => {
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/80 backdrop-blur-md"
        onClick={onClose}
      ></div>

      {/* Modal Container */}
      <div className="relative z-[101] bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 border border-white/20 rounded-2xl shadow-2xl w-full max-w-5xl max-h-[90vh] sm:max-h-[85vh] flex flex-col my-auto">

        {/* Header */}
        <div className="flex-shrink-0 bg-gradient-to-r from-purple-900/80 to-cyan-900/80 backdrop-blur-xl border-b border-white/20 rounded-t-2xl px-4 sm:px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-9 h-9 sm:w-10 sm:h-10 bg-gradient-to-br from-purple-500 to-cyan-500 rounded-lg flex items-center justify-center flex-shrink-0">
                <img src="https://gmgnrepeat.com/icons/penguintheme1.png" alt="Theme" className="w-5 h-5 sm:w-6 sm:h-6" />
              </div>
              <div>
                <h2 className="text-lg sm:text-xl font-bold text-white">Theme Customizer</h2>
                <p className="text-xs text-gray-300 hidden sm:block">Choose or create your perfect theme</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg bg-white/5 hover:bg-white/10 border border-white/20 flex items-center justify-center text-gray-300 hover:text-white transition-all flex-shrink-0"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4 sm:py-6">

          {/* Predefined Themes */}
          <div className="mb-10">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-white">Predefined Themes</h3>
              <span className="text-sm text-gray-400">{predefinedThemes.length} themes available</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {predefinedThemes.map((theme) => (
                <button
                  key={theme.id}
                  onClick={() => handleApplyTheme(theme)}
                  className={`group relative bg-white/5 hover:bg-white/10 border rounded-2xl p-4 transition-all duration-300 text-left ${
                    selectedTheme.id === theme.id
                      ? 'border-cyan-400 ring-2 ring-cyan-400/50 shadow-lg shadow-cyan-400/25'
                      : 'border-white/10 hover:border-white/30'
                  }`}
                >
                  {/* Theme Preview */}
                  <div
                    className="h-28 rounded-xl mb-3 relative overflow-hidden shadow-lg"
                    style={{
                      background: `linear-gradient(135deg, ${theme.colors.from}, ${theme.colors.via}, ${theme.colors.to})`
                    }}
                  >
                    <div className="absolute inset-0 bg-white/5 backdrop-blur-sm"></div>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-3xl drop-shadow-lg">{theme.emoji}</span>
                    </div>
                    <div className="absolute top-3 right-3">
                      <div
                        className="w-4 h-4 rounded-full shadow-lg"
                        style={{ backgroundColor: theme.colors.accent }}
                      ></div>
                    </div>
                  </div>

                  {/* Theme Info */}
                  <div>
                    <h4 className="font-semibold text-white mb-1">{theme.name}</h4>
                    <p className="text-xs text-gray-400 line-clamp-1">{theme.description}</p>
                  </div>

                  {/* Selected Indicator */}
                  {selectedTheme.id === theme.id && (
                    <div className="absolute top-3 left-3 bg-cyan-400 text-gray-900 rounded-full w-7 h-7 flex items-center justify-center text-sm font-bold shadow-lg">
                      ✓
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Custom Theme Creator */}
          <div className="border-t border-white/20 pt-8">
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-white mb-1">Create Custom Theme</h3>
              <p className="text-sm text-gray-400">Design your own unique color scheme</p>
            </div>

            <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
              {/* Color Pickers */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-3">
                    Start Color
                  </label>
                  <div className="relative">
                    <input
                      type="color"
                      value={customFromColor}
                      onChange={(e) => setCustomFromColor(e.target.value)}
                      className="w-full h-12 rounded-xl cursor-pointer border-2 border-white/20"
                    />
                    <div className="mt-2 text-xs text-center font-mono text-gray-400">{customFromColor}</div>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-3">
                    Middle Color
                  </label>
                  <div className="relative">
                    <input
                      type="color"
                      value={customViaColor}
                      onChange={(e) => setCustomViaColor(e.target.value)}
                      className="w-full h-12 rounded-xl cursor-pointer border-2 border-white/20"
                    />
                    <div className="mt-2 text-xs text-center font-mono text-gray-400">{customViaColor}</div>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-3">
                    End Color
                  </label>
                  <div className="relative">
                    <input
                      type="color"
                      value={customToColor}
                      onChange={(e) => setCustomToColor(e.target.value)}
                      className="w-full h-12 rounded-xl cursor-pointer border-2 border-white/20"
                    />
                    <div className="mt-2 text-xs text-center font-mono text-gray-400">{customToColor}</div>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-3">
                    Accent Color
                  </label>
                  <div className="relative">
                    <input
                      type="color"
                      value={customAccent}
                      onChange={(e) => setCustomAccent(e.target.value)}
                      className="w-full h-12 rounded-xl cursor-pointer border-2 border-white/20"
                    />
                    <div className="mt-2 text-xs text-center font-mono text-gray-400">{customAccent}</div>
                  </div>
                </div>
              </div>

              {/* Live Preview */}
              <div
                className="h-40 rounded-2xl mb-6 relative overflow-hidden shadow-2xl"
                style={{
                  background: `linear-gradient(135deg, ${customFromColor}, ${customViaColor}, ${customToColor})`
                }}
              >
                <div className="absolute inset-0 bg-white/5 backdrop-blur-sm"></div>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <img src="https://gmgnrepeat.com/icons/penguintheme1.png" alt="Theme" className="w-12 h-12 mb-3" />
                  <div className="text-white font-semibold">Live Preview</div>
                  <div className="text-sm text-white/70">Your custom theme</div>
                </div>
                <div
                  className="absolute top-5 right-5 w-6 h-6 rounded-full shadow-lg animate-pulse"
                  style={{ backgroundColor: customAccent }}
                ></div>
              </div>

              <button
                onClick={createCustomTheme}
                className="w-full bg-gradient-to-r from-purple-600 to-cyan-600 hover:from-purple-500 hover:to-cyan-500 text-white font-semibold py-4 rounded-xl transition-all duration-300 shadow-lg hover:shadow-xl hover:scale-[1.02] active:scale-[0.98]"
              >
                Apply Custom Theme
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex-shrink-0 bg-gradient-to-r from-gray-900 to-gray-800 border-t border-white/20 rounded-b-2xl px-4 sm:px-6 py-3 sm:py-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center space-x-2 text-xs sm:text-sm text-gray-400">
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
              <span className="hidden sm:inline">Theme applied instantly</span>
              <span className="sm:hidden">Live preview</span>
            </div>
            <button
              onClick={handleSaveAndClose}
              className="bg-gradient-to-r from-emerald-600 to-cyan-600 hover:from-emerald-500 hover:to-cyan-500 text-white font-semibold px-4 sm:px-6 py-2 sm:py-2.5 rounded-xl transition-all duration-300 shadow-lg hover:shadow-xl hover:scale-[1.02] active:scale-[0.98] text-sm sm:text-base"
            >
              Save & Close
            </button>
          </div>
        </div>

      </div>
    </div>
  )
}