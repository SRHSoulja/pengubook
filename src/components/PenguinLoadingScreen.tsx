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
    <div className="fixed inset-0 bg-gradient-to-br from-blue-900 via-purple-900 to-indigo-900 flex items-center justify-center z-50">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-20 left-20 text-6xl animate-bounce opacity-20">❄️</div>
        <div className="absolute top-40 right-32 text-4xl animate-pulse opacity-30">🌊</div>
        <div className="absolute bottom-32 left-40 text-5xl animate-bounce opacity-25" style={{ animationDelay: '1s' }}>💎</div>
        <div className="absolute bottom-20 right-20 text-3xl animate-pulse opacity-20" style={{ animationDelay: '0.5s' }}>✨</div>
      </div>

      <div className="text-center space-y-8 max-w-2xl px-8">
        {/* Main penguin animation */}
        <div className="relative">
          <div className="text-8xl animate-bounce">
            {penguinEmojis[currentEmoji]}
          </div>
          <div className="absolute -bottom-4 left-1/2 transform -translate-x-1/2">
            <div className="flex space-x-1">
              <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"></div>
              <div className="w-2 h-2 bg-purple-400 rounded-full animate-pulse" style={{ animationDelay: '0.2s' }}></div>
              <div className="w-2 h-2 bg-indigo-400 rounded-full animate-pulse" style={{ animationDelay: '0.4s' }}></div>
            </div>
          </div>
        </div>

        {/* Title */}
        <div>
          <h1 className="text-4xl font-bold text-white mb-2">
            Connecting to the Colony{dots}
          </h1>
          <p className="text-blue-200 text-lg">
            Waddling through the Abstract network...
          </p>
        </div>

        {/* Fun fact */}
        <div className="bg-white/10 backdrop-blur-lg rounded-2xl border border-white/20 p-6">
          <h3 className="text-cyan-300 font-semibold mb-3 text-lg">
            🧠 Penguin Fun Fact
          </h3>
          <p className="text-white text-base leading-relaxed">
            {funnyPenguinFacts[currentFact]}
          </p>
        </div>

        {/* Loading progress */}
        <div className="space-y-3">
          <div className="flex items-center justify-center space-x-2 text-blue-300">
            <div className="w-3 h-3 border-2 border-blue-400 border-t-transparent rounded-full animate-spin"></div>
            <span className="text-sm font-medium">Setting up your Abstract Global Wallet connection</span>
          </div>

          <div className="w-full bg-white/10 rounded-full h-2">
            <div className="bg-gradient-to-r from-blue-500 to-purple-500 h-2 rounded-full animate-pulse w-3/4"></div>
          </div>
        </div>

        {/* Fun penguin activities */}
        <div className="grid grid-cols-3 gap-4 text-center">
          <div className="bg-white/5 rounded-xl p-4">
            <div className="text-2xl mb-2">🏊‍♂️</div>
            <div className="text-xs text-blue-200">Swimming through blocks</div>
          </div>
          <div className="bg-white/5 rounded-xl p-4">
            <div className="text-2xl mb-2">🔐</div>
            <div className="text-xs text-blue-200">Encrypting fish data</div>
          </div>
          <div className="bg-white/5 rounded-xl p-4">
            <div className="text-2xl mb-2">🌐</div>
            <div className="text-xs text-blue-200">Syncing with colony</div>
          </div>
        </div>
      </div>
    </div>
  )
}