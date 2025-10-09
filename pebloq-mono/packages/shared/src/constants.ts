export const PENGU_COLORS = {
  GREEN: '#00E177',
  ORANGE: '#FFB92E'
} as const

export const UPLOAD_LIMITS = {
  DAILY_QUOTA: 50,
  MAX_FILE_SIZE: 100 * 1024 * 1024, // 100MB
  ALLOWED_TYPES: ['image', 'video']
} as const

export const RATE_LIMITS = {
  AUTH: { max: 10, window: '15m' },
  POSTS: { max: 30, window: '1h' },
  UPLOADS: { max: 20, window: '1h' }
} as const
