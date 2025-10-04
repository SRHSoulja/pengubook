'use client'

import { useState, useEffect } from 'react'
import { useTheme } from '@/providers/ThemeProvider'

const funnyPenguinFacts = [
  "Did you know penguins have a gland above their eyes that filters salt from seawater? 🧂",
  "Emperor penguins can hold their breath for over 20 minutes! 🫁",
  "Penguins have excellent hearing and can recognize their mate's call among thousands! 👂",
  "A group of penguins on land is called a 'waddle' and in water it's a 'raft'! 🛟",
  "Penguins can't fly, but they can 'fly' underwater at speeds up to 22 mph! ✈️",
  "Penguins have been around for over 60 million years! 🦕",
  "Some penguins can leap 6-9 feet out of the water! 🚀",
  "Penguins are basically the tuxedo-wearing comedians of the animal kingdom! 🤵",
  "Penguins slide on their bellies to move faster on ice - it's called 'tobogganing'! 🛷",
  "The tallest penguin ever discovered was 6.8 feet tall! 📏"
]

interface PenguinLoadingScreenProps {
  icon?: string
  iconAlt?: string
}

export default function PenguinLoadingScreen({ icon, iconAlt }: PenguinLoadingScreenProps) {
  const { currentTheme } = useTheme()
  const [currentFact, setCurrentFact] = useState(0)
  const [dots, setDots] = useState('')
  const [navIcon, setNavIcon] = useState<{ icon: string; alt: string } | null>(null)

  useEffect(() => {
    // Try to get the nav icon from sessionStorage
    if (typeof window !== 'undefined') {
      const storedIcon = sessionStorage.getItem('nav-icon')
      if (storedIcon) {
        try {
          setNavIcon(JSON.parse(storedIcon))
          // Clear it so it doesn't persist
          sessionStorage.removeItem('nav-icon')
        } catch (e) {
          console.error('Failed to parse nav icon', e)
        }
      }
    }
  }, [])

  // Only use nav icon or passed icon - no fallback to main logo
  const displayIcon = navIcon?.icon || icon
  const displayIconAlt = navIcon?.alt || iconAlt || 'Loading'

  useEffect(() => {
    // Rotate through facts every 3 seconds
    const factInterval = setInterval(() => {
      setCurrentFact((prev) => (prev + 1) % funnyPenguinFacts.length)
    }, 3000)

    // Animate dots
    const dotsInterval = setInterval(() => {
      setDots(prev => {
        if (prev === '') return '.'
        if (prev === '.') return '..'
        if (prev === '..') return '...'
        return ''
      })
    }, 500)

    return () => {
      clearInterval(factInterval)
      clearInterval(dotsInterval)
    }
  }, [])

  return (
    <div
      className="fixed inset-0 flex items-center justify-center z-50 transition-all duration-500"
      style={{ background: `linear-gradient(135deg, ${currentTheme.colors.from}, ${currentTheme.colors.via}, ${currentTheme.colors.to})` }}
    >
      {/* Animated background elements - Abstract green themed */}
      <div className="absolute inset-0 overflow-hidden">
        {/* Floating gradient orbs - Theme colored */}
        <div className="absolute top-20 left-10 w-96 h-96 rounded-full blur-3xl animate-blob" style={{ background: `linear-gradient(to right, ${currentTheme.colors.from}20, ${currentTheme.colors.via}20)` }}></div>
        <div className="absolute top-40 right-20 w-80 h-80 rounded-full blur-3xl animate-blob animation-delay-2000" style={{ background: `linear-gradient(to right, ${currentTheme.colors.via}15, ${currentTheme.colors.to}15)` }}></div>
        <div className="absolute bottom-20 left-1/3 w-72 h-72 rounded-full blur-3xl animate-blob animation-delay-4000" style={{ background: `linear-gradient(to right, ${currentTheme.colors.from}20, ${currentTheme.colors.to}20)` }}></div>

        {/* Grid overlay */}
        <div className="absolute inset-0 web3-grid-bg opacity-30"></div>
      </div>

      <div className="relative z-10 text-center space-y-8 max-w-2xl px-8">
        {/* Main penguin animation - only show if we have a custom icon */}
        {displayIcon && (
          <div className="relative">
            <div className="flex justify-center animate-bounce">
              <img src={displayIcon} alt={displayIconAlt} className="w-48 h-48 drop-shadow-2xl" />
            </div>
            <div className="absolute -bottom-4 left-1/2 transform -translate-x-1/2">
              <div className="flex space-x-1">
                <div className="w-2 h-2 bg-white/60 rounded-full animate-pulse"></div>
                <div className="w-2 h-2 bg-white/60 rounded-full animate-pulse" style={{ animationDelay: '0.2s' }}></div>
                <div className="w-2 h-2 bg-white/60 rounded-full animate-pulse" style={{ animationDelay: '0.4s' }}></div>
              </div>
            </div>
          </div>
        )}

        {/* Title */}
        <div>
          <h1 className="text-4xl font-bold text-white mb-2">
            Connecting to the Colony{dots}
          </h1>
          <p className="text-white/80 text-lg">
            Waddling through the Abstract network...
          </p>
        </div>

        {/* Fun fact */}
        <div className="bg-white/10 backdrop-blur-lg rounded-2xl border border-white/20 p-6">
          <h3 className="text-white/90 font-semibold mb-3 text-lg">
            🧠 Penguin Fun Fact
          </h3>
          <p className="text-white text-base leading-relaxed">
            {funnyPenguinFacts[currentFact]}
          </p>
        </div>

        {/* Loading progress */}
        <div className="space-y-3">
          <div className="flex items-center justify-center space-x-2 text-white/80">
            <div className="w-3 h-3 border-2 border-white/60 border-t-transparent rounded-full animate-spin"></div>
            <span className="text-sm font-medium">Setting up your Abstract Global Wallet connection</span>
          </div>

          <div className="w-full bg-white/10 rounded-full h-2">
            <div className="h-2 rounded-full animate-pulse w-3/4" style={{ background: `linear-gradient(to right, ${currentTheme.colors.from}, ${currentTheme.colors.to})` }}></div>
          </div>
        </div>

        {/* Fun penguin activities */}
        <div className="grid grid-cols-3 gap-4 text-center">
          <div className="bg-white/5 rounded-xl p-4 border border-white/20">
            <div className="text-2xl mb-2">🏊‍♂️</div>
            <div className="text-xs text-white/70">Swimming through blocks</div>
          </div>
          <div className="bg-white/5 rounded-xl p-4 border border-white/20">
            <div className="text-2xl mb-2">🔐</div>
            <div className="text-xs text-white/70">Encrypting fish data</div>
          </div>
          <div className="bg-white/5 rounded-xl p-4 border border-white/20">
            <div className="text-2xl mb-2">🌐</div>
            <div className="text-xs text-white/70">Syncing with colony</div>
          </div>
        </div>
      </div>
    </div>
  )
}