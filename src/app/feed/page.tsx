'use client'

import { useState, useEffect, useRef } from 'react'
import { useAuth } from '@/providers/AuthProvider'
import { useTheme } from '@/providers/ThemeProvider'
import Navbar from '@/components/Navbar'
import SocialFeed from '@/components/SocialFeed'
// DEBUG: Using the SocialFeed with edit functionality
import Link from 'next/link'
import GiphyPicker from '@/components/GiphyPicker'
import TrendingHashtags from '@/components/TrendingHashtags'
import dynamic from 'next/dynamic'
import { Theme } from 'emoji-picker-react'

const EmojiPicker = dynamic(() => import('emoji-picker-react'), { ssr: false })

export default function FeedPage() {
  const { user, isAuthenticated, loading: authLoading } = useAuth()
  const { currentTheme } = useTheme()
  const [showCreatePost, setShowCreatePost] = useState(false)
  const [newPost, setNewPost] = useState({
    title: '',
    content: '',
    visibility: 'PUBLIC' as 'PUBLIC' | 'FOLLOWERS_ONLY' | 'FRIENDS_ONLY' | 'PRIVATE',
    communityId: '',
    mediaUrls: [] as string[]
  })
  const [showGiphyPicker, setShowGiphyPicker] = useState(false)
  const [showEmojiPicker, setShowEmojiPicker] = useState(false)
  const [uploadingMedia, setUploadingMedia] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [mediaPreview, setMediaPreview] = useState<{ url: string, type: 'image' | 'video', moderation?: any }[]>([])
  const [showNSFWWarning, setShowNSFWWarning] = useState(false)
  const [pendingMedia, setPendingMedia] = useState<{ url: string, type: 'image' | 'video', moderation: any } | null>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

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

      // Aggregate moderation data from all media
      let moderationData = null
      const hasNSFWMedia = mediaPreview.some(media => media.moderation?.isNSFW)
      if (hasNSFWMedia && mediaPreview.length > 0) {
        // Use first NSFW media's moderation data as representative
        const nsfwMedia = mediaPreview.find(media => media.moderation?.isNSFW)
        if (nsfwMedia?.moderation) {
          moderationData = nsfwMedia.moderation
        }
      }

      const response = await fetch('/api/posts', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          ...newPost,
          moderationData
        }),
        credentials: 'include' // Include cookies for NextAuth
      })

      const data = await response.json()
      if (response.ok) {
        setNewPost({ title: '', content: '', visibility: 'PUBLIC', communityId: '', mediaUrls: [] })
        setMediaPreview([]) // Clear media preview
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

  const handleEmojiSelect = (emojiData: any) => {
    const emoji = emojiData.emoji
    const textarea = textareaRef.current
    if (textarea) {
      const start = textarea.selectionStart
      const end = textarea.selectionEnd
      const newContent = newPost.content.substring(0, start) + emoji + newPost.content.substring(end)
      setNewPost(prev => ({ ...prev, content: newContent }))

      // Set cursor position after emoji
      setTimeout(() => {
        textarea.focus()
        textarea.setSelectionRange(start + emoji.length, start + emoji.length)
      }, 0)
    } else {
      setNewPost(prev => ({ ...prev, content: prev.content + emoji }))
    }
    setShowEmojiPicker(false)
  }

  const handleMediaUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate file type
    const isVideo = file.type.startsWith('video/')
    const isImage = file.type.startsWith('image/')

    if (!isVideo && !isImage) {
      alert('Please select a video or image file')
      return
    }

    // Validate video duration if it's a video
    if (isVideo) {
      const video = document.createElement('video')
      video.preload = 'metadata'

      video.onloadedmetadata = async () => {
        window.URL.revokeObjectURL(video.src)

        if (video.duration > 30) {
          alert('Video must be 30 seconds or less (Vine length)')
          return
        }

        // Proceed with upload
        await uploadMediaFile(file, isVideo ? 'video' : 'image')
      }

      video.src = URL.createObjectURL(file)
    } else {
      // Upload image immediately
      await uploadMediaFile(file, 'image')
    }
  }

  const uploadMediaFile = async (file: File, type: 'image' | 'video') => {
    setUploadingMedia(true)
    setUploadProgress(0)
    setUploadError(null)

    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('type', 'post-media')

      // Simulate progress for better UX (since fetch doesn't support upload progress natively)
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => Math.min(prev + 10, 90))
      }, 200)

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData
      })

      clearInterval(progressInterval)

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Upload failed' }))
        throw new Error(errorData.error || 'Upload failed')
      }

      const result = await response.json()
      setUploadProgress(100)

      // Check moderation status
      const moderationStatus = result.moderation?.status
      const isNSFW = result.moderation?.isNSFW
      const isFlagged = moderationStatus === 'flagged' || (moderationStatus === 'rejected' && isNSFW)

      console.log('[Upload] Moderation check:', {
        status: moderationStatus,
        isNSFW,
        isFlagged,
        moderation: result.moderation
      })

      if (isFlagged) {
        // Show NSFW warning dialog
        setPendingMedia({ url: result.url, type, moderation: result.moderation })
        setShowNSFWWarning(true)
      } else {
        // Approved content - add immediately
        setMediaPreview(prev => [...prev, { url: result.url, type, moderation: result.moderation }])
        setNewPost(prev => ({
          ...prev,
          mediaUrls: [...prev.mediaUrls, result.url]
        }))
      }

      console.log(`✅ ${type} uploaded:`, result.url, 'Moderation:', moderationStatus)

      // Clear progress after short delay
      setTimeout(() => {
        setUploadProgress(0)
      }, 1000)
    } catch (error: any) {
      console.error('Upload error:', error)
      setUploadError(error.message || `Failed to upload ${type}`)
      setUploadProgress(0)

      // Auto-clear error after 5 seconds
      setTimeout(() => {
        setUploadError(null)
      }, 5000)
    } finally {
      setUploadingMedia(false)
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  const removeMedia = (index: number) => {
    setMediaPreview(prev => prev.filter((_, i) => i !== index))
    setNewPost(prev => ({
      ...prev,
      mediaUrls: prev.mediaUrls.filter((_, i) => i !== index)
    }))
  }

  if (authLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-900 via-purple-900 to-indigo-900 flex items-center justify-center">
        <div className="text-center text-white">
          <div className="flex justify-center mb-4"><img src="https://gmgnrepeat.com/icons/pengubookicon1.png" alt="PenguBook" className="w-24 h-24" /></div>
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
          <div className="flex justify-center mb-4"><img src="https://gmgnrepeat.com/icons/pengubookicon1.png" alt="PenguBook" className="w-24 h-24" /></div>
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
                  ref={textareaRef}
                  placeholder="What's on your mind?"
                  value={newPost.content}
                  onChange={(e) => setNewPost(prev => ({ ...prev, content: e.target.value }))}
                  rows={4}
                  className="w-full px-4 py-2 rounded-lg bg-white/10 border border-white/20 text-white placeholder-gray-300 focus:outline-none focus:border-cyan-400 resize-none"
                />

                {/* Upload Progress */}
                {uploadingMedia && (
                  <div className="bg-white/5 border border-white/20 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-gray-300">Uploading...</span>
                      <span className="text-sm font-semibold text-cyan-400">{uploadProgress}%</span>
                    </div>
                    <div className="w-full bg-white/10 rounded-full h-2 overflow-hidden">
                      <div
                        className="bg-gradient-to-r from-cyan-500 to-blue-500 h-full transition-all duration-300"
                        style={{ width: `${uploadProgress}%` }}
                      />
                    </div>
                  </div>
                )}

                {/* Upload Error */}
                {uploadError && (
                  <div className="bg-red-500/20 border border-red-500/50 rounded-lg p-4 flex items-start gap-3">
                    <span className="text-2xl">⚠️</span>
                    <div className="flex-1">
                      <p className="text-red-200 font-semibold">Upload Failed</p>
                      <p className="text-red-300 text-sm">{uploadError}</p>
                    </div>
                    <button
                      onClick={() => setUploadError(null)}
                      className="text-red-200 hover:text-white"
                    >
                      ✕
                    </button>
                  </div>
                )}

                {/* NSFW Warning Dialog */}
                {showNSFWWarning && pendingMedia && (
                  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
                    <div className="bg-white/10 backdrop-blur-lg border border-white/20 rounded-2xl p-6 max-w-md mx-4">
                      <div className="text-center mb-6">
                        <div className="text-5xl mb-3">⚠️</div>
                        <h3 className="text-2xl font-bold text-white mb-2">Content Flagged</h3>
                        <p className="text-gray-300">
                          Our AI detected that this content may be NSFW (Not Safe For Work).
                        </p>
                      </div>

                      {/* Preview blurred */}
                      <div className="mb-6 relative">
                        {pendingMedia.type === 'image' ? (
                          <img src={pendingMedia.url} alt="Flagged content" className="w-full h-48 object-cover rounded-lg blur-2xl" />
                        ) : (
                          <video src={pendingMedia.url} className="w-full h-48 object-cover rounded-lg blur-2xl bg-black" />
                        )}
                        <div className="absolute inset-0 flex items-center justify-center">
                          <div className="bg-black/70 text-white px-4 py-2 rounded-lg font-semibold">
                            NSFW Content Detected
                          </div>
                        </div>
                      </div>

                      <div className="space-y-3">
                        <button
                          onClick={() => {
                            // Mark as NSFW and allow posting
                            if (pendingMedia) {
                              setMediaPreview(prev => [...prev, pendingMedia])
                              setNewPost(prev => ({
                                ...prev,
                                mediaUrls: [...prev.mediaUrls, pendingMedia.url]
                              }))
                            }
                            setShowNSFWWarning(false)
                            setPendingMedia(null)
                          }}
                          className="w-full bg-orange-500 hover:bg-orange-600 text-white px-6 py-3 rounded-xl font-semibold transition-colors"
                        >
                          Mark as NSFW & Continue
                        </button>
                        <button
                          onClick={() => {
                            setShowNSFWWarning(false)
                            setPendingMedia(null)
                          }}
                          className="w-full bg-gray-500 hover:bg-gray-600 text-white px-6 py-3 rounded-xl font-semibold transition-colors"
                        >
                          Cancel & Remove
                        </button>
                      </div>

                      <p className="text-gray-400 text-xs text-center mt-4">
                        NSFW content will be blurred and require a click to view.
                      </p>
                    </div>
                  </div>
                )}

                {/* Media Preview */}
                {mediaPreview.length > 0 && (
                  <div className="grid grid-cols-2 gap-3">
                    {mediaPreview.map((media, index) => (
                      <div key={index} className="relative group">
                        {media.type === 'image' ? (
                          <img
                            src={media.url}
                            alt={`Upload ${index + 1}`}
                            className="w-full h-48 object-cover rounded-lg"
                          />
                        ) : (
                          <video
                            src={media.url}
                            controls
                            className="w-full h-48 object-cover rounded-lg bg-black"
                          >
                            Your browser does not support the video tag.
                          </video>
                        )}
                        <button
                          type="button"
                          onClick={() => removeMedia(index)}
                          className="absolute top-2 right-2 bg-red-500 hover:bg-red-600 text-white w-8 h-8 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          ✕
                        </button>
                        <div className="absolute bottom-2 left-2 bg-black/70 text-white px-2 py-1 rounded text-xs">
                          {media.type === 'video' ? '🎥 Video' : '🖼️ Image'}
                        </div>
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

                  {/* Hidden file input */}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*,video/*"
                    onChange={handleMediaUpload}
                    className="hidden"
                  />

                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploadingMedia}
                    className="bg-green-500 hover:bg-green-600 disabled:bg-gray-500 text-white px-4 py-2 rounded-lg transition-colors flex items-center gap-2"
                  >
                    {uploadingMedia ? '⏳' : '📸'} Media
                  </button>

                  <button
                    type="button"
                    onClick={() => setShowGiphyPicker(true)}
                    className="bg-purple-500 hover:bg-purple-600 text-white px-4 py-2 rounded-lg transition-colors flex items-center gap-2"
                  >
                    🎭 GIF
                  </button>

                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                      className="bg-yellow-500 hover:bg-yellow-600 text-white px-4 py-2 rounded-lg transition-colors flex items-center gap-2"
                    >
                      😀 Emoji
                    </button>

                    {showEmojiPicker && (
                      <div className="absolute bottom-full left-0 mb-2 z-50">
                        <EmojiPicker
                          onEmojiClick={handleEmojiSelect}
                          theme={Theme.DARK}
                          width={350}
                          height={450}
                        />
                      </div>
                    )}
                  </div>

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