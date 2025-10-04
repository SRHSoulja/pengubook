'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/providers/AuthProvider'
import { useRouter } from 'next/navigation'
import PenguinLoadingScreen from '@/components/PenguinLoadingScreen'
import Navbar from '@/components/Navbar'
import BannerUploader from '@/components/BannerUploader'
import Link from 'next/link'

// NSFW categories users can opt-in to (FLAG/ALLOW only, excludes REJECT categories)
const OPTIONAL_NSFW_CATEGORIES = [
  { label: 'Nudity', description: 'General nudity content' },
  { label: 'Partial Nudity', description: 'Partial nudity' },
  { label: 'Suggestive', description: 'Suggestive content' },
  { label: 'Physical Violence', description: 'Physical violence' },
  { label: 'Weapon Violence', description: 'Weapons or violence' },
  { label: 'Visually Disturbing', description: 'Disturbing imagery' },
  { label: 'Self Injury', description: 'Self-harm imagery' },
  { label: 'Emaciated Bodies', description: 'Eating disorder content' },
  { label: 'Corpses', description: 'Deceased bodies' },
  { label: 'Female Swimwear Or Underwear', description: 'Swimwear/underwear' },
  { label: 'Male Swimwear Or Underwear', description: 'Swimwear/underwear' },
  { label: 'Revealing Clothes', description: 'Revealing clothing' }
]

export default function ProfileEditPage() {
  const { user, loading: authLoading, isAuthenticated, refetchUser } = useAuth()
  const router = useRouter()
  const [editing, setEditing] = useState(true)
  const [saving, setSaving] = useState(false)
  const [formData, setFormData] = useState({
    displayName: '',
    username: '',
    bio: '',
    interests: '',
    avatarSource: 'default',
    bannerImage: null as string | null,
    showNSFW: false,
    allowedNSFWCategories: [] as string[]
  })

  useEffect(() => {
    if (user) {
      const allowedCategories = user.profile?.allowedNSFWCategories
        ? (typeof user.profile.allowedNSFWCategories === 'string'
            ? JSON.parse(user.profile.allowedNSFWCategories)
            : user.profile.allowedNSFWCategories)
        : []

      setFormData({
        displayName: user.displayName || '',
        username: user.username || '',
        bio: user.bio || '',
        interests: user.profile?.interests
          ? (Array.isArray(JSON.parse(user.profile.interests))
              ? JSON.parse(user.profile.interests).join(', ')
              : '')
          : '',
        avatarSource: (user as any).avatarSource || 'default',
        bannerImage: user.profile?.bannerImage || null,
        showNSFW: user.profile?.showNSFW || false,
        allowedNSFWCategories: Array.isArray(allowedCategories) ? allowedCategories : []
      })
    }
  }, [user])

  const handleSave = async () => {
    if (!user) return

    setSaving(true)
    try {
      const response = await fetch('/api/users/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          walletAddress: user.walletAddress,
          displayName: formData.displayName,
          username: formData.username,
          bio: formData.bio,
          interests: formData.interests.split(',').map(i => i.trim()).filter(Boolean),
          avatarSource: formData.avatarSource,
          bannerImage: formData.bannerImage,
          showNSFW: formData.showNSFW,
          allowedNSFWCategories: formData.allowedNSFWCategories
        })
      })

      if (response.ok) {
        const data = await response.json()
        console.log('Profile updated successfully:', data)
        await refetchUser()
        router.push(`/profile/${user.id}`)
      } else {
        const errorData = await response.json()
        console.error('Failed to update profile:', errorData)
        alert('Failed to update profile: ' + (errorData.error || 'Unknown error'))
      }
    } catch (error) {
      console.error('Failed to update profile:', error)
      alert('Failed to update profile. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  // Show loading screen while checking auth
  if (authLoading) {
    return <PenguinLoadingScreen />
  }

  // Show access denied if not authenticated
  if (!isAuthenticated || !user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-900 via-purple-900 to-indigo-900">
        <Navbar />
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center text-white">
            <div className="flex justify-center mb-4"><img src="https://gmgnrepeat.com/icons/pengubookicon1.png" alt="PeBloq" className="w-24 h-24" /></div>
            <h1 className="text-2xl font-bold mb-4">Profile Access Required</h1>
            <p className="text-gray-300 mb-6">Please connect your wallet to edit your profile</p>
            <Link href="/" className="bg-cyan-500 text-white px-6 py-3 rounded-xl hover:bg-cyan-600 transition-colors">
              Back to Home
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-purple-900 to-indigo-900">
      <Navbar />

      <div className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto">
          <div className="bg-white/10 backdrop-blur-lg rounded-2xl border border-white/20 shadow-2xl p-8">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center">
                <span className="text-4xl mr-3">🐧</span>
                <h1 className="text-3xl font-bold text-white">Edit Profile</h1>
              </div>
              <Link
                href={`/profile/${user.id}`}
                className="bg-gray-500 text-white px-6 py-2 rounded-xl hover:bg-gray-600 transition-colors"
              >
                ❄️ Cancel
              </Link>
            </div>

            <div className="space-y-6">
              {/* Banner Image Upload */}
              <BannerUploader
                currentBanner={formData.bannerImage}
                onBannerChange={(url) => setFormData({...formData, bannerImage: url})}
              />

              <div>
                <label className="block text-sm font-medium text-white mb-1">
                  Display Name
                </label>
                <input
                  type="text"
                  value={formData.displayName}
                  onChange={(e) => setFormData({...formData, displayName: e.target.value})}
                  className="w-full border border-gray-300 rounded-xl px-4 py-3 bg-white/90 text-gray-900"
                  placeholder="Your display name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-white mb-1">
                  Username
                </label>
                <input
                  type="text"
                  value={formData.username}
                  onChange={(e) => setFormData({...formData, username: e.target.value})}
                  className="w-full border border-gray-300 rounded-xl px-4 py-3 bg-white/90 text-gray-900"
                  placeholder="Your unique username"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-white mb-1">
                  Bio
                </label>
                <textarea
                  value={formData.bio}
                  onChange={(e) => setFormData({...formData, bio: e.target.value})}
                  rows={3}
                  className="w-full border border-gray-300 rounded-xl px-4 py-3 bg-white/90 text-gray-900"
                  placeholder="Tell us about yourself..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-white mb-1">
                  Interests (comma separated)
                </label>
                <input
                  type="text"
                  value={formData.interests}
                  onChange={(e) => setFormData({...formData, interests: e.target.value})}
                  className="w-full border border-gray-300 rounded-xl px-4 py-3 bg-white/90 text-gray-900"
                  placeholder="Web3, AI, Gaming, NFTs..."
                />
              </div>

              {/* Avatar Source Selection */}
              <div>
                <label className="block text-sm font-medium text-white mb-3">
                  Profile Avatar Source
                </label>
                <div className="space-y-3">
                  <div
                    onClick={() => setFormData({...formData, avatarSource: 'default'})}
                    className={`p-4 border rounded-xl cursor-pointer transition-all ${
                      formData.avatarSource === 'default'
                        ? 'border-cyan-400 bg-cyan-500/10'
                        : 'border-gray-300 bg-white/5'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-gradient-to-br from-cyan-400 to-blue-500 rounded-xl flex items-center justify-center text-xl font-bold text-white">
                        🐧
                      </div>
                      <div>
                        <h4 className="font-medium text-white">Default Avatar</h4>
                        <p className="text-sm text-gray-300">Use the default penguin avatar</p>
                      </div>
                      <div className="ml-auto">
                        <div className={`w-4 h-4 rounded-full border-2 ${
                          formData.avatarSource === 'default' ? 'bg-cyan-400 border-cyan-400' : 'border-gray-400'
                        }`} />
                      </div>
                    </div>
                  </div>

                  {(user as any).discordName && (user as any).discordAvatar && (
                    <div
                      onClick={() => setFormData({...formData, avatarSource: 'discord'})}
                      className={`p-4 border rounded-xl cursor-pointer transition-all ${
                        formData.avatarSource === 'discord'
                          ? 'border-[#5865F2] bg-[#5865F2]/10'
                          : 'border-gray-300 bg-white/5'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <img
                          src={(user as any).discordAvatar}
                          alt="Discord Avatar"
                          className="w-12 h-12 rounded-xl object-cover"
                        />
                        <div>
                          <h4 className="font-medium text-white">Discord Avatar</h4>
                          <p className="text-sm text-gray-300">From @{(user as any).discordName}</p>
                        </div>
                        <div className="ml-auto">
                          <div className={`w-4 h-4 rounded-full border-2 ${
                            formData.avatarSource === 'discord' ? 'bg-[#5865F2] border-[#5865F2]' : 'border-gray-400'
                          }`} />
                        </div>
                      </div>
                    </div>
                  )}

                  {(user as any).twitterHandle && (user as any).twitterAvatar && (
                    <div
                      onClick={() => setFormData({...formData, avatarSource: 'twitter'})}
                      className={`p-4 border rounded-xl cursor-pointer transition-all ${
                        formData.avatarSource === 'twitter'
                          ? 'border-black bg-black/10'
                          : 'border-gray-300 bg-white/5'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <img
                          src={(user as any).twitterAvatar}
                          alt="X Avatar"
                          className="w-12 h-12 rounded-xl object-cover"
                        />
                        <div>
                          <h4 className="font-medium text-white">X (Twitter) Avatar</h4>
                          <p className="text-sm text-gray-300">From {(user as any).twitterHandle}</p>
                        </div>
                        <div className="ml-auto">
                          <div className={`w-4 h-4 rounded-full border-2 ${
                            formData.avatarSource === 'twitter' ? 'bg-black border-black' : 'border-gray-400'
                          }`} />
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {!(user as any).discordName && !(user as any).twitterHandle && (
                  <div className="mt-3 p-3 bg-blue-500/10 border border-blue-500/20 rounded-xl">
                    <p className="text-blue-300 text-sm">
                      <span className="font-medium">Tip:</span> Link your Discord or X account in Settings to use their avatars as your profile picture.
                    </p>
                  </div>
                )}

                {((user as any).discordName && !(user as any).discordAvatar) || ((user as any).twitterHandle && !(user as any).twitterAvatar) ? (
                  <div className="mt-3 p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl">
                    <p className="text-amber-300 text-sm">
                      <span className="font-medium">Note:</span> Your social accounts are linked but avatar images aren't available.
                      <Link href="/settings" className="text-amber-200 hover:text-amber-100 underline ml-1">
                        Re-link your accounts in Settings
                      </Link> to enable avatar selection.
                    </p>
                  </div>
                ) : null}
              </div>

              {/* Social accounts are read-only - managed via OAuth linking */}
              {(user.discordName || user.twitterHandle) && (
                <div className="bg-black/20 p-4 rounded-lg border border-white/10">
                  <h4 className="text-sm font-medium text-gray-300 mb-2">Linked Social Accounts</h4>
                  <p className="text-xs text-gray-300 mb-3">These are managed via Settings → Social Account Linking</p>

                  {user.discordName && (
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-gray-300">Discord:</span>
                      <span className="text-sm text-white bg-black/30 px-2 py-1 rounded">{user.discordName}</span>
                    </div>
                  )}

                  {user.twitterHandle && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-300">X (Twitter):</span>
                      <span className="text-sm text-white bg-black/30 px-2 py-1 rounded">{user.twitterHandle}</span>
                    </div>
                  )}
                </div>
              )}

              {/* NSFW Content Preferences */}
              <div className="bg-black/20 p-4 rounded-lg border border-white/10">
                <h4 className="text-sm font-medium text-gray-300 mb-2">Content Preferences</h4>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-white font-medium">Auto-show ALL NSFW Content</p>
                    <p className="text-xs text-gray-300 mt-1">Automatically reveal all NSFW posts without clicking</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setFormData({...formData, showNSFW: !formData.showNSFW})}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      formData.showNSFW ? 'bg-cyan-500' : 'bg-gray-600'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        formData.showNSFW ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>

                {/* Granular Category Selection - Only show if global toggle is OFF */}
                {!formData.showNSFW && (
                  <div className="mt-4 pt-4 border-t border-white/10">
                    <p className="text-sm text-white font-medium mb-2">Or choose specific categories to auto-show:</p>
                    <p className="text-xs text-gray-300 mb-3">Select which types of content you're comfortable seeing automatically</p>
                    <div className="grid grid-cols-1 gap-2 max-h-60 overflow-y-auto pr-2">
                      {OPTIONAL_NSFW_CATEGORIES.map((category) => (
                        <label
                          key={category.label}
                          className="flex items-start gap-3 p-2 rounded-lg hover:bg-white/5 cursor-pointer transition-colors"
                        >
                          <input
                            type="checkbox"
                            checked={formData.allowedNSFWCategories.includes(category.label)}
                            onChange={(e) => {
                              const newCategories = e.target.checked
                                ? [...formData.allowedNSFWCategories, category.label]
                                : formData.allowedNSFWCategories.filter(c => c !== category.label)
                              setFormData({...formData, allowedNSFWCategories: newCategories})
                            }}
                            className="mt-0.5 h-4 w-4 rounded border-gray-400 text-cyan-500 focus:ring-cyan-500"
                          />
                          <div className="flex-1">
                            <p className="text-sm text-white">{category.label}</p>
                            <p className="text-xs text-gray-300">{category.description}</p>
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="flex gap-4">
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="flex-1 bg-gradient-to-r from-green-500 to-green-600 text-white py-3 rounded-xl hover:from-green-600 hover:to-green-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                >
                  {saving ? '💾 Saving...' : '💾 Save Changes'}
                </button>
                <Link
                  href="/settings"
                  className="bg-blue-500 text-white px-6 py-3 rounded-xl hover:bg-blue-600 transition-colors text-center"
                >
                  ⚙️ Settings
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}