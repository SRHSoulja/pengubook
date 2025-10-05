'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

interface ProjectAccount {
  id: string
  username: string
  displayName: string
  avatar: string | null
  walletAddress: string
  profile: {
    isProject: boolean
    projectType: string | null
    projectWebsite: string | null
    projectTwitter: string | null
    projectDiscord: string | null
    contractAddress: string | null
    profileVerified: boolean
  } | null
}

export default function ProjectVerificationManager() {
  const [projects, setProjects] = useState<ProjectAccount[]>([])
  const [allUsers, setAllUsers] = useState<ProjectAccount[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'verified' | 'unverified'>('all')
  const [selectedUser, setSelectedUser] = useState<ProjectAccount | null>(null)
  const [formData, setFormData] = useState({
    isProject: false,
    projectType: '',
    projectWebsite: '',
    projectTwitter: '',
    projectDiscord: '',
    contractAddress: '',
    profileVerified: false
  })

  useEffect(() => {
    fetchProjects()
    fetchAllUsers()
  }, [])

  const fetchProjects = async () => {
    try {
      setLoading(true)
      const walletAddress = localStorage.getItem('pebloq-auth')
      const response = await fetch('/api/admin/projects', {
        headers: {
          'x-wallet-address': walletAddress || ''
        }
      })
      if (response.ok) {
        const data = await response.json()
        setProjects(data.projects || [])
      }
    } catch (err) {
      console.error('Failed to fetch projects:', err)
    } finally {
      setLoading(false)
    }
  }

  const fetchAllUsers = async () => {
    try {
      const response = await fetch('/api/admin/users?limit=100')
      if (response.ok) {
        const data = await response.json()
        setAllUsers(data.users || [])
      }
    } catch (err) {
      console.error('Failed to fetch users:', err)
    }
  }

  const handleSelectUser = (user: ProjectAccount) => {
    setSelectedUser(user)
    setFormData({
      isProject: user.profile?.isProject || false,
      projectType: user.profile?.projectType || '',
      projectWebsite: user.profile?.projectWebsite || '',
      projectTwitter: user.profile?.projectTwitter || '',
      projectDiscord: user.profile?.projectDiscord || '',
      contractAddress: user.profile?.contractAddress || '',
      profileVerified: user.profile?.profileVerified || false
    })
  }

  const handleSave = async () => {
    if (!selectedUser) return

    try {
      const walletAddress = localStorage.getItem('pebloq-auth')
      const response = await fetch(`/api/admin/projects/${selectedUser.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-wallet-address': walletAddress || ''
        },
        body: JSON.stringify(formData)
      })

      if (response.ok) {
        await fetchProjects()
        await fetchAllUsers()
        setSelectedUser(null)
      }
    } catch (err) {
      console.error('Failed to update project:', err)
    }
  }

  const filteredProjects = projects.filter(p => {
    if (filter === 'verified') return p.profile?.profileVerified
    if (filter === 'unverified') return !p.profile?.profileVerified
    return true
  })

  return (
    <div className="bg-black/20 backdrop-blur-lg rounded-2xl border border-white/20 p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <span>🏢</span>
            <span>Project Account Verification</span>
          </h2>
          <p className="text-gray-300 text-sm mt-1">Verify official Abstract token & NFT project accounts</p>
        </div>
        <div className="text-cyan-400 text-2xl font-bold">
          {projects.length}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Projects List */}
        <div>
          <div className="flex gap-2 mb-4">
            <button
              onClick={() => setFilter('all')}
              className={`px-4 py-2 rounded-lg ${filter === 'all' ? 'bg-cyan-500 text-white' : 'bg-white/10 text-gray-300'}`}
            >
              All ({projects.length})
            </button>
            <button
              onClick={() => setFilter('verified')}
              className={`px-4 py-2 rounded-lg ${filter === 'verified' ? 'bg-cyan-500 text-white' : 'bg-white/10 text-gray-300'}`}
            >
              Verified ({projects.filter(p => p.profile?.profileVerified).length})
            </button>
            <button
              onClick={() => setFilter('unverified')}
              className={`px-4 py-2 rounded-lg ${filter === 'unverified' ? 'bg-cyan-500 text-white' : 'bg-white/10 text-gray-300'}`}
            >
              Unverified ({projects.filter(p => !p.profile?.profileVerified).length})
            </button>
          </div>

          <div className="space-y-3 max-h-[600px] overflow-y-auto">
            {loading ? (
              <div className="text-center py-12 text-gray-400">Loading...</div>
            ) : filteredProjects.length > 0 ? (
              filteredProjects.map((project) => (
                <div
                  key={project.id}
                  onClick={() => handleSelectUser(project)}
                  className={`bg-white/5 border rounded-xl p-4 cursor-pointer transition-all ${
                    selectedUser?.id === project.id
                      ? 'border-cyan-400 bg-white/10'
                      : 'border-white/10 hover:bg-white/10'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full overflow-hidden bg-gradient-to-br from-purple-500 to-pink-500">
                      {project.avatar ? (
                        <img src={project.avatar} alt={project.displayName} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-white font-bold">
                          {project.displayName.charAt(0)}
                        </div>
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-white">{project.displayName}</span>
                        {project.profile?.profileVerified && (
                          <span className="text-blue-400" title="Verified Project">✓</span>
                        )}
                      </div>
                      <p className="text-sm text-gray-400">@{project.username}</p>
                      {project.profile?.projectType && (
                        <span className="text-xs bg-purple-500/20 text-purple-300 px-2 py-0.5 rounded">
                          {project.profile.projectType}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-12 text-gray-400">
                No {filter !== 'all' ? filter : ''} projects found
              </div>
            )}
          </div>

          {/* Quick Add from All Users */}
          <div className="mt-6">
            <h3 className="text-white font-semibold mb-3">Add Project from Users</h3>
            <select
              onChange={(e) => {
                const user = allUsers.find(u => u.id === e.target.value)
                if (user) handleSelectUser(user)
              }}
              className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-2 text-white"
            >
              <option value="">Select a user...</option>
              {allUsers.map(user => (
                <option key={user.id} value={user.id}>
                  {user.displayName} (@{user.username})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Edit Form */}
        <div>
          {selectedUser ? (
            <div className="bg-white/5 rounded-xl p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold text-white">Edit Project Account</h3>
                <Link
                  href={`/profile/${selectedUser.id}`}
                  target="_blank"
                  className="text-cyan-400 hover:text-cyan-300 text-sm"
                >
                  View Profile →
                </Link>
              </div>

              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={formData.isProject}
                    onChange={(e) => setFormData({ ...formData, isProject: e.target.checked })}
                    className="w-5 h-5"
                  />
                  <label className="text-white font-semibold">Mark as Project Account</label>
                </div>

                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={formData.profileVerified}
                    onChange={(e) => setFormData({ ...formData, profileVerified: e.target.checked })}
                    className="w-5 h-5"
                  />
                  <label className="text-white font-semibold">Verified (Blue Checkmark)</label>
                </div>

                <div>
                  <label className="block text-sm text-gray-300 mb-1">Project Type</label>
                  <select
                    value={formData.projectType}
                    onChange={(e) => setFormData({ ...formData, projectType: e.target.value })}
                    className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-2 text-white"
                  >
                    <option value="">Select type...</option>
                    <option value="token">Token</option>
                    <option value="nft">NFT Collection</option>
                    <option value="defi">DeFi Protocol</option>
                    <option value="game">Game</option>
                    <option value="dao">DAO</option>
                    <option value="infrastructure">Infrastructure</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm text-gray-300 mb-1">Contract Address</label>
                  <input
                    type="text"
                    value={formData.contractAddress}
                    onChange={(e) => setFormData({ ...formData, contractAddress: e.target.value })}
                    placeholder="0x..."
                    className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-2 text-white"
                  />
                </div>

                <div>
                  <label className="block text-sm text-gray-300 mb-1">Official Website</label>
                  <input
                    type="url"
                    value={formData.projectWebsite}
                    onChange={(e) => setFormData({ ...formData, projectWebsite: e.target.value })}
                    placeholder="https://..."
                    className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-2 text-white"
                  />
                </div>

                <div>
                  <label className="block text-sm text-gray-300 mb-1">Official Twitter</label>
                  <input
                    type="text"
                    value={formData.projectTwitter}
                    onChange={(e) => setFormData({ ...formData, projectTwitter: e.target.value })}
                    placeholder="@handle"
                    className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-2 text-white"
                  />
                </div>

                <div>
                  <label className="block text-sm text-gray-300 mb-1">Official Discord</label>
                  <input
                    type="url"
                    value={formData.projectDiscord}
                    onChange={(e) => setFormData({ ...formData, projectDiscord: e.target.value })}
                    placeholder="https://discord.gg/..."
                    className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-2 text-white"
                  />
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    onClick={handleSave}
                    className="flex-1 bg-gradient-to-r from-cyan-500 to-blue-500 text-white px-6 py-3 rounded-lg hover:from-cyan-600 hover:to-blue-600 transition-colors font-semibold"
                  >
                    Save Changes
                  </button>
                  <button
                    onClick={() => setSelectedUser(null)}
                    className="bg-gray-500 text-white px-6 py-3 rounded-lg hover:bg-gray-600 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white/5 rounded-xl p-6 text-center text-gray-400">
              <div className="text-6xl mb-4">🏢</div>
              <p>Select a project to edit</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
