'use client'

/**
 * Skeleton Card Component
 *
 * Reusable skeleton loading component that provides a better UX
 * than full-page loaders by showing content structure while loading.
 */

export function SkeletonPostCard() {
  return (
    <div className="glass-card p-6 animate-pulse">
      {/* Header */}
      <div className="flex items-start space-x-4 mb-4">
        {/* Avatar */}
        <div className="w-12 h-12 bg-white/10 rounded-full flex-shrink-0"></div>

        <div className="flex-1 space-y-2">
          {/* Username */}
          <div className="h-4 bg-white/10 rounded w-32"></div>
          {/* Metadata */}
          <div className="h-3 bg-white/10 rounded w-48"></div>
        </div>
      </div>

      {/* Content */}
      <div className="space-y-3 mb-4">
        <div className="h-4 bg-white/10 rounded w-full"></div>
        <div className="h-4 bg-white/10 rounded w-5/6"></div>
        <div className="h-4 bg-white/10 rounded w-4/6"></div>
      </div>

      {/* Engagement stats */}
      <div className="flex items-center space-x-6 mb-4 pb-4 border-b border-white/10">
        <div className="h-3 bg-white/10 rounded w-20"></div>
        <div className="h-3 bg-white/10 rounded w-20"></div>
        <div className="h-3 bg-white/10 rounded w-20"></div>
      </div>

      {/* Reaction buttons */}
      <div className="flex items-center flex-wrap gap-2">
        {[1, 2, 3, 4, 5, 6, 7].map((i) => (
          <div key={i} className="h-10 bg-white/10 rounded-lg w-16"></div>
        ))}
      </div>
    </div>
  )
}

export function SkeletonUserCard() {
  return (
    <div className="glass-card p-6 animate-pulse">
      {/* Profile header */}
      <div className="flex items-center space-x-4 mb-4">
        {/* Avatar */}
        <div className="w-16 h-16 bg-white/10 rounded-full flex-shrink-0"></div>

        <div className="flex-1 space-y-2">
          {/* Name */}
          <div className="h-5 bg-white/10 rounded w-32"></div>
          {/* Username */}
          <div className="h-4 bg-white/10 rounded w-24"></div>
        </div>
      </div>

      {/* Bio */}
      <div className="space-y-2 mb-4">
        <div className="h-3 bg-white/10 rounded w-full"></div>
        <div className="h-3 bg-white/10 rounded w-4/5"></div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="h-12 bg-white/10 rounded"></div>
        <div className="h-12 bg-white/10 rounded"></div>
        <div className="h-12 bg-white/10 rounded"></div>
      </div>
    </div>
  )
}

export function SkeletonCommunityCard() {
  return (
    <div className="glass-card p-6 animate-pulse">
      {/* Banner */}
      <div className="h-32 bg-white/10 rounded-lg mb-4"></div>

      {/* Community info */}
      <div className="flex items-center space-x-3 mb-4">
        {/* Icon */}
        <div className="w-12 h-12 bg-white/10 rounded-lg flex-shrink-0"></div>

        <div className="flex-1 space-y-2">
          {/* Name */}
          <div className="h-5 bg-white/10 rounded w-40"></div>
          {/* Members */}
          <div className="h-3 bg-white/10 rounded w-24"></div>
        </div>
      </div>

      {/* Description */}
      <div className="space-y-2">
        <div className="h-3 bg-white/10 rounded w-full"></div>
        <div className="h-3 bg-white/10 rounded w-3/4"></div>
      </div>
    </div>
  )
}

export function SkeletonProfileHeader() {
  return (
    <div className="glass-card overflow-hidden animate-pulse">
      {/* Banner */}
      <div className="h-48 bg-white/10"></div>

      {/* Profile info */}
      <div className="p-6">
        <div className="flex items-start gap-6">
          {/* Avatar */}
          <div className="w-32 h-32 bg-white/10 rounded-full border-4 border-gray-900 -mt-20 flex-shrink-0"></div>

          <div className="flex-1 pt-2 space-y-4">
            {/* Name and username */}
            <div className="space-y-2">
              <div className="h-6 bg-white/10 rounded w-48"></div>
              <div className="h-4 bg-white/10 rounded w-32"></div>
            </div>

            {/* Bio */}
            <div className="space-y-2">
              <div className="h-3 bg-white/10 rounded w-full"></div>
              <div className="h-3 bg-white/10 rounded w-5/6"></div>
            </div>

            {/* Stats */}
            <div className="flex gap-8">
              <div className="h-4 bg-white/10 rounded w-20"></div>
              <div className="h-4 bg-white/10 rounded w-20"></div>
              <div className="h-4 bg-white/10 rounded w-20"></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export function SkeletonList({ count = 3 }: { count?: number }) {
  return (
    <div className="space-y-4">
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonPostCard key={i} />
      ))}
    </div>
  )
}
