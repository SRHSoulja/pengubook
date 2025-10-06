'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/providers/AuthProvider'
import { MOD_PERMISSIONS, canModerate } from '@/lib/mod-permissions'
import { useToast } from '@/components/ui/Toast'

interface Member {
  id: string
  userId: string
  role: string
  status: string
  customTitle?: string
  joinedAt: string
  user: {
    id: string
    username: string
    displayName: string
    avatar?: string
    level: number
  }
}

interface ModToolsProps {
  communityId: string
  creatorId: string
}

export default function ModTools({ communityId, creatorId }: ModToolsProps) {
  const { user } = useAuth()
  const { addToast } = useToast()
  const [activeTab, setActiveTab] = useState<'members' | 'reports' | 'logs'>('members')
  const [members, setMembers] = useState<Member[]>([])
  const [moderators, setModerators] = useState<any[]>([])
  const [permissions, setPermissions] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedMember, setSelectedMember] = useState<Member | null>(null)
  const [customTitleInput, setCustomTitleInput] = useState('')

  useEffect(() => {
    fetchData()
  }, [communityId])

  const fetchData = async () => {
    try {
      const [membersRes, modsRes] = await Promise.all([
        fetch(`/api/communities/${communityId}/members`),
        fetch(`/api/communities/${communityId}/moderators`)
      ])

      if (membersRes.ok) {
        const data = await membersRes.json()
        setMembers(data.members)
      }

      if (modsRes.ok) {
        const data = await modsRes.json()
        setModerators(data.moderators)

        // Determine current user's permissions
        if (user) {
          const modStatus = canModerate(user.id, creatorId, data.moderators)
          setPermissions(modStatus.permissions)
        }
      }
    } catch (error) {
      console.error('Error fetching data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleMemberAction = async (action: string, member: Member, reason?: string) => {
    if (!user) return

    try {
      const response = await fetch(
        `/api/communities/${communityId}/members/${member.userId}/moderate`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-user-id': user.id
          },
          body: JSON.stringify({ action, reason })
        }
      )

      if (response.ok) {
        await fetchData()
        setSelectedMember(null)
        addToast(`Member ${action} successfully`, 'success')
      } else {
        const error = await response.json()
        addToast(error.error || `Failed to ${action} member`, 'error')
      }
    } catch (error) {
      console.error(`Error ${action} member:`, error)
      addToast(`Failed to ${action} member`, 'error')
    }
  }

  const updateMemberTitle = async (member: Member) => {
    if (!user) return

    try {
      const response = await fetch(
        `/api/communities/${communityId}/members/${member.userId}/title`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'x-user-id': user.id
          },
          body: JSON.stringify({ customTitle: customTitleInput })
        }
      )

      if (response.ok) {
        await fetchData()
        setSelectedMember(null)
        setCustomTitleInput('')
        addToast('Member title updated successfully', 'success')
      } else {
        const error = await response.json()
        addToast(error.error || 'Failed to update member title', 'error')
      }
    } catch (error) {
      console.error('Error updating member title:', error)
      addToast('Failed to update member title', 'error')
    }
  }

  const hasPermission = (permission: string) => permissions.includes(permission)
  const isCreator = user?.id === creatorId

  if (loading) {
    return (
      <div className="bg-white/10 backdrop-blur-lg rounded-2xl border border-white/20 p-6">
        <div className="text-center py-8">
          <div className="w-8 h-8 border-4 border-white border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-300">Loading mod tools...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header with Tabs */}
      <div className="bg-white/10 backdrop-blur-lg rounded-2xl border border-white/20 p-6">
        <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
          <span>🛠️</span> Moderator Tools
        </h2>

        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setActiveTab('members')}
            className={`px-4 py-2 rounded-lg transition-colors ${
              activeTab === 'members'
                ? 'bg-cyan-500 text-white'
                : 'bg-black/40 text-gray-300 hover:bg-black/60'
            }`}
          >
            👥 Members
          </button>
          <button
            onClick={() => setActiveTab('reports')}
            className={`px-4 py-2 rounded-lg transition-colors ${
              activeTab === 'reports'
                ? 'bg-cyan-500 text-white'
                : 'bg-black/40 text-gray-300 hover:bg-black/60'
            }`}
          >
            🚩 Reports
          </button>
          <button
            onClick={() => setActiveTab('logs')}
            className={`px-4 py-2 rounded-lg transition-colors ${
              activeTab === 'logs'
                ? 'bg-cyan-500 text-white'
                : 'bg-black/40 text-gray-300 hover:bg-black/60'
            }`}
          >
            📋 Mod Logs
          </button>
        </div>

        {/* Members Tab */}
        {activeTab === 'members' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between mb-4">
              <p className="text-gray-300 text-sm">
                Showing {members.length} members
              </p>
              <div className="flex gap-2">
                <button className="bg-black/40 hover:bg-black/60 text-white px-3 py-1 rounded-lg text-sm transition-colors">
                  Filter
                </button>
                <button className="bg-black/40 hover:bg-black/60 text-white px-3 py-1 rounded-lg text-sm transition-colors">
                  Sort
                </button>
              </div>
            </div>

            {members.map((member) => (
              <div
                key={member.id}
                className="bg-black/20 rounded-lg p-4 flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-gradient-to-br from-cyan-400 to-blue-500 rounded-full flex items-center justify-center">
                    {member.user.avatar ? (
                      <img
                        src={member.user.avatar}
                        alt={member.user.displayName}
                        className="w-full h-full rounded-full object-cover"
                      />
                    ) : (
                      <span className="text-white font-bold text-lg">
                        {member.user.displayName.charAt(0)}
                      </span>
                    )}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-white font-medium">{member.user.displayName}</p>
                      {member.customTitle && (
                        <span className="bg-purple-500/20 border border-purple-500/30 text-purple-300 text-xs px-2 py-0.5 rounded">
                          {member.customTitle}
                        </span>
                      )}
                      {member.status === 'BANNED' && (
                        <span className="bg-red-500/20 border border-red-500/30 text-red-300 text-xs px-2 py-0.5 rounded">
                          BANNED
                        </span>
                      )}
                      {member.status === 'MUTED' && (
                        <span className="bg-yellow-500/20 border border-yellow-500/30 text-yellow-300 text-xs px-2 py-0.5 rounded">
                          MUTED
                        </span>
                      )}
                    </div>
                    <p className="text-gray-300 text-sm">
                      @{member.user.username} • Level {member.user.level}
                    </p>
                  </div>
                </div>

                <div className="flex gap-2">
                  {hasPermission(MOD_PERMISSIONS.MANAGE_ROLES) && (
                    <button
                      onClick={() => {
                        setSelectedMember(member)
                        setCustomTitleInput(member.customTitle || '')
                      }}
                      className="bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 px-3 py-1 rounded-lg text-sm transition-colors"
                    >
                      🏷️ Title
                    </button>
                  )}

                  {hasPermission(MOD_PERMISSIONS.MUTE_MEMBERS) && member.status !== 'MUTED' && (
                    <button
                      onClick={() => handleMemberAction('mute', member)}
                      className="bg-yellow-500/20 hover:bg-yellow-500/30 text-yellow-300 px-3 py-1 rounded-lg text-sm transition-colors"
                    >
                      🔇 Mute
                    </button>
                  )}

                  {hasPermission(MOD_PERMISSIONS.MUTE_MEMBERS) && member.status === 'MUTED' && (
                    <button
                      onClick={() => handleMemberAction('unmute', member)}
                      className="bg-green-500/20 hover:bg-green-500/30 text-green-300 px-3 py-1 rounded-lg text-sm transition-colors"
                    >
                      🔊 Unmute
                    </button>
                  )}

                  {hasPermission(MOD_PERMISSIONS.MANAGE_MEMBERS) && member.status !== 'BANNED' && (
                    <button
                      onClick={() => handleMemberAction('ban', member)}
                      className="bg-red-500/20 hover:bg-red-500/30 text-red-300 px-3 py-1 rounded-lg text-sm transition-colors"
                    >
                      🚫 Ban
                    </button>
                  )}

                  {hasPermission(MOD_PERMISSIONS.MANAGE_MEMBERS) && member.status === 'BANNED' && (
                    <button
                      onClick={() => handleMemberAction('unban', member)}
                      className="bg-green-500/20 hover:bg-green-500/30 text-green-300 px-3 py-1 rounded-lg text-sm transition-colors"
                    >
                      ✅ Unban
                    </button>
                  )}

                  {hasPermission(MOD_PERMISSIONS.MANAGE_MEMBERS) && (
                    <button
                      onClick={() => handleMemberAction('kick', member)}
                      className="bg-orange-500/20 hover:bg-orange-500/30 text-orange-300 px-3 py-1 rounded-lg text-sm transition-colors"
                    >
                      👢 Kick
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Reports Tab */}
        {activeTab === 'reports' && (
          <div className="text-center py-8 text-gray-300">
            <span className="text-4xl block mb-2">🚩</span>
            Reports feature coming soon
          </div>
        )}

        {/* Mod Logs Tab */}
        {activeTab === 'logs' && (
          <div className="text-center py-8 text-gray-300">
            <span className="text-4xl block mb-2">📋</span>
            Mod logs feature coming soon
          </div>
        )}
      </div>

      {/* Custom Title Modal */}
      {selectedMember && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 rounded-2xl border border-white/20 p-6 max-w-md w-full">
            <h3 className="text-xl font-bold text-white mb-4">
              Set Custom Title for {selectedMember.user.displayName}
            </h3>

            <input
              type="text"
              value={customTitleInput}
              onChange={(e) => setCustomTitleInput(e.target.value)}
              placeholder="Enter custom title (max 50 chars)"
              maxLength={50}
              className="w-full bg-black/40 border border-white/20 rounded-lg px-4 py-2 text-white mb-4"
            />

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setSelectedMember(null)
                  setCustomTitleInput('')
                }}
                className="flex-1 bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => updateMemberTitle(selectedMember)}
                className="flex-1 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white px-4 py-2 rounded-lg transition-all duration-300"
              >
                Save Title
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
