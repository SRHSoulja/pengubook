'use client'

interface Community {
  id: string
  name: string
  displayName: string
  description: string
  avatar?: string
  banner?: string
  category: string
  tags: string[]
  rules: string[]
  isOfficial: boolean
  membersCount: number
  visibility: string
  createdAt: string
  isTokenGated?: boolean
  tokenGateType?: string
  tokenContractAddress?: string
  tokenMinAmount?: string
  tokenIds?: string
  tokenSymbol?: string
  tokenDecimals?: number
  userMembership?: {
    role: string
    joinedAt: string
  }
}

interface CommunityHeaderProps {
  community: Community
  onEditClick?: () => void
  onJoinClick?: () => void
  canEdit?: boolean
  isMember?: boolean
  joining?: boolean
}

export default function CommunityHeader({
  community,
  onEditClick,
  onJoinClick,
  canEdit = false,
  isMember = false,
  joining = false
}: CommunityHeaderProps) {
  return (
    <div className="relative">
      {/* Banner */}
      {community.banner ? (
        <div
          className="h-48 bg-cover bg-center"
          style={{ backgroundImage: `url(${community.banner})` }}
        />
      ) : (
        <div className="h-48 bg-gradient-to-r from-blue-900 via-purple-900 to-indigo-900" />
      )}

      {/* Content Container */}
      <div className="relative -mt-16 px-6">
        <div className="flex flex-col md:flex-row md:items-end space-y-4 md:space-y-0 md:space-x-6">
          {/* Avatar */}
          <div className="relative">
            {community.avatar ? (
              <img
                src={community.avatar}
                alt={community.displayName}
                className="w-32 h-32 rounded-xl border-4 border-black/50 object-cover"
              />
            ) : (
              <div className="w-32 h-32 rounded-xl border-4 border-black/50 bg-gradient-to-br from-cyan-400 to-purple-500 flex items-center justify-center">
                <span className="text-4xl">🏔️</span>
              </div>
            )}

            {/* Official Badge */}
            {community.isOfficial && (
              <div className="absolute -top-2 -right-2 bg-gradient-to-r from-yellow-400 to-orange-500 text-black px-2 py-1 rounded-full text-xs font-bold">
                ✓ OFFICIAL
              </div>
            )}
          </div>

          {/* Info */}
          <div className="flex-1 space-y-2">
            <div>
              <h1 className="text-3xl font-display font-bold text-white mb-1">
                {community.displayName}
              </h1>
              <p className="text-purple-400 text-lg">@{community.name}</p>
            </div>

            <p className="text-gray-300 max-w-2xl">{community.description}</p>

            {/* Stats */}
            <div className="flex items-center space-x-6 text-sm text-gray-400">
              <div className="flex items-center space-x-1">
                <span>👥</span>
                <span>{community.membersCount.toLocaleString()} members</span>
              </div>
              <div className="flex items-center space-x-1">
                <span>📅</span>
                <span>Created {new Date(community.createdAt).toLocaleDateString()}</span>
              </div>
              <div className="flex items-center space-x-1">
                <span>🏷️</span>
                <span className="capitalize">{community.category}</span>
              </div>
            </div>

            {/* Tags */}
            {community.tags.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {community.tags.map((tag, index) => (
                  <span
                    key={index}
                    className="px-2 py-1 bg-purple-600/20 border border-purple-500/30 text-purple-300 rounded-lg text-xs"
                  >
                    #{tag}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex flex-col space-y-2 md:items-end">
            {/* Join/Edit Button */}
            {canEdit ? (
              <button
                onClick={onEditClick}
                className="px-6 py-2 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white rounded-xl font-semibold transition-all"
              >
                ✏️ Edit Community
              </button>
            ) : !isMember ? (
              <button
                onClick={onJoinClick}
                disabled={joining}
                className="px-6 py-2 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 disabled:from-gray-600 disabled:to-gray-700 text-white rounded-xl font-semibold transition-all"
              >
                {joining ? 'Joining...' : '+ Join Community'}
              </button>
            ) : (
              <div className="px-6 py-2 bg-green-600/20 border border-green-500/30 text-green-300 rounded-xl font-semibold">
                ✓ Member
              </div>
            )}

            {/* Membership Role */}
            {isMember && community.userMembership && (
              <div className="text-sm text-gray-400">
                <span className="capitalize">{community.userMembership.role.toLowerCase()}</span>
                {' • '}
                <span>
                  Joined {new Date(community.userMembership.joinedAt).toLocaleDateString()}
                </span>
              </div>
            )}

            {/* Visibility Badge */}
            <div className="flex items-center space-x-2">
              {community.visibility === 'PRIVATE' && (
                <span className="px-2 py-1 bg-red-600/20 border border-red-500/30 text-red-300 rounded text-xs">
                  🔒 Private
                </span>
              )}
              {community.visibility === 'INVITE_ONLY' && (
                <span className="px-2 py-1 bg-yellow-600/20 border border-yellow-500/30 text-yellow-300 rounded text-xs">
                  📨 Invite Only
                </span>
              )}
              {community.isTokenGated && (
                <span className="px-2 py-1 bg-purple-600/20 border border-purple-500/30 text-purple-300 rounded text-xs">
                  🎟️ Token Gated
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}