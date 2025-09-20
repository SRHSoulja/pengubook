/**
 * Client-side encryption utilities for secure messaging
 * Uses Web Crypto API for end-to-end encryption of private messages
 */

interface EncryptedMessage {
  encryptedContent: string
  iv: string
  salt: string
}

interface KeyPair {
  publicKey: CryptoKey
  privateKey: CryptoKey
}

export class MessageEncryption {
  private static readonly ALGORITHM = 'AES-GCM'
  private static readonly KEY_LENGTH = 256
  private static readonly IV_LENGTH = 12
  private static readonly SALT_LENGTH = 16

  /**
   * Generate a new encryption key pair for a user
   */
  static async generateKeyPair(): Promise<KeyPair> {
    return await window.crypto.subtle.generateKey(
      {
        name: 'RSA-OAEP',
        modulusLength: 2048,
        publicExponent: new Uint8Array([1, 0, 1]),
        hash: 'SHA-256',
      },
      true, // extractable
      ['encrypt', 'decrypt']
    )
  }

  /**
   * Export public key to string format for storage/sharing
   */
  static async exportPublicKey(publicKey: CryptoKey): Promise<string> {
    const exported = await window.crypto.subtle.exportKey('spki', publicKey)
    const exportedAsBase64 = btoa(String.fromCharCode(...Array.from(new Uint8Array(exported))))
    return exportedAsBase64
  }

  /**
   * Export private key to string format for storage
   */
  static async exportPrivateKey(privateKey: CryptoKey): Promise<string> {
    const exported = await window.crypto.subtle.exportKey('pkcs8', privateKey)
    const exportedAsBase64 = btoa(String.fromCharCode(...Array.from(new Uint8Array(exported))))
    return exportedAsBase64
  }

  /**
   * Import public key from string format
   */
  static async importPublicKey(publicKeyString: string): Promise<CryptoKey> {
    const binaryString = atob(publicKeyString)
    const bytes = new Uint8Array(binaryString.length)
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i)
    }

    return await window.crypto.subtle.importKey(
      'spki',
      bytes.buffer,
      {
        name: 'RSA-OAEP',
        hash: 'SHA-256',
      },
      false, // not extractable
      ['encrypt']
    )
  }

  /**
   * Import private key from string format
   */
  static async importPrivateKey(privateKeyString: string): Promise<CryptoKey> {
    const binaryString = atob(privateKeyString)
    const bytes = new Uint8Array(binaryString.length)
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i)
    }

    return await window.crypto.subtle.importKey(
      'pkcs8',
      bytes.buffer,
      {
        name: 'RSA-OAEP',
        hash: 'SHA-256',
      },
      false, // not extractable
      ['decrypt']
    )
  }

  /**
   * Generate a symmetric key for message encryption
   */
  private static async generateSymmetricKey(): Promise<CryptoKey> {
    return await window.crypto.subtle.generateKey(
      {
        name: this.ALGORITHM,
        length: this.KEY_LENGTH,
      },
      true, // extractable
      ['encrypt', 'decrypt']
    )
  }

  /**
   * Derive key from password and salt
   * Temporarily disabled due to type compatibility issues
   */
  // private static async deriveKey(password: string, salt: Uint8Array): Promise<CryptoKey> {
  //   const encoder = new TextEncoder()
  //   const passwordBuffer = encoder.encode(password)

  //   const keyMaterial = await window.crypto.subtle.importKey(
  //     'raw',
  //     passwordBuffer,
  //     'PBKDF2',
  //     false,
  //     ['deriveKey']
  //   )

  //   return await window.crypto.subtle.deriveKey(
  //     {
  //       name: 'PBKDF2',
  //       salt,
  //       iterations: 100000,
  //       hash: 'SHA-256',
  //     },
  //     keyMaterial,
  //     {
  //       name: this.ALGORITHM,
  //       length: this.KEY_LENGTH,
  //     },
  //     false, // not extractable
  //     ['encrypt', 'decrypt']
  //   )
  // }

  /**
   * Encrypt message content using recipient's public key
   */
  static async encryptMessage(
    content: string,
    recipientPublicKey: CryptoKey
  ): Promise<EncryptedMessage> {
    // Generate a random symmetric key for this message
    const symmetricKey = await this.generateSymmetricKey()

    // Generate random IV and salt
    const iv = window.crypto.getRandomValues(new Uint8Array(this.IV_LENGTH))
    const salt = window.crypto.getRandomValues(new Uint8Array(this.SALT_LENGTH))

    // Encrypt the content with symmetric key
    const encoder = new TextEncoder()
    const contentBuffer = encoder.encode(content)

    const encryptedContentBuffer = await window.crypto.subtle.encrypt(
      {
        name: this.ALGORITHM,
        iv: iv,
      },
      symmetricKey,
      contentBuffer
    )

    // Export symmetric key and encrypt it with recipient's public key
    const exportedSymmetricKey = await window.crypto.subtle.exportKey('raw', symmetricKey)
    const encryptedSymmetricKey = await window.crypto.subtle.encrypt(
      {
        name: 'RSA-OAEP',
      },
      recipientPublicKey,
      exportedSymmetricKey
    )

    // Combine encrypted symmetric key and encrypted content
    const combinedData = new Uint8Array(
      encryptedSymmetricKey.byteLength + encryptedContentBuffer.byteLength
    )
    combinedData.set(new Uint8Array(encryptedSymmetricKey), 0)
    combinedData.set(new Uint8Array(encryptedContentBuffer), encryptedSymmetricKey.byteLength)

    return {
      encryptedContent: btoa(String.fromCharCode(...Array.from(combinedData))),
      iv: btoa(String.fromCharCode(...Array.from(iv))),
      salt: btoa(String.fromCharCode(...Array.from(salt))),
    }
  }

  /**
   * Decrypt message content using recipient's private key
   */
  static async decryptMessage(
    encryptedMessage: EncryptedMessage,
    recipientPrivateKey: CryptoKey
  ): Promise<string> {
    try {
      // Decode the encrypted data
      const encryptedData = new Uint8Array(
        atob(encryptedMessage.encryptedContent)
          .split('')
          .map(char => char.charCodeAt(0))
      )
      const iv = new Uint8Array(
        atob(encryptedMessage.iv)
          .split('')
          .map(char => char.charCodeAt(0))
      )

      // Split the combined data back into encrypted key and content
      const encryptedSymmetricKey = encryptedData.slice(0, 256) // RSA-2048 produces 256-byte ciphertext
      const encryptedContent = encryptedData.slice(256)

      // Decrypt the symmetric key using private key
      const symmetricKeyBuffer = await window.crypto.subtle.decrypt(
        {
          name: 'RSA-OAEP',
        },
        recipientPrivateKey,
        encryptedSymmetricKey
      )

      // Import the decrypted symmetric key
      const symmetricKey = await window.crypto.subtle.importKey(
        'raw',
        symmetricKeyBuffer,
        {
          name: this.ALGORITHM,
          length: this.KEY_LENGTH,
        },
        false,
        ['decrypt']
      )

      // Decrypt the content using symmetric key
      const decryptedContentBuffer = await window.crypto.subtle.decrypt(
        {
          name: this.ALGORITHM,
          iv: iv,
        },
        symmetricKey,
        encryptedContent
      )

      // Convert back to string
      const decoder = new TextDecoder()
      return decoder.decode(decryptedContentBuffer)
    } catch (error) {
      console.error('Failed to decrypt message:', error)
      throw new Error('Failed to decrypt message')
    }
  }

  /**
   * Encrypt message for storage (using password-based encryption)
   * Temporarily disabled due to type compatibility issues
   */
  // static async encryptForStorage(content: string, password: string): Promise<EncryptedMessage> {
  //   const salt = window.crypto.getRandomValues(new Uint8Array(this.SALT_LENGTH))
  //   const iv = window.crypto.getRandomValues(new Uint8Array(this.IV_LENGTH))

  //   const key = await this.deriveKey(password, salt)

  //   const encoder = new TextEncoder()
  //   const contentBuffer = encoder.encode(content)

  //   const encryptedContentBuffer = await window.crypto.subtle.encrypt(
  //     {
  //       name: this.ALGORITHM,
  //       iv: iv,
  //     },
  //     key,
  //     contentBuffer
  //   )

  //   return {
  //     encryptedContent: btoa(String.fromCharCode(...new Uint8Array(encryptedContentBuffer))),
  //     iv: btoa(String.fromCharCode(...iv)),
  //     salt: btoa(String.fromCharCode(...salt)),
  //   }
  // }

  /**
   * Decrypt message from storage (using password-based encryption)
   * Temporarily disabled due to type compatibility issues
   */
  // static async decryptFromStorage(
  //   encryptedMessage: EncryptedMessage,
  //   password: string
  // ): Promise<string> {
  //   const encryptedContent = new Uint8Array(
  //     atob(encryptedMessage.encryptedContent)
  //       .split('')
  //       .map(char => char.charCodeAt(0))
  //   )
  //   const iv = new Uint8Array(
  //     atob(encryptedMessage.iv)
  //       .split('')
  //       .map(char => char.charCodeAt(0))
  //   )
  //   const salt = new Uint8Array(
  //     atob(encryptedMessage.salt)
  //       .split('')
  //       .map(char => char.charCodeAt(0))
  //   )

  //   const key = await this.deriveKey(password, salt)

  //   const decryptedContentBuffer = await window.crypto.subtle.decrypt(
  //     {
  //       name: this.ALGORITHM,
  //       iv: iv,
  //     },
  //     key,
  //     encryptedContent
  //   )

  //   const decoder = new TextDecoder()
  //   return decoder.decode(decryptedContentBuffer)
  // }
}

/**
 * Secure storage utilities for encryption keys
 * Uses IndexedDB instead of localStorage for better security
 */
import { secureKeyManager, migrateKeysFromLocalStorage } from './keyManagement'

export class SecureKeyStorage {
  /**
   * Initialize encryption for a user (replaces old storeKeyPair)
   */
  static async initializeForUser(userId: string): Promise<{ publicKeyString: string; keyId: string }> {
    try {
      // First, migrate any legacy keys from localStorage
      await migrateKeysFromLocalStorage(userId)

      // Get or create the user's key pair from secure storage
      const { keyPair, keyId } = await secureKeyManager.getCurrentUserKeyPair(userId)

      // Export public key for sharing
      const publicKeyString = await secureKeyManager.exportPublicKey(keyPair.publicKey)

      return { publicKeyString, keyId }
    } catch (error) {
      console.error('Failed to initialize secure storage for user:', error)
      throw error
    }
  }

  /**
   * Get user's key pair from secure storage
   */
  static async loadKeyPair(userId: string): Promise<KeyPair | null> {
    try {
      const { keyPair } = await secureKeyManager.getCurrentUserKeyPair(userId)
      return keyPair
    } catch (error) {
      console.error('Failed to load key pair from secure storage:', error)
      return null
    }
  }

  /**
   * Get user's public key string from secure storage
   */
  static async getPublicKeyString(userId: string): Promise<string | null> {
    try {
      const keyPair = await this.loadKeyPair(userId)
      if (!keyPair) return null

      return await secureKeyManager.exportPublicKey(keyPair.publicKey)
    } catch (error) {
      console.error('Failed to get public key string:', error)
      return null
    }
  }

  /**
   * Clear stored keys for a user (for logout)
   */
  static async clearKeys(userId: string): Promise<void> {
    try {
      await secureKeyManager.clearUserKeys(userId)

      // Also clear any legacy localStorage keys
      localStorage.removeItem('pengu_public_key')
      localStorage.removeItem('pengu_private_key')
      localStorage.removeItem('pengu_publicKey')
      localStorage.removeItem('pengu_privateKey')
    } catch (error) {
      console.error('Failed to clear keys:', error)
    }
  }

  /**
   * Check if user has keys in secure storage
   */
  static async hasKeys(userId: string): Promise<boolean> {
    try {
      const userKeys = await secureKeyManager.getUserKeyPairs(userId)
      return userKeys.length > 0
    } catch (error) {
      console.error('Failed to check for keys:', error)
      return false
    }
  }

  /**
   * Get all key pairs for a user (for key management UI)
   */
  static async getUserKeyPairs(userId: string) {
    try {
      return await secureKeyManager.getUserKeyPairs(userId)
    } catch (error) {
      console.error('Failed to get user key pairs:', error)
      return []
    }
  }

  /**
   * Delete a specific key pair
   */
  static async deleteKeyPair(keyId: string): Promise<void> {
    try {
      await secureKeyManager.deleteKeyPair(keyId)
    } catch (error) {
      console.error('Failed to delete key pair:', error)
      throw error
    }
  }
}

/**
 * Legacy KeyStorage class - kept for backward compatibility but deprecated
 * @deprecated Use SecureKeyStorage instead
 */
export class KeyStorage {
  private static readonly PUBLIC_KEY_STORAGE = 'pengu_public_key'
  private static readonly PRIVATE_KEY_STORAGE = 'pengu_private_key'

  /**
   * @deprecated Use SecureKeyStorage.initializeForUser instead
   */
  static async storeKeyPair(keyPair: KeyPair, password: string): Promise<void> {
    console.warn('KeyStorage.storeKeyPair is deprecated. Use SecureKeyStorage.initializeForUser instead.')
    throw new Error('This method is deprecated for security reasons. Use SecureKeyStorage.initializeForUser instead.')
  }

  /**
   * @deprecated Use SecureKeyStorage.loadKeyPair instead
   */
  static async loadKeyPair(password: string): Promise<KeyPair | null> {
    console.warn('KeyStorage.loadKeyPair is deprecated. Use SecureKeyStorage.loadKeyPair instead.')
    return null
  }

  /**
   * @deprecated Use SecureKeyStorage.getPublicKeyString instead
   */
  static getPublicKeyString(): string | null {
    console.warn('KeyStorage.getPublicKeyString is deprecated. Use SecureKeyStorage.getPublicKeyString instead.')
    return localStorage.getItem(this.PUBLIC_KEY_STORAGE)
  }

  /**
   * @deprecated Use SecureKeyStorage.clearKeys instead
   */
  static clearKeys(): void {
    console.warn('KeyStorage.clearKeys is deprecated. Use SecureKeyStorage.clearKeys instead.')
    localStorage.removeItem(this.PUBLIC_KEY_STORAGE)
    localStorage.removeItem(this.PRIVATE_KEY_STORAGE)
  }

  /**
   * @deprecated Use SecureKeyStorage.hasKeys instead
   */
  static hasKeys(): boolean {
    console.warn('KeyStorage.hasKeys is deprecated. Use SecureKeyStorage.hasKeys instead.')
    return !!(localStorage.getItem(this.PUBLIC_KEY_STORAGE) && localStorage.getItem(this.PRIVATE_KEY_STORAGE))
  }
}