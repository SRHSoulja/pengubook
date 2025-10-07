'use client'

import { useState, useEffect, useRef } from 'react'
import { useAuth } from '@/providers/AuthProvider'
import Link from 'next/link'

interface Notification {
  id: string
  type: 'LIKE' | 'COMMENT' | 'FOLLOW' | 'FRIEND_REQUEST' | 'MENTION' | 'SHARE' | 'TIP'
  content: string
  read: boolean
  createdAt: string
  actor: {
    id: string
    displayName: string
    avatar?: string
  }
  actionUrl?: string
}

export default function NotificationCenter() {
  const { user } = useAuth()
  const [isOpen, setIsOpen] = useState(false)
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (user) {
      fetchNotifications()
      // Poll for new notifications every 30 seconds
      const interval = setInterval(fetchNotifications, 30000)
      return () => clearInterval(interval)
    }
  }, [user])

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const fetchNotifications = async () => {
    if (!user) return

    try {
      const response = await fetch('/api/notifications', {
        credentials: 'include',
        headers: {
          'x-user-id': user.id,
          'x-wallet-address': user.walletAddress || ''
        }
      })

      if (response.ok) {
        const data = await response.json()
        setNotifications(data.notifications || [])
        setUnreadCount(data.unreadCount || 0)
      }
    } catch (error) {
      console.error('Failed to fetch notifications:', error)
    }
  }

  const markAsRead = async (notificationId: string) => {
    try {
      const response = await fetch(`/api/notifications/${notificationId}/read`, {
        method: 'POST',
        credentials: 'include'
      })

      if (response.ok) {
        setNotifications(prev =>
          prev.map(n => (n.id === notificationId ? { ...n, read: true } : n))
        )
        setUnreadCount(prev => Math.max(0, prev - 1))
      }
    } catch (error) {
      console.error('Failed to mark notification as read:', error)
    }
  }

  const markAllAsRead = async () => {
    try {
      const response = await fetch('/api/notifications/read-all', {
        method: 'POST',
        credentials: 'include'
      })

      if (response.ok) {
        setNotifications(prev => prev.map(n => ({ ...n, read: true })))
        setUnreadCount(0)
      }
    } catch (error) {
      console.error('Failed to mark all as read:', error)
    }
  }

  const getNotificationIcon = (type: Notification['type']) => {
    switch (type) {
      case 'LIKE':
        return '❤️'
      case 'COMMENT':
        return '💬'
      case 'FOLLOW':
        return '👤'
      case 'FRIEND_REQUEST':
        return '🤝'
      case 'MENTION':
        return '@'
      case 'SHARE':
        return '🔄'
      case 'TIP':
        return '💰'
      default:
        return '🔔'
    }
  }

  const formatTimeAgo = (date: string) => {
    const now = new Date()
    const then = new Date(date)
    const seconds = Math.floor((now.getTime() - then.getTime()) / 1000)

    if (seconds < 60) return 'just now'
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`
    if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`
    return then.toLocaleDateString()
  }

  if (!user) return null

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Notification Bell Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 rounded-lg hover:bg-white/10 transition-colors duration-150"
        aria-label="Notifications"
      >
        <span className="text-2xl">🔔</span>
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-pengu-green text-black text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center animate-pulse">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Notification Dropdown */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-96 max-w-[calc(100vw-2rem)] glass-card-strong rounded-2xl shadow-2xl border border-white/20 overflow-hidden z-[70]">
          {/* Header */}
          <div className="p-4 border-b border-white/10 flex items-center justify-between">
            <h3 className="text-lg font-bold text-white">Notifications</h3>
            {unreadCount > 0 && (
              <button
                onClick={markAllAsRead}
                className="text-sm text-pengu-green hover:text-pengu-400 font-semibold transition-colors"
              >
                Mark all read
              </button>
            )}
          </div>

          {/* Notifications List */}
          <div className="max-h-[500px] overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="p-8 text-center text-gray-400">
                <div className="text-4xl mb-2">🔔</div>
                <p>No notifications yet</p>
                <p className="text-sm mt-1">When you get notifications, they'll show up here</p>
              </div>
            ) : (
              <div className="divide-y divide-white/10">
                {notifications.map(notification => (
                  <Link
                    key={notification.id}
                    href={notification.actionUrl || '#'}
                    onClick={() => {
                      if (!notification.read) {
                        markAsRead(notification.id)
                      }
                      setIsOpen(false)
                    }}
                    className={`block p-4 hover:bg-white/5 transition-colors ${
                      !notification.read ? 'bg-pengu-green/5 border-l-4 border-pengu-green' : ''
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      {/* Actor Avatar */}
                      <div className="flex-shrink-0">
                        {notification.actor.avatar ? (
                          <img
                            src={notification.actor.avatar}
                            alt={notification.actor.displayName}
                            className="w-10 h-10 rounded-full object-cover"
                          />
                        ) : (
                          <div className="w-10 h-10 bg-gradient-to-br from-cyan-400 to-blue-500 rounded-full flex items-center justify-center text-white font-bold">
                            {notification.actor.displayName.charAt(0)}
                          </div>
                        )}
                      </div>

                      {/* Notification Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start gap-2">
                          <span className="text-xl flex-shrink-0">
                            {getNotificationIcon(notification.type)}
                          </span>
                          <div className="flex-1">
                            <p className="text-sm text-white leading-snug">
                              <span className="font-semibold">{notification.actor.displayName}</span>{' '}
                              {notification.content}
                            </p>
                            <p className="text-xs text-gray-400 mt-1">
                              {formatTimeAgo(notification.createdAt)}
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Unread Indicator */}
                      {!notification.read && (
                        <div className="flex-shrink-0">
                          <div className="w-2 h-2 bg-pengu-green rounded-full"></div>
                        </div>
                      )}
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          {notifications.length > 0 && (
            <div className="p-3 border-t border-white/10 bg-white/5">
              <Link
                href="/notifications"
                onClick={() => setIsOpen(false)}
                className="text-sm text-pengu-green hover:text-pengu-400 font-semibold transition-colors block text-center"
              >
                View all notifications
              </Link>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
