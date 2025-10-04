'use client'

import Button from '@/components/ui/Button'

/**
 * Empty State Components
 *
 * Reusable empty state components that provide better UX
 * when there's no content to display.
 */

interface EmptyStateProps {
  icon?: string
  title: string
  description: string
  actionLabel?: string
  actionHref?: string
  onAction?: () => void
  className?: string
}

export function EmptyState({
  icon = '🐧',
  title,
  description,
  actionLabel,
  actionHref,
  onAction,
  className = ''
}: EmptyStateProps) {
  return (
    <div className={`text-center py-12 px-6 ${className}`}>
      <div className="text-6xl mb-4 animate-float">{icon}</div>
      <h2 className="text-2xl font-bold text-white mb-2">{title}</h2>
      <p className="text-gray-300 mb-6 max-w-md mx-auto">{description}</p>
      {(actionLabel && (actionHref || onAction)) && (
        actionHref ? (
          <a href={actionHref}>
            <Button variant="primary" size="lg">
              {actionLabel}
            </Button>
          </a>
        ) : (
          <Button variant="primary" size="lg" onClick={onAction}>
            {actionLabel}
          </Button>
        )
      )}
    </div>
  )
}

export function EmptyFeed({ followingOnly = false }: { followingOnly?: boolean }) {
  return (
    <EmptyState
      icon="🐧"
      title="No posts yet!"
      description={
        followingOnly
          ? "You haven't followed anyone yet, or they haven't posted. Start following penguins to see their posts!"
          : "Be the first penguin to break the ice! Share something with the colony."
      }
      actionLabel={followingOnly ? "Discover Penguins" : "Create First Post"}
      actionHref={followingOnly ? "/discover" : undefined}
      onAction={followingOnly ? undefined : () => window.scrollTo({ top: 0, behavior: 'smooth' })}
    />
  )
}

export function EmptyProfile({ isOwnProfile = false }: { isOwnProfile?: boolean }) {
  return (
    <EmptyState
      icon="📝"
      title={isOwnProfile ? "Your iceberg is empty!" : "No posts yet"}
      description={
        isOwnProfile
          ? "You haven't posted anything yet. Share your first adventure with the colony!"
          : "This penguin hasn't shared anything yet. Check back later!"
      }
      actionLabel={isOwnProfile ? "Create Your First Post" : undefined}
      actionHref={isOwnProfile ? "/feed" : undefined}
    />
  )
}

export function EmptyCommunities() {
  return (
    <EmptyState
      icon="🏔️"
      title="No communities yet!"
      description="Join or create a community to connect with like-minded penguins and share your interests."
      actionLabel="Discover Communities"
      actionHref="/communities"
    />
  )
}

export function EmptyBookmarks() {
  return (
    <EmptyState
      icon="🔖"
      title="No bookmarks saved"
      description="Bookmark your favorite posts to easily find them later. Look for the bookmark button on any post!"
      actionLabel="Explore Feed"
      actionHref="/feed"
    />
  )
}

export function EmptyFriends() {
  return (
    <EmptyState
      icon="👥"
      title="No friends yet"
      description="Start making connections! Send friend requests to penguins you'd like to waddle with."
      actionLabel="Discover Penguins"
      actionHref="/discover"
    />
  )
}

export function EmptyMessages() {
  return (
    <EmptyState
      icon="💬"
      title="No messages yet"
      description="Start a conversation! Send a message to a friend or create a group chat."
      actionLabel="Find Friends"
      actionHref="/friends"
    />
  )
}

export function EmptyNotifications() {
  return (
    <EmptyState
      icon="🔔"
      title="All caught up!"
      description="You don't have any notifications right now. Check back later for updates from the colony."
      className="py-8"
    />
  )
}

export function EmptySearchResults({ query }: { query?: string }) {
  return (
    <EmptyState
      icon="🔍"
      title="No results found"
      description={
        query
          ? `We couldn't find any penguins, posts, or communities matching "${query}". Try a different search term.`
          : "Try searching for penguins, posts, or communities."
      }
      actionLabel="Explore Feed"
      actionHref="/feed"
    />
  )
}

export function EmptyAchievements() {
  return (
    <EmptyState
      icon="🏆"
      title="No achievements yet"
      description="Complete activities and reach milestones to earn achievements. Start posting, making friends, and engaging with the community!"
      actionLabel="View Levels"
      actionHref="/levels"
    />
  )
}
