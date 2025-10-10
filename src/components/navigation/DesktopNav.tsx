'use client'

import { useLoginWithAbstract, useAbstractClient } from '@abstract-foundation/agw-react'
import { useState, useEffect, useRef } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { useAuth } from '@/providers/AuthProvider'
import UserSearch from '@/components/UserSearch'
import ThemeCustomizer from '@/components/ThemeCustomizer'
import NotificationCenter from '@/components/NotificationCenter'
import { performLogout } from '@/lib/utils/logout'

export default function DesktopNav() {
  const { logout } = useLoginWithAbstract()
  const { data: client } = useAbstractClient()
  const { user, isAuthenticated } = useAuth()
  const pathname = usePathname()
  const router = useRouter()
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

      const interval = setInterval(fetchUnreadCount, 30000)
      return () => clearInterval(interval)
    }
  }, [user?.id, isAuthenticated])

  const fetchUnreadCount = async () => {
    if (!user?.id) return

    const walletAddress = client?.account?.address || user?.walletAddress
    if (!walletAddress) return

    try {
      const response = await fetch('/api/messages/conversations', {
        headers: {
          'x-wallet-address': walletAddress,
          'x-user-id': user.id
        },
        credentials: 'include'
      })

      if (!response.ok) {
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
      console.debug('Unread count fetch failed:', error)
    }
  }

  const handleLogout = async () => {
    await performLogout({
      agwLogout: logout,
      redirectTo: '/'
    })
  }

  const navItems = [
    { icon: 'penguinhome1.png', label: 'Home', href: '/dashboard', paths: ['/dashboard', '/'] },
    { icon: 'penguinfeed1.png', label: 'Feed', href: '/feed', paths: ['/feed'] },
    { icon: 'penguincommunity1.png', label: 'Communities', href: '/communities', paths: ['/communities'] },
    { icon: 'penguindiscover1.png', label: 'Discover', href: '/discover', paths: ['/discover'] },
    { icon: 'penguinfriends1.png', label: 'Friends', href: '/friends', paths: ['/friends'] },
  ]

  return (
    <nav className="glass-card-strong border-b border-white/30 sticky top-0 z-50 web3-grid-bg">
      <div className="container mx-auto px-8 py-3">
        <div className="flex items-center justify-between gap-4">
          {/* Logo */}
          <button
            onClick={() => router.push('/dashboard')}
            className="flex items-center group hover-glow flex-shrink-0"
            aria-label="Go to home"
          >
            <img src="https://gmgnrepeat.com/icons/pengubookicon1.png" alt="PeBloq" className="w-8 h-8 mr-2 animate-float" />
            <span className="text-lg font-display font-bold text-gradient">PeBloq</span>
          </button>

          {/* Primary Navigation */}
          <div className="flex items-center gap-1 flex-1 justify-center">
            {navItems.map((item) => (
              <button
                key={item.href}
                onClick={() => {
                  if (item.paths.includes(pathname || '') || pathname?.startsWith(item.href + '/')) return
                  typeof window !== 'undefined' && sessionStorage.setItem('nav-icon', JSON.stringify({ icon: `https://gmgnrepeat.com/icons/${item.icon}`, alt: item.label }))
                  router.push(item.href)
                }}
                className="nav-link-compact group"
                aria-label={`Go to ${item.label}`}
              >
                <img
                  src={`https://gmgnrepeat.com/icons/${item.icon}`}
                  alt=""
                  aria-hidden="true"
                  className="w-12 h-12 transition-transform duration-150 group-hover:scale-110"
                />
                <span className="nav-tooltip">
                  {item.label}
                  <span className="nav-tooltip-arrow" />
                </span>
              </button>
            ))}

            {/* Messages */}
            <button
              onClick={() => {
                if (pathname === '/messages' || pathname?.startsWith('/messages/')) return
                router.push('/messages')
              }}
              className="nav-link-compact group"
              aria-label="Go to Messages"
            >
              <span className="text-2xl">💬</span>
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-gradient-to-r from-pengu-orange to-pengu-green text-white text-xs rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1 animate-pulse shadow-neon-sm">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
              <span className="nav-tooltip">
                Messages
                <span className="nav-tooltip-arrow" />
              </span>
            </button>

            {/* More Menu Dropdown */}
            <div className="relative" ref={moreMenuRef}>
              <button
                onClick={() => setShowMoreMenu(!showMoreMenu)}
                className="nav-link-compact group"
                aria-label="More options"
                aria-expanded={showMoreMenu}
              >
                <span className="text-2xl">⋯</span>
                <span className="nav-tooltip">
                  More
                  <span className="nav-tooltip-arrow" />
                </span>
              </button>

              {showMoreMenu && (
                <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 min-w-[240px] w-auto bg-gray-900/95 backdrop-blur-xl border border-pengu-green/30 rounded-xl shadow-2xl z-50">
                  <div className="p-2">
                    <button onClick={() => { router.push('/achievements'); setShowMoreMenu(false) }} className="dropdown-item w-full text-left whitespace-nowrap rounded-lg">
                      <span className="text-lg flex-shrink-0">🏆</span>
                      <span className="font-medium">Achievements</span>
                    </button>
                    <button onClick={() => { router.push('/levels'); setShowMoreMenu(false) }} className="dropdown-item w-full text-left whitespace-nowrap rounded-lg">
                      <span className="text-lg flex-shrink-0">⭐</span>
                      <span className="font-medium">Levels</span>
                    </button>
                    <button onClick={() => { router.push('/bookmarks'); setShowMoreMenu(false) }} className="dropdown-item w-full text-left whitespace-nowrap rounded-lg">
                      <span className="text-lg flex-shrink-0">🔖</span>
                      <span className="font-medium">Bookmarks</span>
                    </button>
                    <button onClick={() => { router.push('/settings'); setShowMoreMenu(false) }} className="dropdown-item w-full text-left whitespace-nowrap rounded-lg">
                      <span className="text-lg flex-shrink-0">⚙️</span>
                      <span className="font-medium">Settings</span>
                    </button>

                    <div className="border-t border-white/10 my-2"></div>

                    <button onClick={() => { router.push('/apply-project-verification'); setShowMoreMenu(false) }} className="dropdown-item bg-cyan-500/20 hover:bg-cyan-500/30 w-full text-left whitespace-nowrap rounded-lg">
                      <span className="text-lg flex-shrink-0">🏢</span>
                      <span className="text-cyan-300 font-medium">Apply as Project</span>
                    </button>
                    {isAdmin && (
                      <button onClick={() => { router.push('/admin'); setShowMoreMenu(false) }} className="dropdown-item bg-purple-500/20 hover:bg-purple-500/30 w-full text-left whitespace-nowrap rounded-lg">
                        <span className="text-lg flex-shrink-0">👑</span>
                        <span className="text-purple-300 font-semibold">Admin Panel</span>
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Notification Center */}
          <div className="flex-shrink-0">
            <NotificationCenter />
          </div>

          {/* Search */}
          <div className="flex-shrink-0">
            <UserSearch />
          </div>

          {/* User Menu */}
          {isAuthenticated && user && (
            <div className="relative flex-shrink-0" ref={userMenuRef}>
              <button
                onClick={() => setShowUserMenu(!showUserMenu)}
                className="flex items-center gap-2 glass-card px-3 py-2 rounded-lg hover:bg-white/10 transition-colors duration-150"
                aria-label="User menu"
                aria-expanded={showUserMenu}
              >
                <div className="flex flex-col items-end">
                  <span className="text-white text-sm font-display font-medium">
                    {user.displayName || 'Penguin'}
                  </span>
                  {client?.account?.address ? (
                    <span className="text-pengu-green text-xs font-mono">
                      {client.account.address.slice(0, 4)}...{client.account.address.slice(-3)}
                    </span>
                  ) : user.walletAddress ? (
                    <span className="text-pengu-green text-xs font-mono">
                      {user.walletAddress.slice(0, 4)}...{user.walletAddress.slice(-3)}
                    </span>
                  ) : null}
                </div>
                <img src="https://gmgnrepeat.com/icons/penguinsilhouette1.png" alt="" aria-hidden="true" className="w-8 h-8 transition-transform duration-150 hover:scale-110" />
              </button>

              {showUserMenu && (
                <div className="absolute top-full right-0 mt-2 w-56 bg-gray-900/95 backdrop-blur-xl border border-pengu-green/30 rounded-xl shadow-2xl overflow-hidden z-[100]">
                  <div className="px-4 py-3 border-b border-white/10">
                    <p className="text-white font-semibold truncate">{user.displayName}</p>
                    <p className="text-gray-300 text-xs">Level {user.level}</p>
                  </div>

                  <button onClick={() => { router.push('/profile'); setShowUserMenu(false) }} className="flex items-center gap-2 px-4 py-3 text-white hover:bg-white/10 transition-colors duration-150 cursor-pointer w-full text-left">
                    <img src="https://gmgnrepeat.com/icons/penguinsilhouette1.png" alt="" aria-hidden="true" className="w-5 h-5" />
                    <span>Profile</span>
                  </button>
                  <button onClick={() => { router.push('/settings'); setShowUserMenu(false) }} className="flex items-center gap-2 px-4 py-3 text-white hover:bg-white/10 transition-colors duration-150 cursor-pointer w-full text-left">
                    <span className="text-lg">⚙️</span>
                    <span>Settings</span>
                  </button>
                  <button
                    onClick={() => {
                      setShowThemeCustomizer(true)
                      setShowUserMenu(false)
                    }}
                    className="flex items-center gap-2 px-4 py-3 text-white hover:bg-white/10 transition-colors duration-150 cursor-pointer w-full text-left"
                  >
                    <img src="https://gmgnrepeat.com/icons/penguintheme1.png" alt="" aria-hidden="true" className="w-5 h-5" />
                    <span>Themes</span>
                  </button>

                  <div className="border-t border-white/10">
                    <button
                      onClick={handleLogout}
                      className="flex items-center gap-2 px-4 py-3 text-red-300 hover:bg-red-500/20 transition-colors duration-150 cursor-pointer w-full text-left"
                    >
                      <span className="text-lg">🚪</span>
                      <span>Logout</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Aurora effect */}
      <div className="absolute inset-0 aurora-bg animate-aurora-flow opacity-10 pointer-events-none"></div>

      {/* Theme Customizer Modal */}
      <ThemeCustomizer
        isOpen={showThemeCustomizer}
        onClose={() => setShowThemeCustomizer(false)}
      />
    </nav>
  )
}
