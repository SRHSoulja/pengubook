// Community Moderation Permissions System

export const MOD_PERMISSIONS = {
  // Content Management
  MANAGE_POSTS: 'manage_posts',           // Edit/delete posts in community
  MANAGE_COMMENTS: 'manage_comments',     // Edit/delete comments
  PIN_POSTS: 'pin_posts',                 // Pin/unpin posts

  // Member Management
  MANAGE_MEMBERS: 'manage_members',       // Kick/ban members
  MANAGE_ROLES: 'manage_roles',           // Assign custom titles to members
  VIEW_MEMBER_INFO: 'view_member_info',   // View detailed member information

  // Community Settings
  EDIT_COMMUNITY: 'edit_community',       // Edit community info, description, avatar, banner
  MANAGE_RULES: 'manage_rules',           // Edit community rules
  MANAGE_CATEGORIES: 'manage_categories', // Edit categories/tags

  // Moderation Tools
  VIEW_MOD_LOGS: 'view_mod_logs',         // View moderation action logs
  MANAGE_REPORTS: 'manage_reports',       // Handle user reports
  MUTE_MEMBERS: 'mute_members',           // Temporarily mute members

  // Advanced
  MANAGE_MODERATORS: 'manage_moderators', // Add/remove other moderators (creator only)
  MANAGE_AUTOMOD: 'manage_automod',       // Configure automod rules
  VIEW_ANALYTICS: 'view_analytics',       // View community analytics
} as const

export type ModPermission = typeof MOD_PERMISSIONS[keyof typeof MOD_PERMISSIONS]

// Permission Presets for quick assignment
export const PERMISSION_PRESETS = {
  FULL_MODERATOR: [
    MOD_PERMISSIONS.MANAGE_POSTS,
    MOD_PERMISSIONS.MANAGE_COMMENTS,
    MOD_PERMISSIONS.PIN_POSTS,
    MOD_PERMISSIONS.MANAGE_MEMBERS,
    MOD_PERMISSIONS.MANAGE_ROLES,
    MOD_PERMISSIONS.VIEW_MEMBER_INFO,
    MOD_PERMISSIONS.EDIT_COMMUNITY,
    MOD_PERMISSIONS.MANAGE_RULES,
    MOD_PERMISSIONS.VIEW_MOD_LOGS,
    MOD_PERMISSIONS.MANAGE_REPORTS,
    MOD_PERMISSIONS.MUTE_MEMBERS,
    MOD_PERMISSIONS.VIEW_ANALYTICS,
  ],

  CONTENT_MODERATOR: [
    MOD_PERMISSIONS.MANAGE_POSTS,
    MOD_PERMISSIONS.MANAGE_COMMENTS,
    MOD_PERMISSIONS.PIN_POSTS,
    MOD_PERMISSIONS.VIEW_MOD_LOGS,
    MOD_PERMISSIONS.MANAGE_REPORTS,
  ],

  COMMUNITY_HELPER: [
    MOD_PERMISSIONS.MANAGE_POSTS,
    MOD_PERMISSIONS.MANAGE_COMMENTS,
    MOD_PERMISSIONS.MANAGE_REPORTS,
  ],

  ADMIN_MODERATOR: [
    MOD_PERMISSIONS.MANAGE_MEMBERS,
    MOD_PERMISSIONS.MANAGE_ROLES,
    MOD_PERMISSIONS.VIEW_MEMBER_INFO,
    MOD_PERMISSIONS.MUTE_MEMBERS,
    MOD_PERMISSIONS.VIEW_MOD_LOGS,
  ],

  // Creator has ALL permissions by default
  CREATOR: Object.values(MOD_PERMISSIONS),
} as const

// Permission descriptions for UI
export const PERMISSION_DESCRIPTIONS = {
  [MOD_PERMISSIONS.MANAGE_POSTS]: {
    name: 'Manage Posts',
    description: 'Edit and delete posts in the community',
    icon: '📝',
  },
  [MOD_PERMISSIONS.MANAGE_COMMENTS]: {
    name: 'Manage Comments',
    description: 'Edit and delete comments on posts',
    icon: '💬',
  },
  [MOD_PERMISSIONS.PIN_POSTS]: {
    name: 'Pin Posts',
    description: 'Pin and unpin important posts',
    icon: '📌',
  },
  [MOD_PERMISSIONS.MANAGE_MEMBERS]: {
    name: 'Manage Members',
    description: 'Kick and ban members from the community',
    icon: '👥',
  },
  [MOD_PERMISSIONS.MANAGE_ROLES]: {
    name: 'Manage Roles',
    description: 'Assign custom titles and roles to members',
    icon: '🏷️',
  },
  [MOD_PERMISSIONS.VIEW_MEMBER_INFO]: {
    name: 'View Member Info',
    description: 'View detailed information about members',
    icon: '👤',
  },
  [MOD_PERMISSIONS.EDIT_COMMUNITY]: {
    name: 'Edit Community',
    description: 'Edit community name, description, avatar, and banner',
    icon: '✏️',
  },
  [MOD_PERMISSIONS.MANAGE_RULES]: {
    name: 'Manage Rules',
    description: 'Create and edit community rules',
    icon: '📜',
  },
  [MOD_PERMISSIONS.MANAGE_CATEGORIES]: {
    name: 'Manage Categories',
    description: 'Edit community categories and tags',
    icon: '🏷️',
  },
  [MOD_PERMISSIONS.VIEW_MOD_LOGS]: {
    name: 'View Mod Logs',
    description: 'View history of moderation actions',
    icon: '📋',
  },
  [MOD_PERMISSIONS.MANAGE_REPORTS]: {
    name: 'Manage Reports',
    description: 'Review and handle user reports',
    icon: '🚩',
  },
  [MOD_PERMISSIONS.MUTE_MEMBERS]: {
    name: 'Mute Members',
    description: 'Temporarily mute members in the community',
    icon: '🔇',
  },
  [MOD_PERMISSIONS.MANAGE_MODERATORS]: {
    name: 'Manage Moderators',
    description: 'Add and remove other moderators (Creator only)',
    icon: '👑',
  },
  [MOD_PERMISSIONS.MANAGE_AUTOMOD]: {
    name: 'Manage AutoMod',
    description: 'Configure automatic moderation rules',
    icon: '🤖',
  },
  [MOD_PERMISSIONS.VIEW_ANALYTICS]: {
    name: 'View Analytics',
    description: 'View community statistics and analytics',
    icon: '📊',
  },
} as const

// Helper function to check if user has a specific permission
export function hasPermission(
  userPermissions: string[],
  requiredPermission: ModPermission
): boolean {
  return userPermissions.includes(requiredPermission)
}

// Helper function to check if user has ANY of the required permissions
export function hasAnyPermission(
  userPermissions: string[],
  requiredPermissions: ModPermission[]
): boolean {
  return requiredPermissions.some(perm => userPermissions.includes(perm))
}

// Helper function to check if user has ALL of the required permissions
export function hasAllPermissions(
  userPermissions: string[],
  requiredPermissions: ModPermission[]
): boolean {
  return requiredPermissions.every(perm => userPermissions.includes(perm))
}

// Helper to check if user is creator or has mod role
export function canModerate(
  userId: string,
  communityCreatorId: string,
  moderators: { userId: string; permissions: string }[]
): { isMod: boolean; isCreator: boolean; permissions: string[] } {
  const isCreator = userId === communityCreatorId

  if (isCreator) {
    return {
      isMod: true,
      isCreator: true,
      permissions: PERMISSION_PRESETS.CREATOR,
    }
  }

  const modRecord = moderators.find(mod => mod.userId === userId)

  if (modRecord) {
    return {
      isMod: true,
      isCreator: false,
      permissions: JSON.parse(modRecord.permissions),
    }
  }

  return {
    isMod: false,
    isCreator: false,
    permissions: [],
  }
}
