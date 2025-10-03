/**
 * URL Validation Utilities for Security
 * Prevents XSS, SSRF, and malicious URL attacks
 */

// Allowed protocols for media URLs
const ALLOWED_PROTOCOLS = ['http:', 'https:', 'data:']

// Allowed protocols for general URLs (no data URLs for external links)
const SAFE_PROTOCOLS = ['http:', 'https:']

// Blocked hosts that could be used for SSRF attacks
const BLOCKED_HOSTS = [
  'localhost',
  '127.0.0.1',
  '0.0.0.0',
  '::1',
  '169.254.169.254', // AWS metadata endpoint
  'metadata.google.internal' // GCP metadata endpoint
]

// Common CDN domains that are trusted for media
const TRUSTED_CDN_DOMAINS = [
  'cloudinary.com',
  'imgur.com',
  'giphy.com',
  'githubusercontent.com',
  'googleusercontent.com',
  'twimg.com',
  'discordapp.com',
  'cdn.discordapp.com',
  'pbs.twimg.com',
  'i.imgur.com',
  'media.giphy.com'
]

/**
 * Validates if a URL is safe to use
 * @param url - URL to validate
 * @param options - Validation options
 * @returns Validation result with sanitized URL or error
 */
export function validateUrl(
  url: string,
  options: {
    allowDataUrls?: boolean
    requireHttps?: boolean
    allowedDomains?: string[]
    maxLength?: number
  } = {}
): { valid: boolean; url?: string; error?: string } {
  const {
    allowDataUrls = false,
    requireHttps = false,
    allowedDomains,
    maxLength = 2048
  } = options

  // Check URL length to prevent DoS
  if (url.length > maxLength) {
    return {
      valid: false,
      error: `URL too long (max ${maxLength} characters)`
    }
  }

  // Check for null bytes (potential security issue)
  if (url.includes('\0')) {
    return {
      valid: false,
      error: 'URL contains null bytes'
    }
  }

  // Parse URL
  let parsedUrl: URL
  try {
    parsedUrl = new URL(url)
  } catch (e) {
    return {
      valid: false,
      error: 'Invalid URL format'
    }
  }

  // Validate protocol
  const allowedProtocols = allowDataUrls ? ALLOWED_PROTOCOLS : SAFE_PROTOCOLS
  if (!allowedProtocols.includes(parsedUrl.protocol)) {
    return {
      valid: false,
      error: `Protocol not allowed: ${parsedUrl.protocol}`
    }
  }

  // Check HTTPS requirement
  if (requireHttps && parsedUrl.protocol !== 'https:') {
    return {
      valid: false,
      error: 'HTTPS required'
    }
  }

  // For data URLs, validate format
  if (parsedUrl.protocol === 'data:') {
    if (!allowDataUrls) {
      return {
        valid: false,
        error: 'Data URLs not allowed'
      }
    }

    // Validate data URL format (image only)
    const dataUrlPattern = /^data:image\/(png|jpeg|jpg|gif|webp|svg\+xml);base64,/i
    if (!dataUrlPattern.test(url)) {
      return {
        valid: false,
        error: 'Invalid data URL format (only base64 images allowed)'
      }
    }

    return { valid: true, url }
  }

  // Block internal/private hosts (SSRF protection)
  const hostname = parsedUrl.hostname.toLowerCase()

  // Check blocked hosts
  if (BLOCKED_HOSTS.some(blocked => hostname === blocked || hostname.endsWith(`.${blocked}`))) {
    return {
      valid: false,
      error: 'Access to internal hosts not allowed'
    }
  }

  // Check for private IP ranges (SSRF protection)
  if (isPrivateIP(hostname)) {
    return {
      valid: false,
      error: 'Access to private IP addresses not allowed'
    }
  }

  // Validate against allowed domains if specified
  if (allowedDomains && allowedDomains.length > 0) {
    const isAllowed = allowedDomains.some(domain =>
      hostname === domain || hostname.endsWith(`.${domain}`)
    )
    if (!isAllowed) {
      return {
        valid: false,
        error: 'Domain not in allowed list'
      }
    }
  }

  return {
    valid: true,
    url: parsedUrl.toString() // Return normalized URL
  }
}

/**
 * Validates media URL (images, videos)
 * More permissive than general URLs, allows data URLs
 */
export function validateMediaUrl(url: string): { valid: boolean; url?: string; error?: string } {
  return validateUrl(url, {
    allowDataUrls: true,
    requireHttps: false,
    maxLength: 10000 // Allow larger data URLs
  })
}

/**
 * Validates image URL specifically
 */
export function validateImageUrl(url: string): { valid: boolean; url?: string; error?: string } {
  const result = validateMediaUrl(url)

  if (!result.valid) {
    return result
  }

  // Check file extension for non-data URLs
  if (!url.startsWith('data:')) {
    const urlObj = new URL(url)
    const pathname = urlObj.pathname.toLowerCase()
    const validExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg', '.avif']

    const hasValidExtension = validExtensions.some(ext => pathname.endsWith(ext))

    // Allow URLs without extensions if they're from trusted CDNs
    if (!hasValidExtension) {
      const isTrustedCDN = TRUSTED_CDN_DOMAINS.some(domain =>
        urlObj.hostname.toLowerCase().includes(domain)
      )

      if (!isTrustedCDN) {
        return {
          valid: false,
          error: 'Image URL must have valid extension or be from trusted CDN'
        }
      }
    }
  }

  return result
}

/**
 * Validates external link URL (stricter, no data URLs)
 */
export function validateExternalUrl(url: string): { valid: boolean; url?: string; error?: string } {
  return validateUrl(url, {
    allowDataUrls: false,
    requireHttps: false
  })
}

/**
 * Checks if hostname is a private IP address
 */
function isPrivateIP(hostname: string): boolean {
  // IPv4 private ranges
  const ipv4Pattern = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/
  const match = hostname.match(ipv4Pattern)

  if (match) {
    const octets = match.slice(1).map(Number)

    // 10.0.0.0/8
    if (octets[0] === 10) return true

    // 172.16.0.0/12
    if (octets[0] === 172 && octets[1] >= 16 && octets[1] <= 31) return true

    // 192.168.0.0/16
    if (octets[0] === 192 && octets[1] === 168) return true

    // 127.0.0.0/8 (loopback)
    if (octets[0] === 127) return true

    // 169.254.0.0/16 (link-local)
    if (octets[0] === 169 && octets[1] === 254) return true
  }

  // IPv6 private/local addresses
  if (hostname.includes(':')) {
    const lower = hostname.toLowerCase()
    if (lower.startsWith('fc') || lower.startsWith('fd')) return true // ULA
    if (lower.startsWith('fe80:')) return true // Link-local
    if (lower === '::1') return true // Loopback
  }

  return false
}

/**
 * Sanitizes an array of media URLs
 * Returns only valid URLs, filters out invalid ones
 */
export function sanitizeMediaUrls(urls: string[]): string[] {
  return urls
    .map(url => {
      const result = validateMediaUrl(url)
      return result.valid ? result.url! : null
    })
    .filter((url): url is string => url !== null)
}

/**
 * Validates URL and throws error if invalid
 * Useful for API validation
 */
export function assertValidUrl(url: string, type: 'media' | 'image' | 'external' = 'external'): string {
  let result: { valid: boolean; url?: string; error?: string }

  switch (type) {
    case 'media':
      result = validateMediaUrl(url)
      break
    case 'image':
      result = validateImageUrl(url)
      break
    case 'external':
      result = validateExternalUrl(url)
      break
  }

  if (!result.valid) {
    throw new Error(`Invalid ${type} URL: ${result.error}`)
  }

  return result.url!
}
