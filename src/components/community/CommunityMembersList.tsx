'use client'

import Link from 'next/link'

interface Member {
  id: string
  role: string
  joinedAt: string
  user: {
    id: string
    username: string
    displayName: string
    avatar?: string
    level: number
    profile?: {
      profileVerified: boolean
    }
  }
}

interface CommunityMembersListProps {
  members: Member[]
  currentUserId?: string
  canManageMembers?: boolean
  onMemberAction?: (memberId: string, action: 'promote' | 'demote' | 'remove') => void
}

export default function CommunityMembersList({
  members,
  currentUserId,
  canManageMembers = false,
  onMemberAction
}: CommunityMembersListProps) {
  const getRoleColor = (role: string) => {
    switch (role.toUpperCase()) {
      case 'OWNER':
        return 'text-yellow-400 bg-yellow-400/20 border-yellow-400/30'
      case 'ADMIN':
        return 'text-red-400 bg-red-400/20 border-red-400/30'
      case 'MODERATOR':
        return 'text-purple-400 bg-purple-400/20 border-purple-400/30'
      default:
        return 'text-gray-400 bg-gray-400/20 border-gray-400/30'
    }
  }

  const getRoleIcon = (role: string): React.ReactNode => {
    switch (role.toUpperCase()) {
      case 'OWNER':
        return '👑'
      case 'ADMIN':
        return '⚡'
      case 'MODERATOR':
        return '🛡️'
      default:
        return <img src="https://gmgnrepeat.com/icons/penguinsilhouette1.png" alt="Member" className="w-4 h-4 inline-block" />
    }
  }

  const formatJoinDate = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffTime = Math.abs(now.getTime() - date.getTime())
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

    if (diffDays === 1) return 'Yesterday'
    if (diffDays < 7) return `${diffDays} days ago`
    if (diffDays < 30) return `${Math.ceil(diffDays / 7)} weeks ago`
    if (diffDays < 365) return `${Math.ceil(diffDays / 30)} months ago`
    return `${Math.ceil(diffDays / 365)} years ago`
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-xl font-semibold text-white">
          Members ({members.length})
        </h3>
      </div>

      <div className="space-y-3">
        {members.map((member) => (
          <div key={member.id} className="glass-card p-4 hover-lift">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                {/* Avatar */}
                <Link href={`/profile/${member.user.id}`}>
                  <div className="relative">
                    {member.user.avatar ? (
                      <img
                        src={member.user.avatar}
                        alt={member.user.displayName}
                        className="w-12 h-12 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-cyan-400 to-purple-500 flex items-center justify-center">
                        <span className="text-white font-bold">
                          {member.user.displayName.charAt(0).toUpperCase()}
                        </span>
                      </div>
                    )}

                    {/* Verified Badge */}
                    {member.user.profile?.profileVerified && (
                      <div className="absolute -top-1 -right-1 w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center">
                        <span className="text-white text-xs">✓</span>
                      </div>
                    )}
                  </div>
                </Link>

                {/* User Info */}
                <div className="flex-1">
                  <div className="flex items-center space-x-2">
                    <Link href={`/profile/${member.user.id}`}>
                      <h4 className="text-white font-semibold hover:text-purple-400 transition-colors">
                        {member.user.displayName}
                      </h4>
                    </Link>

                    {/* Role Badge */}
                    <div className={`px-2 py-1 rounded-lg text-xs font-medium border ${getRoleColor(member.role)}`}>
                      <span className="mr-1">{getRoleIcon(member.role)}</span>
                      {member.role.toLowerCase()}
                    </div>

                    {/* Current User Indicator */}
                    {member.user.id === currentUserId && (
                      <span className="text-xs text-cyan-400 font-medium">(You)</span>
                    )}
                  </div>

                  <div className="flex items-center space-x-4 mt-1">
                    <p className="text-gray-400 text-sm">@{member.user.username}</p>
                    <div className="flex items-center space-x-1 text-xs text-gray-500">
                      <span>Level {member.user.level}</span>
                      <span>•</span>
                      <span>Joined {formatJoinDate(member.joinedAt)}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Member Actions */}
              {canManageMembers && member.user.id !== currentUserId && (
                <div className="flex items-center space-x-2">
                  {member.role !== 'OWNER' && (
                    <>
                      {member.role === 'MEMBER' && (
                        <button
                          onClick={() => onMemberAction?.(member.id, 'promote')}
                          className="px-3 py-1 bg-purple-600 hover:bg-purple-700 text-white text-xs rounded transition-colors"
                          title="Promote to Moderator"
                        >
                          Promote
                        </button>
                      )}

                      {(member.role === 'MODERATOR' || member.role === 'ADMIN') && (
                        <button
                          onClick={() => onMemberAction?.(member.id, 'demote')}
                          className="px-3 py-1 bg-yellow-600 hover:bg-yellow-700 text-white text-xs rounded transition-colors"
                          title="Demote"
                        >
                          Demote
                        </button>
                      )}

                      <button
                        onClick={() => onMemberAction?.(member.id, 'remove')}
                        className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white text-xs rounded transition-colors"
                        title="Remove Member"
                      >
                        Remove
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        ))}

        {members.length === 0 && (
          <div className="text-center py-8">
            <div className="text-4xl mb-2">👥</div>
            <p className="text-gray-400">No members yet</p>
          </div>
        )}
      </div>
    </div>
  )
}