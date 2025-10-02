'use client'

import { useState, useEffect } from 'react'

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

const penguinEmojis = ['🐧', '🐧💎', '🐧❄️', '🐧🌊', '🐧✨', '🐧🎩', '🐧💙']

export default function PenguinLoadingScreen() {
  const [currentFact, setCurrentFact] = useState(0)
  const [currentEmoji, setCurrentEmoji] = useState(0)
  const [dots, setDots] = useState('')

  useEffect(() => {
    // Rotate through facts every 3 seconds
    const factInterval = setInterval(() => {
      setCurrentFact((prev) => (prev + 1) % funnyPenguinFacts.length)
    }, 3000)

    // Change emoji every 1.5 seconds
    const emojiInterval = setInterval(() => {
      setCurrentEmoji((prev) => (prev + 1) % penguinEmojis.length)
    }, 1500)

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
      clearInterval(emojiInterval)
      clearInterval(dotsInterval)
    }
  }, [])

  return (
    <div className="fixed inset-0 bg-gradient-to-br from-black via-gray-900 to-emerald-900 flex items-center justify-center z-50">
      {/* Animated background elements - Abstract green themed */}
      <div className="absolute inset-0 overflow-hidden">
        {/* Floating gradient orbs - Abstract green colors */}
        <div className="absolute top-20 left-10 w-96 h-96 bg-gradient-to-r from-emerald-500/20 to-green-500/20 rounded-full blur-3xl animate-blob"></div>
        <div className="absolute top-40 right-20 w-80 h-80 bg-gradient-to-r from-green-500/15 to-emerald-500/15 rounded-full blur-3xl animate-blob animation-delay-2000"></div>
        <div className="absolute bottom-20 left-1/3 w-72 h-72 bg-gradient-to-r from-emerald-400/20 to-cyan-500/20 rounded-full blur-3xl animate-blob animation-delay-4000"></div>

        {/* Grid overlay */}
        <div className="absolute inset-0 web3-grid-bg opacity-30"></div>
      </div>

      <div className="relative z-10 text-center space-y-8 max-w-2xl px-8">
        {/* Main penguin animation */}
        <div className="relative">
          <div className="text-8xl animate-bounce">
            {penguinEmojis[currentEmoji]}
          </div>
          <div className="absolute -bottom-4 left-1/2 transform -translate-x-1/2">
            <div className="flex space-x-1">
              <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse"></div>
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" style={{ animationDelay: '0.2s' }}></div>
              <div className="w-2 h-2 bg-cyan-400 rounded-full animate-pulse" style={{ animationDelay: '0.4s' }}></div>
            </div>
          </div>
        </div>

        {/* Title */}
        <div>
          <h1 className="text-4xl font-bold text-white mb-2">
            Connecting to the Colony{dots}
          </h1>
          <p className="text-emerald-200 text-lg">
            Waddling through the Abstract network...
          </p>
        </div>

        {/* Fun fact */}
        <div className="bg-white/10 backdrop-blur-lg rounded-2xl border border-emerald-500/30 p-6">
          <h3 className="text-emerald-300 font-semibold mb-3 text-lg">
            🧠 Penguin Fun Fact
          </h3>
          <p className="text-white text-base leading-relaxed">
            {funnyPenguinFacts[currentFact]}
          </p>
        </div>

        {/* Loading progress */}
        <div className="space-y-3">
          <div className="flex items-center justify-center space-x-2 text-emerald-300">
            <div className="w-3 h-3 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin"></div>
            <span className="text-sm font-medium">Setting up your Abstract Global Wallet connection</span>
          </div>

          <div className="w-full bg-white/10 rounded-full h-2">
            <div className="bg-gradient-to-r from-emerald-500 to-green-500 h-2 rounded-full animate-pulse w-3/4"></div>
          </div>
        </div>

        {/* Fun penguin activities */}
        <div className="grid grid-cols-3 gap-4 text-center">
          <div className="bg-white/5 rounded-xl p-4 border border-emerald-500/20">
            <div className="text-2xl mb-2">🏊‍♂️</div>
            <div className="text-xs text-emerald-200">Swimming through blocks</div>
          </div>
          <div className="bg-white/5 rounded-xl p-4 border border-green-500/20">
            <div className="text-2xl mb-2">🔐</div>
            <div className="text-xs text-emerald-200">Encrypting fish data</div>
          </div>
          <div className="bg-white/5 rounded-xl p-4 border border-cyan-500/20">
            <div className="text-2xl mb-2">🌐</div>
            <div className="text-xs text-emerald-200">Syncing with colony</div>
          </div>
        </div>
      </div>
    </div>
  )
}