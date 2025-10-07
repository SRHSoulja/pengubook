'use client'

import { useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { useAuth } from '@/providers/AuthProvider'
import ThemeCustomizer from '@/components/ThemeCustomizer'
import { logout } from '@/lib/utils/logout'

export default function MobileNav() {
  const router = useRouter()
  const pathname = usePathname()
  const { user } = useAuth()
  const [showSearch, setShowSearch] = useState(false)
  const [showThemeCustomizer, setShowThemeCustomizer] = useState(false)

  const handleLogout = async () => {
    await logout()
    router.push('/')
  }

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

      {/* Bottom Tab Navigation - Horizontally Scrollable */}
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-black/90 backdrop-blur-md border-t border-white/10 pb-safe">
        <div className="overflow-x-auto scrollbar-hide">
          <div className="flex items-center px-2 py-2 min-w-max gap-1">
            {/* Home */}
            <button
              onClick={() => router.push('/dashboard')}
              className={`flex flex-col items-center gap-1 p-2 rounded-lg touch-target transition-all duration-200 flex-shrink-0 ${
                pathname === '/dashboard' || pathname === '/'
                  ? 'text-pengu-green bg-pengu-green/10 scale-105 border-b-2 border-pengu-green'
                  : 'text-gray-400 hover:text-white hover:bg-white/5'
              }`}
              aria-label="Home"
            >
              <img
                src="https://gmgnrepeat.com/icons/penguinhome1.png"
                alt=""
                aria-hidden="true"
                className={`w-6 h-6 transition-transform duration-200 ${
                  pathname === '/dashboard' || pathname === '/' ? 'scale-110' : ''
                }`}
              />
              <span className="text-xs font-medium whitespace-nowrap">Home</span>
            </button>

            {/* Feed */}
            <button
              onClick={() => router.push('/feed')}
              className={`flex flex-col items-center gap-1 p-2 rounded-lg touch-target transition-all duration-200 flex-shrink-0 ${
                pathname === '/feed'
                  ? 'text-pengu-green bg-pengu-green/10 scale-105 border-b-2 border-pengu-green'
                  : 'text-gray-400 hover:text-white hover:bg-white/5'
              }`}
              aria-label="Feed"
            >
              <img
                src="https://gmgnrepeat.com/icons/penguinfeed1.png"
                alt=""
                aria-hidden="true"
                className={`w-6 h-6 transition-transform duration-200 ${
                  pathname === '/feed' ? 'scale-110' : ''
                }`}
              />
              <span className="text-xs font-medium whitespace-nowrap">Feed</span>
            </button>

            {/* Communities */}
            <button
              onClick={() => router.push('/communities')}
              className={`flex flex-col items-center gap-1 p-2 rounded-lg touch-target transition-all duration-200 flex-shrink-0 ${
                pathname?.startsWith('/communities')
                  ? 'text-pengu-green bg-pengu-green/10 scale-105 border-b-2 border-pengu-green'
                  : 'text-gray-400 hover:text-white hover:bg-white/5'
              }`}
              aria-label="Communities"
            >
              <img
                src="https://gmgnrepeat.com/icons/penguincommunity1.png"
                alt=""
                aria-hidden="true"
                className={`w-6 h-6 transition-transform duration-200 ${
                  pathname?.startsWith('/communities') ? 'scale-110' : ''
                }`}
              />
              <span className="text-xs font-medium whitespace-nowrap">Communities</span>
            </button>

            {/* Discover */}
            <button
              onClick={() => router.push('/discover')}
              className={`flex flex-col items-center gap-1 p-2 rounded-lg touch-target transition-all duration-200 flex-shrink-0 ${
                pathname?.startsWith('/discover')
                  ? 'text-pengu-green bg-pengu-green/10 scale-105 border-b-2 border-pengu-green'
                  : 'text-gray-400 hover:text-white hover:bg-white/5'
              }`}
              aria-label="Discover"
            >
              <img
                src="https://gmgnrepeat.com/icons/penguindiscover1.png"
                alt=""
                aria-hidden="true"
                className={`w-6 h-6 transition-transform duration-200 ${
                  pathname?.startsWith('/discover') ? 'scale-110' : ''
                }`}
              />
              <span className="text-xs font-medium whitespace-nowrap">Discover</span>
            </button>

            {/* Friends */}
            <button
              onClick={() => router.push('/friends')}
              className={`flex flex-col items-center gap-1 p-2 rounded-lg touch-target transition-all duration-200 flex-shrink-0 ${
                pathname?.startsWith('/friends')
                  ? 'text-pengu-green bg-pengu-green/10 scale-105 border-b-2 border-pengu-green'
                  : 'text-gray-400 hover:text-white hover:bg-white/5'
              }`}
              aria-label="Friends"
            >
              <img
                src="https://gmgnrepeat.com/icons/penguinfriends1.png"
                alt=""
                aria-hidden="true"
                className={`w-6 h-6 transition-transform duration-200 ${
                  pathname?.startsWith('/friends') ? 'scale-110' : ''
                }`}
              />
              <span className="text-xs font-medium whitespace-nowrap">Friends</span>
            </button>

            {/* Messages */}
            <button
              onClick={() => router.push('/messages')}
              className={`flex flex-col items-center gap-1 p-2 rounded-lg touch-target transition-all duration-200 flex-shrink-0 relative ${
                pathname?.startsWith('/messages')
                  ? 'text-pengu-green bg-pengu-green/10 scale-105 border-b-2 border-pengu-green'
                  : 'text-gray-400 hover:text-white hover:bg-white/5'
              }`}
              aria-label="Messages"
            >
              <span className={`text-xl transition-transform duration-200 ${
                pathname?.startsWith('/messages') ? 'scale-110' : ''
              }`}>💬</span>
              <span className="text-xs font-medium whitespace-nowrap">Messages</span>
            </button>

            {/* Bookmarks */}
            <button
              onClick={() => router.push('/bookmarks')}
              className={`flex flex-col items-center gap-1 p-2 rounded-lg touch-target transition-all duration-200 flex-shrink-0 ${
                pathname?.startsWith('/bookmarks')
                  ? 'text-pengu-green bg-pengu-green/10 scale-105 border-b-2 border-pengu-green'
                  : 'text-gray-400 hover:text-white hover:bg-white/5'
              }`}
              aria-label="Bookmarks"
            >
              <span className={`text-xl transition-transform duration-200 ${
                pathname?.startsWith('/bookmarks') ? 'scale-110' : ''
              }`}>🔖</span>
              <span className="text-xs font-medium whitespace-nowrap">Bookmarks</span>
            </button>

            {/* Achievements */}
            <button
              onClick={() => router.push('/achievements')}
              className={`flex flex-col items-center gap-1 p-2 rounded-lg touch-target transition-all duration-200 flex-shrink-0 ${
                pathname?.startsWith('/achievements')
                  ? 'text-pengu-green bg-pengu-green/10 scale-105 border-b-2 border-pengu-green'
                  : 'text-gray-400 hover:text-white hover:bg-white/5'
              }`}
              aria-label="Achievements"
            >
              <span className={`text-xl transition-transform duration-200 ${
                pathname?.startsWith('/achievements') ? 'scale-110' : ''
              }`}>🏆</span>
              <span className="text-xs font-medium whitespace-nowrap">Achievements</span>
            </button>

            {/* Levels */}
            <button
              onClick={() => router.push('/levels')}
              className={`flex flex-col items-center gap-1 p-2 rounded-lg touch-target transition-all duration-200 flex-shrink-0 ${
                pathname?.startsWith('/levels')
                  ? 'text-pengu-green bg-pengu-green/10 scale-105 border-b-2 border-pengu-green'
                  : 'text-gray-400 hover:text-white hover:bg-white/5'
              }`}
              aria-label="Levels"
            >
              <span className={`text-xl transition-transform duration-200 ${
                pathname?.startsWith('/levels') ? 'scale-110' : ''
              }`}>⭐</span>
              <span className="text-xs font-medium whitespace-nowrap">Levels</span>
            </button>

            {/* Settings */}
            <button
              onClick={() => router.push('/settings')}
              className={`flex flex-col items-center gap-1 p-2 rounded-lg touch-target transition-all duration-200 flex-shrink-0 ${
                pathname?.startsWith('/settings')
                  ? 'text-pengu-green bg-pengu-green/10 scale-105 border-b-2 border-pengu-green'
                  : 'text-gray-400 hover:text-white hover:bg-white/5'
              }`}
              aria-label="Settings"
            >
              <span className={`text-xl transition-transform duration-200 ${
                pathname?.startsWith('/settings') ? 'scale-110' : ''
              }`}>⚙️</span>
              <span className="text-xs font-medium whitespace-nowrap">Settings</span>
            </button>

            {/* Themes */}
            <button
              onClick={() => setShowThemeCustomizer(true)}
              className="flex flex-col items-center gap-1 p-2 rounded-lg touch-target transition-all duration-200 flex-shrink-0 text-gray-400 hover:text-white hover:bg-white/5"
              aria-label="Themes"
            >
              <img
                src="https://gmgnrepeat.com/icons/penguintheme1.png"
                alt=""
                aria-hidden="true"
                className="w-6 h-6 transition-transform duration-200"
              />
              <span className="text-xs font-medium whitespace-nowrap">Themes</span>
            </button>

            {/* Profile */}
            <button
              onClick={() => router.push('/profile')}
              className={`flex flex-col items-center gap-1 p-2 rounded-lg touch-target transition-all duration-200 flex-shrink-0 ${
                pathname === '/profile'
                  ? 'text-pengu-green bg-pengu-green/10 scale-105 border-b-2 border-pengu-green'
                  : 'text-gray-400 hover:text-white hover:bg-white/5'
              }`}
              aria-label="Profile"
            >
              <img
                src="https://gmgnrepeat.com/icons/penguinsilhouette1.png"
                alt=""
                aria-hidden="true"
                className={`w-6 h-6 transition-transform duration-200 ${
                  pathname === '/profile' ? 'scale-110' : ''
                }`}
              />
              <span className="text-xs font-medium whitespace-nowrap">Profile</span>
            </button>

            {/* Logout */}
            <button
              onClick={handleLogout}
              className="flex flex-col items-center gap-1 p-2 rounded-lg touch-target transition-all duration-200 flex-shrink-0 text-red-400 hover:text-red-300 hover:bg-red-500/10"
              aria-label="Logout"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              <span className="text-xs font-medium whitespace-nowrap">Logout</span>
            </button>
          </div>
        </div>
      </div>

      {/* Theme Customizer Modal */}
      <ThemeCustomizer
        isOpen={showThemeCustomizer}
        onClose={() => setShowThemeCustomizer(false)}
      />
    </>
  )
}
