'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/providers/AuthProvider'
import {
  MOD_PERMISSIONS,
  PERMISSION_PRESETS,
  PERMISSION_DESCRIPTIONS,
  type ModPermission
} from '@/lib/mod-permissions'
import { useToast } from '@/components/ui/Toast'

interface Moderator {
  id: string
  userId: string
  user: {
    id: string
    username: string
    displayName: string
    avatar?: string
    level: number
  }
  permissions: string[]
  assignedBy?: string
  assignedAt: string
}

interface ModeratorManagerProps {
  communityId: string
  creatorId: string
  isCreator: boolean
}

export default function ModeratorManager({ communityId, creatorId, isCreator }: ModeratorManagerProps) {
  const { user } = useAuth()
  const { toast } = useToast()
  const [moderators, setModerators] = useState<Moderator[]>([])
  const [members, setMembers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddModal, setShowAddModal] = useState(false)
  const [selectedMember, setSelectedMember] = useState<string>('')
  const [selectedPreset, setSelectedPreset] = useState<string>('FULL_MODERATOR')
  const [customPermissions, setCustomPermissions] = useState<Set<string>>(new Set())
  const [useCustomPermissions, setUseCustomPermissions] = useState(false)

  useEffect(() => {
    fetchModerators()
    fetchMembers()
  }, [communityId])

  const fetchModerators = async () => {
    try {
      const response = await fetch(`/api/communities/${communityId}/moderators`)
      if (response.ok) {
        const data = await response.json()
        setModerators(data.moderators)
      }
    } catch (error) {
      console.error('Error fetching moderators:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchMembers = async () => {
    try {
      const response = await fetch(`/api/communities/${communityId}/members`)
      if (response.ok) {
        const data = await response.json()
        // Filter out existing moderators and creator
        const eligibleMembers = data.members.filter((m: any) =>
          m.role === 'MEMBER' && m.userId !== creatorId
        )
        setMembers(eligibleMembers)
      }
    } catch (error) {
      console.error('Error fetching members:', error)
    }
  }

  const addModerator = async () => {
    if (!selectedMember) return

    try {
      const payload = useCustomPermissions
        ? { targetUserId: selectedMember, permissions: Array.from(customPermissions) }
        : { targetUserId: selectedMember, preset: selectedPreset }

      const response = await fetch(`/api/communities/${communityId}/moderators`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': user?.id || ''
        },
        body: JSON.stringify(payload)
      })

      if (response.ok) {
        await fetchModerators()
        await fetchMembers()
        setShowAddModal(false)
        setSelectedMember('')
        setCustomPermissions(new Set())
      } else {
        const error = await response.json()
        toast(error.error || 'Failed to add moderator', 'error')
      }
    } catch (error) {
      console.error('Error adding moderator:', error)
      toast('Failed to add moderator', 'error')
    }
  }

  const removeModerator = async (userId: string) => {
    if (!confirm('Are you sure you want to remove this moderator?')) return

    try {
      const response = await fetch(
        `/api/communities/${communityId}/moderators?userId=${userId}`,
        {
          method: 'DELETE',
          headers: {
            'x-user-id': user?.id || ''
          }
        }
      )

      if (response.ok) {
        await fetchModerators()
        await fetchMembers()
      } else {
        const error = await response.json()
        toast(error.error || 'Failed to remove moderator', 'error')
      }
    } catch (error) {
      console.error('Error removing moderator:', error)
      toast('Failed to remove moderator', 'error')
    }
  }

  const togglePermission = (permission: string) => {
    const newPermissions = new Set(customPermissions)
    if (newPermissions.has(permission)) {
      newPermissions.delete(permission)
    } else {
      newPermissions.add(permission)
    }
    setCustomPermissions(newPermissions)
  }

  if (loading) {
    return (
      <div className="bg-white/10 backdrop-blur-lg rounded-2xl border border-white/20 p-6">
        <div className="text-center py-8">
          <div className="w-8 h-8 border-4 border-white border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-300">Loading moderators...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white/10 backdrop-blur-lg rounded-2xl border border-white/20 p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-2xl font-bold text-white flex items-center gap-2">
              <span>👑</span> Moderators
            </h2>
            <p className="text-gray-300 text-sm mt-1">
              Manage community moderators and their permissions
            </p>
          </div>
          {isCreator && (
            <button
              onClick={() => setShowAddModal(true)}
              className="bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white px-4 py-2 rounded-lg transition-all duration-300 flex items-center gap-2"
            >
              <span>➕</span> Add Moderator
            </button>
          )}
        </div>

        {/* Moderator List */}
        {moderators.length === 0 ? (
          <p className="text-gray-300 text-center py-8">
            No moderators assigned yet.
          </p>
        ) : (
          <div className="space-y-3">
            {moderators.map((mod) => (
              <div
                key={mod.id}
                className="bg-black/20 rounded-lg p-4 flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-gradient-to-br from-purple-400 to-pink-500 rounded-full flex items-center justify-center">
                    {mod.user.avatar ? (
                      <img
                        src={mod.user.avatar}
                        alt={mod.user.displayName}
                        className="w-full h-full rounded-full object-cover"
                      />
                    ) : (
                      <span className="text-white font-bold text-lg">
                        {mod.user.displayName.charAt(0)}
                      </span>
                    )}
                  </div>
                  <div>
                    <p className="text-white font-medium">{mod.user.displayName}</p>
                    <p className="text-gray-300 text-sm">@{mod.user.username}</p>
                    <p className="text-cyan-400 text-xs mt-1">
                      {mod.permissions.length} permission{mod.permissions.length !== 1 ? 's' : ''}
                    </p>
                  </div>
                </div>

                {isCreator && (
                  <button
                    onClick={() => removeModerator(mod.userId)}
                    className="bg-red-500/20 hover:bg-red-500/30 text-red-300 px-3 py-1 rounded-lg text-sm transition-colors"
                  >
                    Remove
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add Moderator Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 rounded-2xl border border-white/20 p-6 max-w-2xl w-full max-h-[80vh] overflow-y-auto">
            <h3 className="text-2xl font-bold text-white mb-4">Add Moderator</h3>

            {/* Member Selection */}
            <div className="mb-6">
              <label className="block text-white font-medium mb-2">Select Member</label>
              <select
                value={selectedMember}
                onChange={(e) => setSelectedMember(e.target.value)}
                className="w-full bg-black/40 border border-white/20 rounded-lg px-4 py-2 text-white"
              >
                <option value="">Choose a member...</option>
                {members.map((member) => (
                  <option key={member.userId} value={member.userId}>
                    {member.user.displayName} (@{member.user.username})
                  </option>
                ))}
              </select>
            </div>

            {/* Permission Mode Toggle */}
            <div className="mb-6">
              <div className="flex gap-4 mb-4">
                <button
                  onClick={() => setUseCustomPermissions(false)}
                  className={`flex-1 px-4 py-2 rounded-lg transition-colors ${
                    !useCustomPermissions
                      ? 'bg-cyan-500 text-white'
                      : 'bg-black/40 text-gray-300 hover:bg-black/60'
                  }`}
                >
                  Use Preset
                </button>
                <button
                  onClick={() => setUseCustomPermissions(true)}
                  className={`flex-1 px-4 py-2 rounded-lg transition-colors ${
                    useCustomPermissions
                      ? 'bg-cyan-500 text-white'
                      : 'bg-black/40 text-gray-300 hover:bg-black/60'
                  }`}
                >
                  Custom Permissions
                </button>
              </div>

              {!useCustomPermissions ? (
                /* Preset Selection */
                <div>
                  <label className="block text-white font-medium mb-2">Permission Preset</label>
                  <select
                    value={selectedPreset}
                    onChange={(e) => setSelectedPreset(e.target.value)}
                    className="w-full bg-black/40 border border-white/20 rounded-lg px-4 py-2 text-white"
                  >
                    <option value="FULL_MODERATOR">Full Moderator (All Permissions)</option>
                    <option value="CONTENT_MODERATOR">Content Moderator (Posts & Comments)</option>
                    <option value="COMMUNITY_HELPER">Community Helper (Basic Moderation)</option>
                    <option value="ADMIN_MODERATOR">Admin Moderator (Members & Roles)</option>
                  </select>
                </div>
              ) : (
                /* Custom Permissions */
                <div>
                  <label className="block text-white font-medium mb-2">Select Permissions</label>
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {Object.entries(PERMISSION_DESCRIPTIONS).map(([key, desc]) => (
                      <label
                        key={key}
                        className="flex items-start gap-3 p-3 bg-black/40 rounded-lg cursor-pointer hover:bg-black/60 transition-colors"
                      >
                        <input
                          type="checkbox"
                          checked={customPermissions.has(key)}
                          onChange={() => togglePermission(key)}
                          className="mt-1"
                        />
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-lg">{desc.icon}</span>
                            <span className="text-white font-medium">{desc.name}</span>
                          </div>
                          <p className="text-gray-300 text-sm">{desc.description}</p>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              <button
                onClick={() => setShowAddModal(false)}
                className="flex-1 bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={addModerator}
                disabled={!selectedMember}
                className="flex-1 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 disabled:opacity-50 disabled:cursor-not-allowed text-white px-4 py-2 rounded-lg transition-all duration-300"
              >
                Add Moderator
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
