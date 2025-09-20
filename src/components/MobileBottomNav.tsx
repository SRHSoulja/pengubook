'use client'

import { useState } from 'react'
import { useAuth } from '@/providers/AuthProvider'
import { useRouter, usePathname } from 'next/navigation'
import TipModal from '@/components/TipModal'
import ThemeCustomizer from '@/components/ThemeCustomizer'

interface NavItem {
  id: string
  icon: string
  label: string
  href?: string
  action?: () => void
  badge?: number
}

export default function MobileBottomNav() {
  const { user, isAuthenticated } = useAuth()
  const router = useRouter()
  const pathname = usePathname()
  const [showTipModal, setShowTipModal] = useState(false)
  const [showThemeCustomizer, setShowThemeCustomizer] = useState(false)

  if (!isAuthenticated) return null

  const navItems: NavItem[] = [
    {
      id: 'home',
      icon: '🏠',
      label: 'Home',
      href: '/dashboard'
    },
    {
      id: 'feed',
      icon: '📱',
      label: 'Feed',
      href: '/feed'
    },
    {
      id: 'tip',
      icon: '💸',
      label: 'Tip',
      action: () => setShowTipModal(true)
    },
    {
      id: 'communities',
      icon: '🏔️',
      label: 'Communities',
      href: '/communities'
    },
    {
      id: 'profile',
      icon: '👤',
      label: 'Profile',
      href: '/profile'
    }
  ]

  const handleNavClick = (item: NavItem) => {
    if (item.action) {
      item.action()
    } else if (item.href) {
      router.push(item.href)
    }
  }

  const isActive = (item: NavItem) => {
    if (!item.href || !pathname) return false
    return pathname === item.href || pathname.startsWith(item.href + '/')
  }

  return (
    <>
      {/* Mobile Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-black/80 backdrop-blur-md border-t border-white/10 md:hidden">
        <div className="flex items-center justify-around px-2 py-3">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => handleNavClick(item)}
              className={`relative flex flex-col items-center justify-center space-y-1 p-2 rounded-lg transition-all duration-200 ${
                isActive(item)
                  ? 'text-neon-cyan bg-cyan-500/10'
                  : 'text-gray-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <span className={`text-lg ${isActive(item) ? 'animate-float' : ''}`}>
                {item.icon}
              </span>
              <span className="text-xs font-medium">{item.label}</span>

              {/* Badge for notifications */}
              {item.badge && item.badge > 0 && (
                <div className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center animate-pulse">
                  {item.badge > 9 ? '9+' : item.badge}
                </div>
              )}

              {/* Active indicator */}
              {isActive(item) && (
                <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-1 h-1 bg-neon-cyan rounded-full" />
              )}
            </button>
          ))}
        </div>

        {/* Floating Action Button (FAB) for Quick Actions */}
        <div className="absolute -top-8 right-4">
          <div className="relative">
            <button
              onClick={() => setShowThemeCustomizer(true)}
              className="w-12 h-12 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center text-white shadow-lg hover:shadow-purple-500/25 transition-all duration-300 hover:scale-110"
            >
              <span className="text-lg animate-float">🎨</span>
            </button>
          </div>
        </div>
      </div>

      {/* Bottom padding for content to avoid overlap */}
      <div className="h-20 md:hidden" />

      {/* Modals */}
      <TipModal
        isOpen={showTipModal}
        onClose={() => setShowTipModal(false)}
      />

      <ThemeCustomizer
        isOpen={showThemeCustomizer}
        onClose={() => setShowThemeCustomizer(false)}
        onThemeChange={(theme) => {
          console.log('Theme changed:', theme)
        }}
      />
    </>
  )
}