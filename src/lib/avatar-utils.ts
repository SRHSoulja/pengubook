interface User {
  avatar?: string | null
  avatarSource?: string
  discordAvatar?: string | null
  twitterAvatar?: string | null
  displayName?: string | null
  username?: string | null
}

export function getEffectiveAvatar(user: User): string | null {
  const { avatarSource = 'default', avatar, discordAvatar, twitterAvatar } = user

  switch (avatarSource) {
    case 'discord':
      return discordAvatar || avatar || null
    case 'twitter':
      return twitterAvatar || avatar || null
    case 'default':
    default:
      return avatar || null
  }
}

export function getAvatarFallback(user: User): string {
  const displayName = user.displayName || user.username || '?'
  return displayName.charAt(0).toUpperCase()
}