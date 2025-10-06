export default function SkeletonPostCard() {
  return (
    <div className="glass-card rounded-2xl p-6 animate-pulse">
      {/* Author Info */}
      <div className="flex items-center gap-3 mb-4">
        <div className="w-12 h-12 bg-white/20 rounded-xl skeleton-shimmer" />
        <div className="flex-1">
          <div className="h-4 bg-white/20 rounded w-32 mb-2 skeleton-shimmer" />
          <div className="h-3 bg-white/20 rounded w-24 skeleton-shimmer" />
        </div>
      </div>

      {/* Content */}
      <div className="space-y-2 mb-4">
        <div className="h-4 bg-white/20 rounded w-full skeleton-shimmer" />
        <div className="h-4 bg-white/20 rounded w-5/6 skeleton-shimmer" />
        <div className="h-4 bg-white/20 rounded w-4/6 skeleton-shimmer" />
      </div>

      {/* Media Placeholder */}
      <div className="h-48 bg-white/20 rounded-xl mb-4 skeleton-shimmer" />

      {/* Action Buttons */}
      <div className="flex items-center gap-6">
        <div className="h-8 w-16 bg-white/20 rounded-lg skeleton-shimmer" />
        <div className="h-8 w-16 bg-white/20 rounded-lg skeleton-shimmer" />
        <div className="h-8 w-16 bg-white/20 rounded-lg skeleton-shimmer" />
        <div className="h-8 w-16 bg-white/20 rounded-lg skeleton-shimmer" />
      </div>
    </div>
  )
}

export function SkeletonPostGrid({ count = 3 }: { count?: number }) {
  return (
    <div className="space-y-6">
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonPostCard key={i} />
      ))}
    </div>
  )
}
