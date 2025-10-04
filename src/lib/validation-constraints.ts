/**
 * Input Validation Constraints
 *
 * Defines maximum length limits for all user inputs to prevent:
 * - Database performance issues from overly long strings
 * - DoS attacks via large payloads
 * - Poor UX from unreadable long strings
 *
 * These limits are enforced both client-side (maxLength) and server-side (validation).
 */

export const INPUT_LIMITS = {
  // User Profile
  USERNAME: 30,              // Twitter: 15, Discord: 32, we use 30
  DISPLAY_NAME: 100,         // Full name or display name
  BIO: 500,                  // User bio/about section
  WALLET_ADDRESS: 42,        // Ethereum address (0x + 40 chars)

  // Social Links
  DISCORD_NAME: 32,          // Discord username max
  TWITTER_HANDLE: 15,        // Twitter handle max
  URL: 2048,                 // Standard max URL length

  // Posts & Comments
  POST_CONTENT: 2000,        // Post text content (already enforced in UI)
  COMMENT_CONTENT: 1000,     // Comment text
  POST_TITLE: 200,           // If posts ever have titles

  // Communities
  COMMUNITY_NAME: 100,       // Community name
  COMMUNITY_DESCRIPTION: 500, // Community description
  COMMUNITY_RULES: 2000,     // Community rules text

  // Messages
  MESSAGE_CONTENT: 2000,     // Direct message content
  GROUP_NAME: 100,           // Group chat name

  // Achievements & Levels
  ACHIEVEMENT_NAME: 100,     // Achievement name
  ACHIEVEMENT_DESC: 300,     // Achievement description
  LEVEL_NAME: 50,            // Level name

  // Moderation
  REPORT_REASON: 500,        // Report reason text
  BAN_REASON: 500,           // Ban reason for admins

  // Tags & Categories
  TAG_NAME: 30,              // Hashtag or tag
  CATEGORY_NAME: 50,         // Category name

  // Media
  MEDIA_URL: 2048,           // Image/video URLs
  MEDIA_ALT_TEXT: 200,       // Alt text for accessibility

  // Search
  SEARCH_QUERY: 200,         // Search query text

  // Tokens & NFTs
  TOKEN_SYMBOL: 10,          // Token symbol (ETH, BTC, etc.)
  TOKEN_NAME: 50,            // Token full name
  NFT_NAME: 100,             // NFT name
  NFT_DESCRIPTION: 500,      // NFT description

  // Notifications
  NOTIFICATION_CONTENT: 300, // Notification text

  // General
  SHORT_TEXT: 100,           // Generic short text field
  MEDIUM_TEXT: 500,          // Generic medium text field
  LONG_TEXT: 2000,           // Generic long text field
} as const

/**
 * Validation helper function
 *
 * @param value - The input value to validate
 * @param limit - The maximum allowed length
 * @param fieldName - Name of the field for error messages
 * @returns Object with isValid boolean and optional error message
 */
export function validateLength(
  value: string | null | undefined,
  limit: number,
  fieldName: string
): { isValid: boolean; error?: string } {
  if (!value) {
    return { isValid: true }
  }

  const trimmedValue = value.trim()

  if (trimmedValue.length === 0) {
    return { isValid: true }
  }

  if (trimmedValue.length > limit) {
    return {
      isValid: false,
      error: `${fieldName} must be ${limit} characters or less (currently ${trimmedValue.length})`
    }
  }

  return { isValid: true }
}

/**
 * Batch validation helper
 *
 * @param fields - Object with field names as keys and values to validate
 * @param limits - Object with field names as keys and length limits as values
 * @returns Object with isValid boolean and array of error messages
 */
export function validateFields(
  fields: Record<string, string | null | undefined>,
  limits: Record<string, number>
): { isValid: boolean; errors: string[] } {
  const errors: string[] = []

  for (const [fieldName, value] of Object.entries(fields)) {
    const limit = limits[fieldName]
    if (limit === undefined) continue

    const result = validateLength(value, limit, fieldName)
    if (!result.isValid && result.error) {
      errors.push(result.error)
    }
  }

  return {
    isValid: errors.length === 0,
    errors
  }
}
