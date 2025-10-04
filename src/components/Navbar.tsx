'use client'

import { useLoginWithAbstract, useAbstractClient } from '@abstract-foundation/agw-react'
import { useState, useEffect, useRef } from 'react'
import { usePathname } from 'next/navigation'
import { useAuth } from '@/providers/AuthProvider'
import UserSearch from './UserSearch'
import ThemeCustomizer from './ThemeCustomizer'
import { performLogout } from '@/lib/utils/logout'

export default function Navbar() {
  const { logout } = useLoginWithAbstract()
  const { data: client } = useAbstractClient()
  const { user, isAuthenticated, oauthSession } = useAuth()
  const pathname = usePathname()
  const [unreadCount, setUnreadCount] = useState(0)
  const [showMoreMenu, setShowMoreMenu] = useState(false)
  const [showUserMenu, setShowUserMenu] = useState(false)
  const [showThemeCustomizer, setShowThemeCustomizer] = useState(false)
  const moreMenuRef = useRef<HTMLDivElement>(null)
  const userMenuRef = useRef<HTMLDivElement>(null)

  const isAdmin = user?.isAdmin || false

  // Close dropdowns when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (moreMenuRef.current && !moreMenuRef.current.contains(event.target as Node)) {
        setShowMoreMenu(false)
      }
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setShowUserMenu(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Fetch unread count when user is authenticated
  useEffect(() => {
    if (user?.id && isAuthenticated) {
      fetchUnreadCount()

      // Set up interval to check for new messages every 30 seconds
      const interval = setInterval(fetchUnreadCount, 30000)
      return () => clearInterval(interval)
    }
  }, [user?.id, isAuthenticated])

  const fetchUnreadCount = async () => {
    // Only fetch if user is properly authenticated and registered
    if (!user?.id) return

    const walletAddress = client?.account?.address || user?.walletAddress
    if (!walletAddress) return

    try {
      const response = await fetch('/api/messages/conversations', {
        headers: {
          'x-wallet-address': walletAddress,
          'x-user-id': user.id
        },
        credentials: 'include' // Include NextAuth cookies
      })

      if (!response.ok) {
        // Don't spam console with 404s if user doesn't have messages yet
        if (response.status !== 404) {
          console.error('Failed to fetch conversations:', response.status)
        }
        return
      }

      const data = await response.json()

      if (data.success && data.data) {
        const totalUnread = data.data.reduce((total: number, conversation: any) =>
          total + (conversation.unreadCount || 0), 0)
        setUnreadCount(totalUnread)
      }
    } catch (error) {
      // Silently fail to avoid console spam
      console.debug('Unread count fetch failed:', error)
    }
  }

  const handleLogout = async () => {
    await performLogout({
      agwLogout: logout,
      redirectTo: '/'
    })
  }

  return (
    <nav className="glass-card-strong border-b border-white/30 sticky top-0 z-50 web3-grid-bg">
      <div className="container mx-auto mobile-padding py-3">
        <div className="flex items-center justify-between gap-4">
          {/* Logo - Compact */}
          <a href="/dashboard" className="flex items-center group hover-glow flex-shrink-0">
            <img src="https://gmgnrepeat.com/icons/pengubookicon1.png" alt="PeBloq" className="w-8 h-8 mr-2 animate-float" />
            <div className="hidden sm:flex flex-col">
              <span className="text-lg font-display font-bold text-gradient">PeBloq</span>
            </div>
          </a>

          {/* Primary Navigation - Condensed */}
          <div className="hidden lg:flex items-center gap-1 flex-1 justify-center">
            <a
              href="/dashboard"
              className="nav-link-compact group relative"
              onClick={(e) => {
                // Prevent navigation if already on dashboard or home
                if (pathname === '/dashboard' || pathname === '/') {
                  e.preventDefault()
                  return
                }
                typeof window !== 'undefined' && sessionStorage.setItem('nav-icon', JSON.stringify({ icon: 'https://gmgnrepeat.com/icons/penguinhome1.png', alt: 'Home' }))
              }}
            >
              <img src="https://gmgnrepeat.com/icons/penguinhome1.png" alt="Home" className="w-[42px] h-[42px] transition-transform duration-200 group-hover:scale-125" />
              <span className="absolute top-full left-1/2 transform -translate-x-1/2 mt-2 px-3 py-1.5 bg-gradient-to-r from-pengu-green to-pengu-600 text-white text-sm font-semibold rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap pointer-events-none shadow-lg z-50">
                Home
              </span>
            </a>
            <a
              href="/feed"
              className="nav-link-compact group relative"
              onClick={(e) => {
                if (pathname === '/feed') { e.preventDefault(); return }
                typeof window !== 'undefined' && sessionStorage.setItem('nav-icon', JSON.stringify({ icon: 'https://gmgnrepeat.com/icons/penguinfeed1.png', alt: 'Feed' }))
              }}
            >
              <img src="https://gmgnrepeat.com/icons/penguinfeed1.png" alt="Feed" className="w-[42px] h-[42px] transition-transform duration-200 group-hover:scale-125" />
              <span className="absolute top-full left-1/2 transform -translate-x-1/2 mt-2 px-3 py-1.5 bg-gradient-to-r from-pengu-green to-pengu-600 text-white text-sm font-semibold rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap pointer-events-none shadow-lg z-50">
                Feed
              </span>
            </a>
            <a
              href="/communities"
              className="nav-link-compact group relative"
              onClick={(e) => {
                if (pathname === '/communities' || pathname.startsWith('/communities/')) { e.preventDefault(); return }
                typeof window !== 'undefined' && sessionStorage.setItem('nav-icon', JSON.stringify({ icon: 'https://gmgnrepeat.com/icons/penguincommunity1.png', alt: 'Communities' }))
              }}
            >
              <img src="https://gmgnrepeat.com/icons/penguincommunity1.png" alt="Communities" className="w-[42px] h-[42px] transition-transform duration-200 group-hover:scale-125" />
              <span className="absolute top-full left-1/2 transform -translate-x-1/2 mt-2 px-3 py-1.5 bg-gradient-to-r from-pengu-green to-pengu-600 text-white text-sm font-semibold rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap pointer-events-none shadow-lg z-50">
                Communities
              </span>
            </a>
            <a
              href="/discover"
              className="nav-link-compact group relative"
              onClick={(e) => {
                if (pathname === '/discover') { e.preventDefault(); return }
                typeof window !== 'undefined' && sessionStorage.setItem('nav-icon', JSON.stringify({ icon: 'https://gmgnrepeat.com/icons/penguindiscover1.png', alt: 'Discover' }))
              }}
            >
              <img src="https://gmgnrepeat.com/icons/penguindiscover1.png" alt="Discover" className="w-[42px] h-[42px] transition-transform duration-200 group-hover:scale-125" />
              <span className="absolute top-full left-1/2 transform -translate-x-1/2 mt-2 px-3 py-1.5 bg-gradient-to-r from-pengu-green to-pengu-600 text-white text-sm font-semibold rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap pointer-events-none shadow-lg z-50">
                Discover
              </span>
            </a>
            <a
              href="/friends"
              className="nav-link-compact group relative"
              onClick={(e) => {
                if (pathname === '/friends') { e.preventDefault(); return }
                typeof window !== 'undefined' && sessionStorage.setItem('nav-icon', JSON.stringify({ icon: 'https://gmgnrepeat.com/icons/penguinfriends1.png', alt: 'Friends' }))
              }}
            >
              <img src="https://gmgnrepeat.com/icons/penguinfriends1.png" alt="Friends" className="w-[42px] h-[42px] transition-transform duration-200 group-hover:scale-125" />
              <span className="absolute top-full left-1/2 transform -translate-x-1/2 mt-2 px-3 py-1.5 bg-gradient-to-r from-pengu-green to-pengu-600 text-white text-sm font-semibold rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap pointer-events-none shadow-lg z-50">
                Friends
              </span>
            </a>
            <a
              href="/messages"
              className="nav-link-compact group relative"
              onClick={(e) => {
                if (pathname === '/messages' || pathname.startsWith('/messages/')) { e.preventDefault(); return }
              }}
            >
              <span className="text-xl">💬</span>
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-gradient-to-r from-pengu-orange to-pengu-green text-white text-xs rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1 animate-pulse shadow-neon-sm">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
              <span className="absolute top-full left-1/2 transform -translate-x-1/2 mt-2 px-3 py-1.5 bg-gradient-to-r from-pengu-green to-pengu-600 text-white text-sm font-semibold rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap pointer-events-none shadow-lg z-50">
                Messages
              </span>
            </a>

            {/* More Menu Dropdown */}
            <div className="relative" ref={moreMenuRef}>
              <button
                onClick={() => setShowMoreMenu(!showMoreMenu)}
                className="nav-link-compact group relative"
              >
                <span className="text-xl">⋯</span>
                <span className="absolute top-full left-1/2 transform -translate-x-1/2 mt-2 px-3 py-1.5 bg-gradient-to-r from-pengu-green to-pengu-600 text-white text-sm font-semibold rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap pointer-events-none shadow-lg z-50">
                  More
                </span>
              </button>

              {showMoreMenu && (
                <div className="absolute top-full right-0 mt-2 w-48 glass-card-strong border border-white/30 rounded-xl shadow-2xl overflow-hidden z-50">
                  <a href="/achievements" className="dropdown-item">
                    <span className="text-lg">🏆</span>
                    <span>Achievements</span>
                  </a>
                  <a href="/levels" className="dropdown-item">
                    <span className="text-lg">⭐</span>
                    <span>Levels</span>
                  </a>
                  <a href="/bookmarks" className="dropdown-item">
                    <span className="text-lg">🔖</span>
                    <span>Bookmarks</span>
                  </a>
                  {isAdmin && (
                    <a href="/admin" className="dropdown-item bg-purple-500/10 border-t border-purple-500/20">
                      <span className="text-lg">👑</span>
                      <span className="text-purple-300 font-semibold">Admin</span>
                    </a>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Search - Hidden on small screens */}
          <div className="hidden md:block flex-shrink-0">
            <UserSearch />
          </div>

          {/* User Menu */}
          {isAuthenticated && user && (
            <div className="relative flex-shrink-0" ref={userMenuRef}>
              <button
                onClick={() => setShowUserMenu(!showUserMenu)}
                className="flex items-center gap-2 glass-card px-3 py-2 hover-lift rounded-lg"
              >
                <div className="flex flex-col items-end">
                  <span className="text-white text-sm font-display font-medium hidden sm:block">
                    {user.displayName || 'Penguin'}
                  </span>
                  {client?.account?.address ? (
                    <span className="text-pengu-green text-xs font-mono hidden sm:block">
                      {client.account.address.slice(0, 4)}...{client.account.address.slice(-3)}
                    </span>
                  ) : user.walletAddress ? (
                    <span className="text-pengu-green text-xs font-mono hidden sm:block">
                      {user.walletAddress.slice(0, 4)}...{user.walletAddress.slice(-3)}
                    </span>
                  ) : null}
                </div>
                <img src="https://gmgnrepeat.com/icons/penguinsilhouette1.png" alt="Profile" className="w-8 h-8" />
              </button>

              {showUserMenu && (
                <div className="absolute top-full right-0 mt-2 w-56 glass-card border border-white/20 rounded-xl shadow-2xl overflow-hidden z-50">
                  <div className="px-4 py-3 border-b border-white/10">
                    <p className="text-white font-semibold">{user.displayName}</p>
                    <p className="text-gray-300 text-sm">Level {user.level}</p>
                  </div>

                  <a href="/profile" className="dropdown-item">
                    <img src="https://gmgnrepeat.com/icons/penguinsilhouette1.png" alt="Profile" className="w-5 h-5" />
                    <span>Profile</span>
                  </a>
                  <a href="/settings" className="dropdown-item">
                    <span className="text-lg">⚙️</span>
                    <span>Settings</span>
                  </a>
                  <button
                    onClick={() => {
                      setShowThemeCustomizer(true)
                      setShowUserMenu(false)
                    }}
                    className="dropdown-item w-full"
                  >
                    <img src="https://gmgnrepeat.com/icons/penguintheme1.png" alt="Themes" className="w-5 h-5" />
                    <span>Themes</span>
                  </button>

                  <div className="border-t border-white/10">
                    <button
                      onClick={handleLogout}
                      className="dropdown-item text-red-300 hover:bg-red-500/20 w-full"
                    >
                      <span className="text-lg">🚪</span>
                      <span>Logout</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Mobile Menu Button (shown on smaller screens) */}
          <button
            onClick={() => setShowMoreMenu(!showMoreMenu)}
            className="lg:hidden nav-link-compact"
          >
            <span className="text-xl">☰</span>
          </button>
        </div>
      </div>

      {/* Add subtle aurora effect */}
      <div className="absolute inset-0 aurora-bg animate-aurora-flow opacity-10 pointer-events-none"></div>

      {/* Theme Customizer Modal */}
      <ThemeCustomizer
        isOpen={showThemeCustomizer}
        onClose={() => setShowThemeCustomizer(false)}
      />
    </nav>
  )
}
