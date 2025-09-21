// Input validation utilities for API endpoints

export interface ValidationResult {
  isValid: boolean
  errors: string[]
  sanitizedData?: any
}

export class Validator {
  private errors: string[] = []

  constructor() {
    this.errors = []
  }

  // String validation
  string(value: any, field: string, options: {
    required?: boolean
    minLength?: number
    maxLength?: number
    pattern?: RegExp
    trim?: boolean
  } = {}): string | null {
    const { required = false, minLength, maxLength, pattern, trim = true } = options

    if (value === undefined || value === null) {
      if (required) {
        this.errors.push(`${field} is required`)
      }
      return null
    }

    if (typeof value !== 'string') {
      this.errors.push(`${field} must be a string`)
      return null
    }

    let sanitized = trim ? value.trim() : value

    if (required && sanitized.length === 0) {
      this.errors.push(`${field} cannot be empty`)
      return null
    }

    if (minLength && sanitized.length < minLength) {
      this.errors.push(`${field} must be at least ${minLength} characters`)
    }

    if (maxLength && sanitized.length > maxLength) {
      this.errors.push(`${field} cannot exceed ${maxLength} characters`)
    }

    if (pattern && !pattern.test(sanitized)) {
      this.errors.push(`${field} format is invalid`)
    }

    return sanitized
  }

  // Number validation
  number(value: any, field: string, options: {
    required?: boolean
    min?: number
    max?: number
    integer?: boolean
  } = {}): number | null {
    const { required = false, min, max, integer = false } = options

    if (value === undefined || value === null) {
      if (required) {
        this.errors.push(`${field} is required`)
      }
      return null
    }

    const num = Number(value)

    if (isNaN(num)) {
      this.errors.push(`${field} must be a valid number`)
      return null
    }

    if (integer && !Number.isInteger(num)) {
      this.errors.push(`${field} must be an integer`)
    }

    if (min !== undefined && num < min) {
      this.errors.push(`${field} must be at least ${min}`)
    }

    if (max !== undefined && num > max) {
      this.errors.push(`${field} cannot exceed ${max}`)
    }

    return num
  }

  // Boolean validation
  boolean(value: any, field: string, required = false): boolean | null {
    if (value === undefined || value === null) {
      if (required) {
        this.errors.push(`${field} is required`)
      }
      return null
    }

    if (typeof value === 'boolean') {
      return value
    }

    if (typeof value === 'string') {
      const lower = value.toLowerCase()
      if (lower === 'true' || lower === '1') return true
      if (lower === 'false' || lower === '0') return false
    }

    if (typeof value === 'number') {
      return value !== 0
    }

    this.errors.push(`${field} must be a valid boolean`)
    return null
  }

  // Array validation
  array(value: any, field: string, options: {
    required?: boolean
    minLength?: number
    maxLength?: number
    itemValidator?: (item: any, index: number) => boolean
  } = {}): any[] | null {
    const { required = false, minLength, maxLength, itemValidator } = options

    if (value === undefined || value === null) {
      if (required) {
        this.errors.push(`${field} is required`)
      }
      return null
    }

    if (!Array.isArray(value)) {
      // Try to parse if it's a JSON string
      if (typeof value === 'string') {
        try {
          value = JSON.parse(value)
          if (!Array.isArray(value)) {
            this.errors.push(`${field} must be an array`)
            return null
          }
        } catch {
          this.errors.push(`${field} must be a valid array`)
          return null
        }
      } else {
        this.errors.push(`${field} must be an array`)
        return null
      }
    }

    if (minLength && value.length < minLength) {
      this.errors.push(`${field} must have at least ${minLength} items`)
    }

    if (maxLength && value.length > maxLength) {
      this.errors.push(`${field} cannot have more than ${maxLength} items`)
    }

    if (itemValidator) {
      value.forEach((item, index) => {
        if (!itemValidator(item, index)) {
          this.errors.push(`${field}[${index}] is invalid`)
        }
      })
    }

    return value
  }

  // Email validation
  email(value: any, field: string, required = false): string | null {
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return this.string(value, field, {
      required,
      pattern: emailPattern,
      maxLength: 254
    })
  }

  // URL validation
  url(value: any, field: string, required = false): string | null {
    const urlPattern = /^https?:\/\/(?:[-\w.])+(?:\:[0-9]+)?(?:\/(?:[\w\/_.])*(?:\?(?:[\w&=%.])*)?(?:\#(?:[\w.])*)?)?$/
    return this.string(value, field, {
      required,
      pattern: urlPattern,
      maxLength: 2048
    })
  }

  // Wallet address validation
  walletAddress(value: any, field: string, required = false): string | null {
    const walletPattern = /^0x[a-fA-F0-9]{40}$/
    return this.string(value, field, {
      required,
      pattern: walletPattern,
      trim: true
    })
  }

  // Username validation
  username(value: any, field: string, required = false): string | null {
    const usernamePattern = /^[a-zA-Z0-9_-]+$/
    return this.string(value, field, {
      required,
      pattern: usernamePattern,
      minLength: 3,
      maxLength: 30,
      trim: true
    })
  }

  // Community name validation
  communityName(value: any, field: string, required = false): string | null {
    const communityPattern = /^[a-zA-Z0-9_-]+$/
    return this.string(value, field, {
      required,
      pattern: communityPattern,
      minLength: 3,
      maxLength: 50,
      trim: true
    })
  }

  // Content validation (posts, comments)
  content(value: any, field: string, maxLength = 2000, required = true): string | null {
    return this.string(value, field, {
      required,
      maxLength,
      minLength: required ? 1 : 0,
      trim: true
    })
  }

  // Get validation result
  getResult(sanitizedData?: any): ValidationResult {
    return {
      isValid: this.errors.length === 0,
      errors: [...this.errors],
      sanitizedData
    }
  }

  // Clear errors for reuse
  clear(): void {
    this.errors = []
  }
}

// Convenience function for quick validation
export function validate(validationFn: (validator: Validator) => any): ValidationResult {
  const validator = new Validator()
  const sanitizedData = validationFn(validator)
  return validator.getResult(sanitizedData)
}

// Common validation schemas
export const schemas = {
  createPost: (data: any) => validate((v) => ({
    content: v.content(data.content, 'content', 2000, true),
    contentType: v.string(data.contentType, 'contentType', { required: false }) || 'TEXT',
    mediaUrls: v.array(data.mediaUrls, 'mediaUrls', { maxLength: 10 }) || [],
    visibility: v.string(data.visibility, 'visibility', { required: false }) || 'PUBLIC'
  })),

  createComment: (data: any) => validate((v) => ({
    content: v.content(data.content, 'content', 500, true)
  })),

  createCommunity: (data: any) => validate((v) => ({
    name: v.communityName(data.name, 'name', true),
    displayName: v.string(data.displayName, 'displayName', { required: true, maxLength: 100 }),
    description: v.string(data.description, 'description', { required: true, maxLength: 1000 }),
    category: v.string(data.category, 'category', { required: true, maxLength: 50 }),
    avatar: v.url(data.avatar, 'avatar'),
    banner: v.url(data.banner, 'banner'),
    tags: v.array(data.tags, 'tags', { maxLength: 10 }) || [],
    visibility: v.string(data.visibility, 'visibility') || 'PUBLIC',
    rules: v.string(data.rules, 'rules', { maxLength: 5000 })
  })),

  updateProfile: (data: any) => validate((v) => ({
    username: v.username(data.username, 'username'),
    displayName: v.string(data.displayName, 'displayName', { maxLength: 100 }),
    bio: v.string(data.bio, 'bio', { maxLength: 500 }),
    interests: v.array(data.interests, 'interests', { maxLength: 20 })
  }))
}