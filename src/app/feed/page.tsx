'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/providers/AuthProvider'
import Navbar from '@/components/Navbar'
import SocialFeed from '@/components/SocialFeed'
// DEBUG: Using the SocialFeed with edit functionality
import Link from 'next/link'
import GiphyPicker from '@/components/GiphyPicker'
import TrendingHashtags from '@/components/TrendingHashtags'

export default function FeedPage() {
  const { user, isAuthenticated, loading: authLoading } = useAuth()
  const [showCreatePost, setShowCreatePost] = useState(false)
  const [newPost, setNewPost] = useState({
    title: '',
    content: '',
    visibility: 'PUBLIC' as 'PUBLIC' | 'FOLLOWERS_ONLY' | 'FRIENDS_ONLY' | 'PRIVATE',
    communityId: '',
    mediaUrls: [] as string[]
  })
  const [showGiphyPicker, setShowGiphyPicker] = useState(false)


  const createPost = async () => {
    if (!user || !newPost.content.trim()) return

    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json'
      }

      // Add authentication header if user has wallet address
      if (user.walletAddress) {
        headers['x-wallet-address'] = user.walletAddress
      }

      // Add user ID header as fallback
      if (user.id) {
        headers['x-user-id'] = user.id
      }

      const response = await fetch('/api/posts', {
        method: 'POST',
        headers,
        body: JSON.stringify(newPost),
        credentials: 'include' // Include cookies for NextAuth
      })

      const data = await response.json()
      if (response.ok) {
        setNewPost({ title: '', content: '', visibility: 'PUBLIC', communityId: '', mediaUrls: [] })
        setShowCreatePost(false)
        // Refresh the feed
        window.location.reload()
      } else {
        console.error('Post creation failed:', {
          status: response.status,
          error: data.error,
          details: data.details,
          user: { id: user.id, walletAddress: user.walletAddress }
        })
        alert(data.error || 'Failed to create post')
      }
    } catch (error) {
      console.error('Error creating post:', error)
      alert('Failed to create post')
    }
  }

  const handleGifSelect = (gifUrl: string) => {
    setNewPost(prev => ({
      ...prev,
      mediaUrls: [...prev.mediaUrls, gifUrl]
    }))
    setShowGiphyPicker(false)
  }

  const removeMediaUrl = (index: number) => {
    setNewPost(prev => ({
      ...prev,
      mediaUrls: prev.mediaUrls.filter((_, i) => i !== index)
    }))
  }

  if (authLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-900 via-purple-900 to-indigo-900 flex items-center justify-center">
        <div className="text-center text-white">
          <div className="text-6xl mb-4">🐧</div>
          <h1 className="text-2xl font-bold mb-4">Loading...</h1>
          <div className="w-8 h-8 border-4 border-white border-t-transparent rounded-full animate-spin mx-auto"></div>
        </div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-900 via-purple-900 to-indigo-900 flex items-center justify-center">
        <div className="text-center text-white">
          <div className="text-6xl mb-4">🐧</div>
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
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-purple-900 to-indigo-900">
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

          {/* Create Post */}
          <div className="bg-white/10 backdrop-blur-lg rounded-2xl border border-white/20 p-6 mb-8">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-gradient-to-br from-cyan-400 to-blue-500 rounded-xl flex items-center justify-center text-white font-bold">
                {user?.avatar ? (
                  <img
                    src={user.avatar}
                    alt={user.displayName}
                    className="w-full h-full rounded-xl object-cover"
                  />
                ) : (
                  user?.displayName?.charAt(0) || 'P'
                )}
              </div>
              <h2 className="text-lg font-semibold text-white">
                What's happening, {user?.displayName || 'Penguin'}?
              </h2>
            </div>

            {!showCreatePost ? (
              <button
                onClick={() => setShowCreatePost(true)}
                className="w-full bg-white/10 hover:bg-white/20 border border-white/20 rounded-xl p-4 text-left text-gray-300 hover:text-white transition-all"
              >
                Share your thoughts with the colony...
              </button>
            ) : (
              <div className="space-y-4">
                <input
                  type="text"
                  placeholder="Post title (optional)"
                  value={newPost.title}
                  onChange={(e) => setNewPost(prev => ({ ...prev, title: e.target.value }))}
                  className="w-full px-4 py-2 rounded-lg bg-white/10 border border-white/20 text-white placeholder-gray-300 focus:outline-none focus:border-cyan-400"
                />

                <textarea
                  placeholder="What's on your mind?"
                  value={newPost.content}
                  onChange={(e) => setNewPost(prev => ({ ...prev, content: e.target.value }))}
                  rows={4}
                  className="w-full px-4 py-2 rounded-lg bg-white/10 border border-white/20 text-white placeholder-gray-300 focus:outline-none focus:border-cyan-400 resize-none"
                />

                {/* Media URLs */}
                {newPost.mediaUrls.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-sm text-gray-300">Media attachments:</p>
                    {newPost.mediaUrls.map((url, index) => (
                      <div key={index} className="flex items-center justify-between bg-white/5 rounded-lg p-2">
                        <span className="text-sm text-gray-300 truncate flex-1">{url}</span>
                        <button
                          type="button"
                          onClick={() => removeMediaUrl(index)}
                          className="text-red-400 hover:text-red-300 ml-2"
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                <div className="flex gap-3">
                  <select
                    value={newPost.visibility}
                    onChange={(e) => setNewPost(prev => ({ ...prev, visibility: e.target.value as any }))}
                    className="px-3 py-2 rounded-lg bg-white/10 border border-white/20 text-white focus:outline-none focus:border-cyan-400"
                  >
                    <option value="PUBLIC" className="bg-gray-800">🌍 Public</option>
                    <option value="FOLLOWERS_ONLY" className="bg-gray-800">👥 Followers Only</option>
                    <option value="FRIENDS_ONLY" className="bg-gray-800">🤝 Friends Only</option>
                    <option value="PRIVATE" className="bg-gray-800">🔒 Private</option>
                  </select>

                  <button
                    onClick={() => setShowGiphyPicker(true)}
                    className="bg-purple-500 hover:bg-purple-600 text-white px-4 py-2 rounded-lg transition-colors flex items-center gap-2"
                  >
                    🎭 GIF
                  </button>

                  <button
                    onClick={createPost}
                    disabled={!newPost.content.trim()}
                    className="bg-cyan-500 hover:bg-cyan-600 disabled:bg-gray-500 disabled:cursor-not-allowed text-white px-6 py-2 rounded-lg transition-colors"
                  >
                    Post
                  </button>

                  <button
                    onClick={() => {
                      setShowCreatePost(false)
                      setNewPost({ title: '', content: '', visibility: 'PUBLIC', communityId: '', mediaUrls: [] })
                    }}
                    className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-lg transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Social Feed */}
          <SocialFeed userId={user?.id} limit={15} />
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1">
            <div className="sticky top-8 space-y-6">
              <TrendingHashtags limit={10} />
            </div>
          </div>
        </div>
      </div>

      {/* Giphy Picker Modal */}
      <GiphyPicker
        isOpen={showGiphyPicker}
        onClose={() => setShowGiphyPicker(false)}
        onSelect={handleGifSelect}
      />
    </div>
  )
}