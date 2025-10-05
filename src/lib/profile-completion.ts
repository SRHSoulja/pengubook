import type { User, Profile } from '@prisma/client'

export interface ProfileCompletionResult {
  percentage: number
  completedFields: string[]
  missingFields: string[]
  totalFields: number
  completedCount: number
}

/**
 * Calculate accurate profile completion percentage
 * Checks all meaningful profile fields for completeness
 */
export function calculateProfileCompletion(
  user: User & { profile: Profile | null }
): ProfileCompletionResult {
  const fields = [
    // Actually editable fields (8 fields)
    { key: 'username', value: user.username, weight: 12, label: 'Username' },
    { key: 'displayName', value: user.displayName, weight: 12, label: 'Display Name' },
    { key: 'bio', value: user.bio, weight: 13, label: 'Bio' },
    { key: 'avatar', value: user.avatar, weight: 13, label: 'Avatar' },
    { key: 'bannerImage', value: user.profile?.bannerImage, weight: 12, label: 'Banner Image' },
    { key: 'discordId', value: user.discordId, weight: 13, label: 'Discord Account Linked' },
    { key: 'twitterId', value: user.twitterId, weight: 13, label: 'Twitter/X Account Linked' },
    {
      key: 'interests',
      value: user.profile?.interests ? JSON.parse(user.profile.interests).length > 0 : false,
      weight: 12,
      label: 'Interests Added'
    },
  ]

  const completedFields: string[] = []
  const missingFields: string[] = []
  let totalWeight = 0
  let earnedWeight = 0

  for (const field of fields) {
    totalWeight += field.weight

    // Check if field is filled
    const isFilled = field.value && (
      typeof field.value === 'boolean' ? field.value :
      typeof field.value === 'string' ? field.value.trim().length > 0 :
      true
    )

    if (isFilled) {
      completedFields.push(field.label)
      earnedWeight += field.weight
    } else {
      missingFields.push(field.label)
    }
  }

  const percentage = Math.round((earnedWeight / totalWeight) * 100)

  return {
    percentage,
    completedFields,
    missingFields,
    totalFields: fields.length,
    completedCount: completedFields.length
  }
}

/**
 * Get profile completion percentage only (for achievement checking)
 */
export function getProfileCompletionPercentage(
  user: User & { profile: Profile | null }
): number {
  return calculateProfileCompletion(user).percentage
}
