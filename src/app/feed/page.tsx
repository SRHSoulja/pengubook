'use client'

import { useState } from 'react'
import { useAuth } from '@/providers/AuthProvider'
import { useTheme } from '@/providers/ThemeProvider'
import Navbar from '@/components/Navbar'
import SocialFeed from '@/components/SocialFeed'
import Link from 'next/link'
import TrendingHashtags from '@/components/TrendingHashtags'
import EnhancedPostComposer from '@/components/EnhancedPostComposer'

export default function FeedPage() {
  const { user, isAuthenticated, loading: authLoading } = useAuth()
  const { currentTheme } = useTheme()

  const handlePost = async (data: { title: string; content: string; media?: any[] }) => {
    if (!user) return

    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json'
      }

      if (user.walletAddress) {
        headers['x-wallet-address'] = user.walletAddress
      }

      if (user.id) {
        headers['x-user-id'] = user.id
      }

      const response = await fetch('/api/posts', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          title: data.title,
          content: data.content,
          visibility: 'PUBLIC',
          communityId: '',
          mediaUrls: data.media || []
        }),
        credentials: 'include'
      })

      const result = await response.json()
      if (response.ok) {
        window.location.reload()
      } else {
        throw new Error(result.error || 'Failed to create post')
      }
    } catch (error: any) {
      console.error('Error creating post:', error)
      throw error
    }
  }

  if (authLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-900 via-purple-900 to-indigo-900 flex items-center justify-center">
        <div className="text-center text-white">
          <div className="flex justify-center mb-4"><img src="https://gmgnrepeat.com/icons/pengubookicon1.png" alt="PeBloq" className="w-24 h-24" /></div>
          <h1 className="text-2xl font-bold mb-4">Loading...</h1>
          <div className="w-8 h-8 border-4 border-white border-t-transparent rounded-full animate-spin mx-auto"></div>
        </div>
      </div>
    )
  }

  if (!isAuthenticated && !authLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-900 via-purple-900 to-indigo-900 flex items-center justify-center">
        <div className="text-center text-white">
          <div className="flex justify-center mb-4"><img src="https://gmgnrepeat.com/icons/pengubookicon1.png" alt="PeBloq" className="w-24 h-24" /></div>
          <h1 className="text-2xl font-bold mb-4">Access Denied</h1>
          <p className="text-gray-300 mb-6">You need to connect your wallet to see your feed!</p>
          <Link href="/" className="bg-cyan-500 text-white px-6 py-3 rounded-xl hover:bg-cyan-600 transition-colors">
            Back to Home
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div style={{ background: `linear-gradient(135deg, ${currentTheme.colors.from}, ${currentTheme.colors.via}, ${currentTheme.colors.to})` }} className="min-h-screen transition-all duration-500">
      <Navbar />

      <div className="container mx-auto px-4 py-8">
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Feed Column */}
          <div className="lg:col-span-2">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-white mb-4 flex items-center justify-center">
              <span className="mr-3">📝</span>
              Social Feed
            </h1>
            <p className="text-xl text-gray-300">
              Stay connected with your penguin colony!
            </p>
          </div>

          {/* Search Bar */}
          <div className="bg-white/10 backdrop-blur-lg rounded-2xl border border-white/20 p-4 mb-8">
            <form onSubmit={(e) => {
              e.preventDefault()
              const searchInput = e.currentTarget.querySelector('input') as HTMLInputElement
              if (searchInput?.value.trim()) {
                window.location.href = `/feed/search?q=${encodeURIComponent(searchInput.value.trim())}`
              }
            }}>
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search posts, keywords, or #hashtags..."
                  className="w-full px-4 py-3 pr-12 bg-white/5 border border-white/20 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:border-cyan-400 transition-all"
                />
                <button
                  type="submit"
                  className="absolute right-2 top-1/2 -translate-y-1/2 bg-cyan-500 hover:bg-cyan-600 text-white px-4 py-1.5 rounded-lg transition-colors text-sm font-semibold"
                >
                  🔍 Search
                </button>
              </div>
            </form>
          </div>

          {/* Create Post */}
          <EnhancedPostComposer onPost={handlePost} />

          {/* Trending Hashtags - Mobile */}
          <div className="lg:hidden mb-8">
            <TrendingHashtags limit={5} />
          </div>

          {/* Social Feed */}
          <SocialFeed userId={user?.id} limit={15} />
          </div>

          {/* Sidebar - Desktop Only */}
          <div className="hidden lg:block lg:col-span-1">
            <div className="sticky top-8 space-y-6">
              <TrendingHashtags limit={10} />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}