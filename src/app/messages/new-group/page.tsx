'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/providers/AuthProvider'
import Navbar from '@/components/Navbar'
import PenguinLoadingScreen from '@/components/PenguinLoadingScreen'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

interface User {
  id: string
  username: string
  displayName: string
  avatar?: string
  level: number
  profile?: {
    profileVerified: boolean
    followersCount: number
  }
}

export default function NewGroupPage() {
  const { user, isAuthenticated, loading: authLoading } = useAuth()
  const router = useRouter()
  const [step, setStep] = useState<'info' | 'members'>('info')
  const [loading, setLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [searchResults, setSearchResults] = useState<User[]>([])
  const [selectedUsers, setSelectedUsers] = useState<User[]>([])
  const [groupInfo, setGroupInfo] = useState({
    name: '',
    description: '',
    avatar: ''
  })

  // Search for users
  useEffect(() => {
    if (searchTerm.trim() && step === 'members') {
      searchUsers()
    } else {
      setSearchResults([])
    }
  }, [searchTerm, step])

  const searchUsers = async () => {
    try {
      const response = await fetch(`/api/users/search?q=${encodeURIComponent(searchTerm)}&limit=20`)
      const data = await response.json()
      console.log('Search API response:', data) // Debug log
      if (data.success) {
        // Filter out current user and already selected users
        const filteredUsers = data.users.filter((u: User) =>
          u.id !== user?.id && !selectedUsers.some(selected => selected.id === u.id)
        )
        console.log('Filtered users:', filteredUsers) // Debug log
        setSearchResults(filteredUsers)
      } else {
        console.error('Search API error:', data.error)
      }
    } catch (error) {
      console.error('Error searching users:', error)
    }
  }

  const addUser = (userToAdd: User) => {
    setSelectedUsers(prev => [...prev, userToAdd])
    setSearchResults(prev => prev.filter(u => u.id !== userToAdd.id))
  }

  const removeUser = (userId: string) => {
    const userToRemove = selectedUsers.find(u => u.id === userId)
    if (userToRemove) {
      setSelectedUsers(prev => prev.filter(u => u.id !== userId))
      // Add back to search results if search term matches
      if (searchTerm.trim() &&
          (userToRemove.displayName.toLowerCase().includes(searchTerm.toLowerCase()) ||
           userToRemove.username.toLowerCase().includes(searchTerm.toLowerCase()))) {
        setSearchResults(prev => [...prev, userToRemove])
      }
    }
  }

  const createGroup = async () => {
    if (!user?.walletAddress) return
    if (selectedUsers.length < 2) {
      alert('Please select at least 2 other members for the group')
      return
    }
    if (!groupInfo.name.trim()) {
      alert('Please enter a group name')
      return
    }

    setLoading(true)
    try {
      const response = await fetch('/api/messages/groups', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-wallet-address': user.walletAddress
        },
        body: JSON.stringify({
          groupName: groupInfo.name.trim(),
          groupDescription: groupInfo.description.trim() || null,
          groupAvatar: groupInfo.avatar.trim() || null,
          participantIds: selectedUsers.map(u => u.id)
        })
      })

      const data = await response.json()
      if (data.success) {
        router.push(`/messages/${data.data.id}`)
      } else {
        alert(data.error || 'Failed to create group')
      }
    } catch (error) {
      console.error('Error creating group:', error)
      alert('Failed to create group')
    } finally {
      setLoading(false)
    }
  }

  if (authLoading) {
    return <PenguinLoadingScreen />
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-900 via-purple-900 to-indigo-900 flex items-center justify-center">
        <div className="text-center text-white">
          <div className="text-6xl mb-4">🐧</div>
          <h1 className="text-2xl font-bold mb-4">Access Denied</h1>
          <p className="text-gray-300 mb-6">You need to connect your wallet to create groups!</p>
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
        <div className="max-w-2xl mx-auto">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-white mb-4 flex items-center justify-center">
              <span className="mr-3">👥</span>
              Create Group Chat
            </h1>
            <p className="text-xl text-gray-300">
              Start a group conversation with your fellow penguins
            </p>
          </div>

          {/* Progress Indicator */}
          <div className="mb-8">
            <div className="flex justify-between items-center">
              <div className={`flex items-center ${step === 'info' ? 'text-purple-300' : 'text-green-300'}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                  step === 'info' ? 'bg-purple-500' : 'bg-green-500'
                } text-white text-sm font-bold mr-2`}>
                  {step === 'info' ? '1' : '✓'}
                </div>
                <span>Group Info</span>
              </div>
              <div className={`flex items-center ${step === 'members' ? 'text-purple-300' : 'text-gray-500'}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                  step === 'members' ? 'bg-purple-500' : 'bg-gray-600'
                } text-white text-sm font-bold mr-2`}>
                  2
                </div>
                <span>Add Members</span>
              </div>
            </div>
            <div className="mt-4 h-2 bg-gray-700 rounded-full">
              <div
                className="h-full bg-purple-500 rounded-full transition-all duration-300"
                style={{ width: step === 'info' ? '50%' : '100%' }}
              />
            </div>
          </div>

          <div className="bg-white/10 backdrop-blur-lg rounded-2xl border border-white/20 p-8">
            {step === 'info' ? (
              /* Group Info Step */
              <div className="space-y-6">
                <div>
                  <label className="block text-white text-sm font-medium mb-2">
                    Group Name *
                  </label>
                  <input
                    type="text"
                    value={groupInfo.name}
                    onChange={(e) => setGroupInfo(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Enter group name..."
                    className="w-full px-4 py-3 rounded-lg bg-white/20 border border-white/30 text-white placeholder-gray-300 focus:outline-none focus:border-purple-400"
                    maxLength={100}
                  />
                  <p className="text-gray-400 text-xs mt-1">{groupInfo.name.length}/100 characters</p>
                </div>

                <div>
                  <label className="block text-white text-sm font-medium mb-2">
                    Description (Optional)
                  </label>
                  <textarea
                    value={groupInfo.description}
                    onChange={(e) => setGroupInfo(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Describe what this group is about..."
                    rows={3}
                    className="w-full px-4 py-3 rounded-lg bg-white/20 border border-white/30 text-white placeholder-gray-300 focus:outline-none focus:border-purple-400 resize-none"
                    maxLength={500}
                  />
                  <p className="text-gray-400 text-xs mt-1">{groupInfo.description.length}/500 characters</p>
                </div>

                <div>
                  <label className="block text-white text-sm font-medium mb-2">
                    Group Avatar URL (Optional)
                  </label>
                  <input
                    type="url"
                    value={groupInfo.avatar}
                    onChange={(e) => setGroupInfo(prev => ({ ...prev, avatar: e.target.value }))}
                    placeholder="https://example.com/avatar.png"
                    className="w-full px-4 py-3 rounded-lg bg-white/20 border border-white/30 text-white placeholder-gray-300 focus:outline-none focus:border-purple-400"
                  />
                </div>

                {groupInfo.avatar && (
                  <div className="text-center">
                    <div className="w-20 h-20 mx-auto rounded-xl overflow-hidden">
                      <img
                        src={groupInfo.avatar}
                        alt="Group avatar preview"
                        className="w-full h-full object-cover"
                        onError={() => setGroupInfo(prev => ({ ...prev, avatar: '' }))}
                      />
                    </div>
                    <p className="text-gray-400 text-sm mt-2">Avatar preview</p>
                  </div>
                )}

                <div className="flex justify-between pt-4">
                  <Link
                    href="/messages"
                    className="px-6 py-3 text-gray-300 hover:text-white transition-colors"
                  >
                    Cancel
                  </Link>
                  <button
                    onClick={() => setStep('members')}
                    disabled={!groupInfo.name.trim()}
                    className="px-6 py-3 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Next: Add Members
                  </button>
                </div>
              </div>
            ) : (
              /* Add Members Step */
              <div className="space-y-6">
                <div>
                  <label className="block text-white text-sm font-medium mb-2">
                    Search and Add Members
                  </label>
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Search users by name or username..."
                    className="w-full px-4 py-3 rounded-lg bg-white/20 border border-white/30 text-white placeholder-gray-300 focus:outline-none focus:border-purple-400"
                  />
                </div>

                {/* Selected Members */}
                {selectedUsers.length > 0 && (
                  <div>
                    <h3 className="text-white text-sm font-medium mb-3">
                      Selected Members ({selectedUsers.length})
                    </h3>
                    <div className="space-y-2 max-h-32 overflow-y-auto">
                      {selectedUsers.map((selectedUser) => (
                        <div
                          key={selectedUser.id}
                          className="flex items-center justify-between bg-purple-500/20 p-3 rounded-lg"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-gradient-to-br from-cyan-400 to-blue-500 rounded-lg flex items-center justify-center text-sm font-bold text-white">
                              {selectedUser.avatar ? (
                                <img
                                  src={selectedUser.avatar}
                                  alt={selectedUser.displayName}
                                  className="w-full h-full rounded-lg object-cover"
                                />
                              ) : (
                                selectedUser.displayName.charAt(0)
                              )}
                            </div>
                            <div>
                              <p className="text-white font-medium">{selectedUser.displayName}</p>
                              <p className="text-gray-300 text-sm">@{selectedUser.username}</p>
                            </div>
                          </div>
                          <button
                            onClick={() => removeUser(selectedUser.id)}
                            className="text-red-400 hover:text-red-300 transition-colors"
                          >
                            ✕
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Search Results */}
                {searchResults.length > 0 && (
                  <div>
                    <h3 className="text-white text-sm font-medium mb-3">Search Results</h3>
                    <div className="space-y-2 max-h-64 overflow-y-auto">
                      {searchResults.map((searchUser) => (
                        <div
                          key={searchUser.id}
                          className="flex items-center justify-between bg-white/10 p-3 rounded-lg hover:bg-white/20 transition-colors"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-gradient-to-br from-cyan-400 to-blue-500 rounded-lg flex items-center justify-center text-sm font-bold text-white">
                              {searchUser.avatar ? (
                                <img
                                  src={searchUser.avatar}
                                  alt={searchUser.displayName}
                                  className="w-full h-full rounded-lg object-cover"
                                />
                              ) : (
                                searchUser.displayName.charAt(0)
                              )}
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <p className="text-white font-medium">{searchUser.displayName}</p>
                                {searchUser.profile?.profileVerified && (
                                  <span className="text-blue-400 text-xs">✓</span>
                                )}
                              </div>
                              <p className="text-gray-300 text-sm">@{searchUser.username} • Level {searchUser.level}</p>
                            </div>
                          </div>
                          <button
                            onClick={() => addUser(searchUser)}
                            className="px-3 py-1 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors text-sm"
                          >
                            Add
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {searchTerm && searchResults.length === 0 && (
                  <div className="text-center text-gray-400 py-8">
                    <p>No users found matching "{searchTerm}"</p>
                  </div>
                )}

                <div className="flex justify-between pt-4">
                  <button
                    onClick={() => setStep('info')}
                    className="px-6 py-3 text-gray-300 hover:text-white transition-colors"
                  >
                    Back
                  </button>
                  <button
                    onClick={createGroup}
                    disabled={loading || selectedUsers.length < 2}
                    className="px-6 py-3 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading ? 'Creating...' : `Create Group (${selectedUsers.length + 1} members)`}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}