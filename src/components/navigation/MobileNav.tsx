'use client'

import { useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { useAuth } from '@/providers/AuthProvider'

export default function MobileNav() {
  const router = useRouter()
  const pathname = usePathname()
  const { user } = useAuth()
  const [showSearch, setShowSearch] = useState(false)

  return (
    <>
      {/* Top Bar - Minimal */}
      <nav className="glass-card-strong border-b border-white/30 sticky top-0 z-50 web3-grid-bg">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            {/* Logo */}
            <button
              onClick={() => router.push('/dashboard')}
              className="flex items-center gap-2 touch-target"
              aria-label="Go to home"
            >
              <img
                src="https://gmgnrepeat.com/icons/pengubookicon1.png"
                alt="PeBloq"
                className="w-8 h-8"
              />
              <span className="text-lg font-display font-bold text-gradient">
                PeBloq
              </span>
            </button>

            {/* Search Icon */}
            <button
              onClick={() => setShowSearch(!showSearch)}
              className="p-2 rounded-lg hover:bg-white/10 touch-target transition-colors duration-150"
              aria-label="Search"
            >
              <span className="text-xl">🔍</span>
            </button>
          </div>

          {/* Search Bar - Expandable */}
          {showSearch && (
            <div className="mt-3 animate-in slide-in-from-top-2 duration-200">
              <input
                type="text"
                placeholder="Search penguins..."
                className="w-full px-4 py-2 rounded-lg bg-white/10 border border-white/20 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-pengu-green"
                autoFocus
              />
            </div>
          )}
        </div>

        {/* Aurora effect */}
        <div className="absolute inset-0 aurora-bg animate-aurora-flow opacity-10 pointer-events-none"></div>
      </nav>

      {/* Bottom Tab Navigation */}
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-black/90 backdrop-blur-md border-t border-white/10 pb-safe">
        <div className="flex items-center justify-around px-2 py-2">
          {/* Home */}
          <button
            onClick={() => router.push('/dashboard')}
            className={`flex flex-col items-center gap-1 p-2 rounded-lg touch-target transition-all duration-150 ${
              pathname === '/dashboard' || pathname === '/'
                ? 'text-pengu-green'
                : 'text-gray-400 hover:text-white'
            }`}
            aria-label="Home"
          >
            <img
              src="https://gmgnrepeat.com/icons/penguinhome1.png"
              alt=""
              aria-hidden="true"
              className="w-6 h-6"
            />
            <span className="text-xs font-medium">Home</span>
          </button>

          {/* Feed */}
          <button
            onClick={() => router.push('/feed')}
            className={`flex flex-col items-center gap-1 p-2 rounded-lg touch-target transition-all duration-150 ${
              pathname === '/feed'
                ? 'text-pengu-green'
                : 'text-gray-400 hover:text-white'
            }`}
            aria-label="Feed"
          >
            <img
              src="https://gmgnrepeat.com/icons/penguinfeed1.png"
              alt=""
              aria-hidden="true"
              className="w-6 h-6"
            />
            <span className="text-xs font-medium">Feed</span>
          </button>

          {/* Communities */}
          <button
            onClick={() => router.push('/communities')}
            className={`flex flex-col items-center gap-1 p-2 rounded-lg touch-target transition-all duration-150 ${
              pathname?.startsWith('/communities')
                ? 'text-pengu-green'
                : 'text-gray-400 hover:text-white'
            }`}
            aria-label="Communities"
          >
            <img
              src="https://gmgnrepeat.com/icons/penguincommunity1.png"
              alt=""
              aria-hidden="true"
              className="w-6 h-6"
            />
            <span className="text-xs font-medium">Communities</span>
          </button>

          {/* Messages */}
          <button
            onClick={() => router.push('/messages')}
            className={`flex flex-col items-center gap-1 p-2 rounded-lg touch-target transition-all duration-150 relative ${
              pathname?.startsWith('/messages')
                ? 'text-pengu-green'
                : 'text-gray-400 hover:text-white'
            }`}
            aria-label="Messages"
          >
            <span className="text-xl">💬</span>
            <span className="text-xs font-medium">Messages</span>
          </button>

          {/* Profile */}
          <button
            onClick={() => router.push('/profile')}
            className={`flex flex-col items-center gap-1 p-2 rounded-lg touch-target transition-all duration-150 ${
              pathname === '/profile'
                ? 'text-pengu-green'
                : 'text-gray-400 hover:text-white'
            }`}
            aria-label="Profile"
          >
            <img
              src="https://gmgnrepeat.com/icons/penguinsilhouette1.png"
              alt=""
              aria-hidden="true"
              className="w-6 h-6"
            />
            <span className="text-xs font-medium">Profile</span>
          </button>
        </div>
      </div>
    </>
  )
}
