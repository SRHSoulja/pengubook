import DOMPurify from 'isomorphic-dompurify'

/**
 * Sanitize user-generated HTML content to prevent XSS attacks
 *
 * Usage:
 * - For plain text: sanitizeText(input)
 * - For rich text with links: sanitizeHtml(input)
 * - For inline text (no block elements): sanitizeInlineText(input)
 */

/**
 * Sanitize plain text user input (strips all HTML tags)
 * Use for: usernames, display names, bio (if not allowing formatting)
 */
export function sanitizeText(input: string): string {
  if (!input) return ''

  // Strip all HTML tags, only keep text
  return DOMPurify.sanitize(input, {
    ALLOWED_TAGS: [],
    ALLOWED_ATTR: [],
    KEEP_CONTENT: true
  }).trim()
}

/**
 * Sanitize HTML content (allows safe formatting tags)
 * Use for: post content, comments, bio (if allowing formatting)
 *
 * Allows: bold, italic, links, line breaks
 * Blocks: scripts, iframes, forms, dangerous attributes
 */
export function sanitizeHtml(input: string): string {
  if (!input) return ''

  return DOMPurify.sanitize(input, {
    ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'a', 'br', 'p', 'ul', 'ol', 'li'],
    ALLOWED_ATTR: {
      a: ['href', 'rel', 'target']
    },
    ALLOW_DATA_ATTR: false,
    ALLOWED_URI_REGEXP: /^(?:(?:(?:f|ht)tps?|mailto|tel):|[^a-z]|[a-z+.\-]+(?:[^a-z+.\-:]|$))/i,
    // Add rel="noopener noreferrer" to all links
    HOOKS: {
      afterSanitizeAttributes: (node) => {
        if (node.tagName === 'A') {
          node.setAttribute('rel', 'noopener noreferrer')
          node.setAttribute('target', '_blank')
        }
      }
    }
  } as any).trim()
}

/**
 * Sanitize inline text (allows inline formatting only, no blocks)
 * Use for: short descriptions, captions, titles
 *
 * Allows: bold, italic, links (inline only)
 * Blocks: paragraphs, lists, line breaks
 */
export function sanitizeInlineText(input: string): string {
  if (!input) return ''

  return DOMPurify.sanitize(input, {
    ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'a'],
    ALLOWED_ATTR: {
      a: ['href']
    },
    ALLOW_DATA_ATTR: false
  } as any).trim()
}

/**
 * Sanitize URL to prevent javascript: and data: URL attacks
 * Use for: validating user-provided URLs
 */
export function sanitizeUrl(url: string): string {
  if (!url) return ''

  const sanitized = DOMPurify.sanitize(url, {
    ALLOWED_TAGS: [],
    ALLOWED_ATTR: []
  })

  // Check if URL is safe (http/https only)
  const urlPattern = /^https?:\/\//i
  if (!urlPattern.test(sanitized)) {
    return ''
  }

  return sanitized
}

/**
 * Escape HTML entities (for displaying user input as-is in HTML)
 * Use when you want to show exactly what user typed (no formatting)
 */
export function escapeHtml(text: string): string {
  if (!text) return ''

  const map: { [key: string]: string } = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#x27;',
    '/': '&#x2F;'
  }

  return text.replace(/[&<>"'/]/g, (char) => map[char])
}

/**
 * Validate and sanitize email addresses
 * Returns empty string if invalid email format
 */
export function sanitizeEmail(email: string): string {
  if (!email) return ''

  const sanitized = email.trim().toLowerCase()
  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

  return emailPattern.test(sanitized) ? sanitized : ''
}

/**
 * Validate and sanitize usernames
 * Allows: alphanumeric, underscore, hyphen
 * Length: 3-30 characters
 */
export function sanitizeUsername(username: string): string {
  if (!username) return ''

  // Remove all non-alphanumeric characters except underscore and hyphen
  const sanitized = username.replace(/[^a-zA-Z0-9_-]/g, '')

  // Enforce length constraints
  if (sanitized.length < 3 || sanitized.length > 30) {
    return ''
  }

  return sanitized
}

/**
 * Strip markdown formatting (for preview/search purposes)
 * Removes markdown syntax but keeps text content
 */
export function stripMarkdown(markdown: string): string {
  if (!markdown) return ''

  return markdown
    .replace(/[*_~`]/g, '') // Remove formatting chars
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // Links: [text](url) -> text
    .replace(/^#+\s+/gm, '') // Headers
    .replace(/^>\s+/gm, '') // Blockquotes
    .replace(/^[-*+]\s+/gm, '') // Lists
    .replace(/^\d+\.\s+/gm, '') // Numbered lists
    .trim()
}
