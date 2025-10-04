import crypto from 'crypto'

// Server-side encryption for messages (allows moderation while protecting at rest)
const ALGORITHM = 'aes-256-gcm'
const IV_LENGTH = 16
const SALT_LENGTH = 64
const TAG_LENGTH = 16
const KEY_LENGTH = 32

/**
 * Derives a key from the encryption secret using PBKDF2
 */
function deriveKey(secret: string, salt: Buffer): Buffer {
  return crypto.pbkdf2Sync(secret, salt, 100000, KEY_LENGTH, 'sha512')
}

/**
 * Encrypts text using AES-256-GCM (server-side)
 * Server can decrypt for moderation but data is encrypted at rest
 */
export function encryptMessage(text: string): string {
  if (!text) return text

  const secret = process.env.ENCRYPTION_SECRET || process.env.JWT_SECRET
  if (!secret) {
    console.warn('ENCRYPTION_SECRET not set, storing message in plain text')
    return text
  }

  try {
    // Generate random salt and IV
    const salt = crypto.randomBytes(SALT_LENGTH)
    const iv = crypto.randomBytes(IV_LENGTH)

    // Derive key from secret and salt
    const key = deriveKey(secret, salt)

    // Create cipher
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv)

    // Encrypt the text
    let encrypted = cipher.update(text, 'utf8', 'hex')
    encrypted += cipher.final('hex')

    // Get authentication tag
    const tag = cipher.getAuthTag()

    // Return salt:iv:tag:encryptedData
    return [
      salt.toString('hex'),
      iv.toString('hex'),
      tag.toString('hex'),
      encrypted
    ].join(':')
  } catch (error) {
    console.error('Message encryption failed:', error)
    return text
  }
}

/**
 * Decrypts text encrypted with encryptMessage()
 */
export function decryptMessage(encryptedText: string): string {
  if (!encryptedText) return encryptedText

  // Check if text is encrypted (has the expected format)
  const parts = encryptedText.split(':')
  if (parts.length !== 4) {
    // Not encrypted, return as-is
    return encryptedText
  }

  const secret = process.env.ENCRYPTION_SECRET || process.env.JWT_SECRET
  if (!secret) {
    console.warn('ENCRYPTION_SECRET not set, cannot decrypt')
    return encryptedText
  }

  try {
    const [saltHex, ivHex, tagHex, encryptedData] = parts

    // Convert from hex
    const salt = Buffer.from(saltHex, 'hex')
    const iv = Buffer.from(ivHex, 'hex')
    const tag = Buffer.from(tagHex, 'hex')

    // Derive the same key using salt
    const key = deriveKey(secret, salt)

    // Create decipher
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv)
    decipher.setAuthTag(tag)

    // Decrypt
    let decrypted = decipher.update(encryptedData, 'hex', 'utf8')
    decrypted += decipher.final('utf8')

    return decrypted
  } catch (error) {
    console.error('Message decryption failed:', error)
    return encryptedText
  }
}

/**
 * Checks if a string appears to be encrypted
 */
export function isEncrypted(text: string): boolean {
  if (!text) return false
  const parts = text.split(':')
  return parts.length === 4 && parts.every(part => /^[0-9a-f]+$/i.test(part))
}
