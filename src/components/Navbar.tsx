'use client'

import { useLoginWithAbstract, useAbstractClient } from '@abstract-foundation/agw-react'
import { useState, useEffect } from 'react'
import { signOut } from 'next-auth/react'
import { useAuth } from '@/providers/AuthProvider'
import UserSearch from './UserSearch'

export default function Navbar() {
  const { logout } = useLoginWithAbstract()
  const { data: client } = useAbstractClient()
  const { user, isAuthenticated, oauthSession } = useAuth()
  const [unreadCount, setUnreadCount] = useState(0)

  const isAdmin = user?.isAdmin || false

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

      if (data.success && data.conversations) {
        const totalUnread = data.conversations.reduce((total: number, conversation: any) =>
          total + (conversation.unreadCount || 0), 0)
        setUnreadCount(totalUnread)
      }
    } catch (error) {
      // Silently fail to avoid console spam
      console.debug('Unread count fetch failed:', error)
    }
  }

  const handleLogout = async () => {
    // Logout from both Abstract wallet and NextAuth
    if (client?.account?.address) {
      logout()
    }
    if (oauthSession) {
      await signOut({ redirect: false })
    }
    // Clear session storage
    sessionStorage.removeItem('pengubook-auth')
    sessionStorage.removeItem('pengubook-oauth-auth')
    window.location.href = '/'
  }

  return (
    <nav className="glass-card-strong border-b border-white/30 sticky top-0 z-50 web3-grid-bg">
      <div className="container mx-auto mobile-padding py-4">
        <div className="flex items-center justify-between">
          {/* Logo with enhanced Web3 styling */}
          <a href="/dashboard" className="flex items-center group hover-glow">
            <div className="relative">
              <span className="text-3xl mr-3 animate-float">🐧</span>
              <div className="absolute inset-0 animate-aurora-flow opacity-20 rounded-full"></div>
            </div>
            <div className="flex flex-col">
              <span className="text-xl font-display font-bold text-gradient">PenguBook</span>
              <span className="text-xs text-neon-cyan font-mono opacity-60">v2.7.4</span>
            </div>
          </a>

          {/* Search Component */}
          <div className="hidden md:block">
            <UserSearch />
          </div>

          {/* Enhanced Navigation Links */}
          <div className="hidden md:flex items-center space-x-2">
            <a href="/dashboard" className="nav-link group">
              <span className="text-lg group-hover:animate-float">🏠</span>
              <span className="font-medium">Home</span>
            </a>
            <a href="/feed" className="nav-link group">
              <span className="text-lg group-hover:animate-float">📝</span>
              <span className="font-medium">Feed</span>
            </a>
            <a href="/communities" className="nav-link group">
              <span className="text-lg group-hover:animate-float">🏔️</span>
              <span className="font-medium">Communities</span>
            </a>
            <a href="/discover" className="nav-link group">
              <span className="text-lg group-hover:animate-float">🧭</span>
              <span className="font-medium">Discover</span>
            </a>
            <a href="/friends" className="nav-link group">
              <span className="text-lg group-hover:animate-float">🤝</span>
              <span className="font-medium">Friends</span>
            </a>
            <a href="/achievements" className="nav-link group">
              <span className="text-lg group-hover:animate-float">🏆</span>
              <span className="font-medium">Achievements</span>
            </a>
            <a href="/messages" className="nav-link group relative">
              <span className="text-lg group-hover:animate-float">💬</span>
              <span className="font-medium">Messages</span>
              {unreadCount > 0 && (
                <span className="absolute -top-2 -right-2 bg-gradient-to-r from-neon-pink to-neon-purple text-white text-xs rounded-full min-w-[20px] h-5 flex items-center justify-center px-1 animate-pulse shadow-neon-sm">
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              )}
            </a>
            <a href="/bookmarks" className="nav-link group">
              <span className="text-lg group-hover:animate-float">🔖</span>
              <span className="font-medium">Bookmarks</span>
            </a>
            <a href="/profile" className="nav-link group">
              <span className="text-lg group-hover:animate-float">👤</span>
              <span className="font-medium">Profile</span>
            </a>
            <a href="/levels" className="nav-link group">
              <span className="text-lg group-hover:animate-float">⭐</span>
              <span className="font-medium">Levels</span>
            </a>
            <a href="/settings" className="nav-link group">
              <span className="text-lg group-hover:animate-float">⚙️</span>
              <span className="font-medium">Settings</span>
            </a>
            {isAdmin && (
              <a href="/admin" className="nav-link-admin group">
                <span className="text-lg group-hover:animate-float">👑</span>
                <span className="font-medium">Admin</span>
              </a>
            )}
          </div>

          {/* Enhanced User Info & Logout */}
          {isAuthenticated && user && (
            <div className="flex items-center space-x-4">
              <div className="hidden sm:flex items-center glass-card px-4 py-2 hover-lift">
                <div className="flex flex-col items-end mr-3">
                  <span className="text-white text-sm font-display font-medium">
                    {user.displayName || 'Penguin'}
                  </span>
                  {client?.account?.address ? (
                    <>
                      <span className="text-neon-cyan text-xs font-mono">
                        {client.account.address.slice(0, 6)}...{client.account.address.slice(-4)}
                      </span>
                    </>
                  ) : user.walletAddress ? (
                    <span className="text-neon-cyan text-xs font-mono">
                      {user.walletAddress.slice(0, 6)}...{user.walletAddress.slice(-4)}
                    </span>
                  ) : (
                    <span className="text-gray-400 text-xs">@{user.username}</span>
                  )}
                </div>
                {client?.account?.address && (
                  <div className="flex flex-col items-center">
                    <span className="text-neon-cyan text-xs font-bold bg-neon-cyan/20 px-2 py-1 rounded border border-neon-cyan/30">
                      AGW
                    </span>
                    <div className="w-2 h-2 bg-neon-green rounded-full animate-pulse mt-1"></div>
                  </div>
                )}
              </div>

              <button
                onClick={handleLogout}
                className="cyber-button bg-gradient-to-r from-red-500/20 to-red-600/20 border-red-400/50 text-red-300 hover:text-red-200 hover:shadow-[0_0_20px_rgba(239,68,68,0.5)]"
              >
                <span className="mr-2">🚪</span>
                <span className="font-medium">Logout</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Add subtle aurora effect */}
      <div className="absolute inset-0 aurora-bg animate-aurora-flow opacity-10 pointer-events-none"></div>
    </nav>
  )
}