/**
 * Secure Key Management System
 *
 * This module provides secure storage and management of encryption keys
 * for end-to-end encryption. It uses Web Crypto API and IndexedDB for
 * secure key storage, avoiding localStorage for sensitive data.
 */

export class SecureKeyError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'SecureKeyError'
  }
}

interface KeyPair {
  publicKey: CryptoKey
  privateKey: CryptoKey
}

interface StoredKeyPair {
  publicKey: JsonWebKey
  privateKey: JsonWebKey
  userId: string
  createdAt: string
  keyId: string
}

class SecureKeyManager {
  private dbName = 'PeBloqSecureKeys'
  private dbVersion = 1
  private storeName = 'keyPairs'
  private db: IDBDatabase | null = null

  /**
   * Initialize the IndexedDB database for secure key storage
   */
  private async initDB(): Promise<IDBDatabase> {
    if (this.db) return this.db

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.dbVersion)

      request.onerror = () => reject(new SecureKeyError('Failed to open IndexedDB'))

      request.onsuccess = () => {
        this.db = request.result
        resolve(this.db)
      }

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result

        // Create object store for key pairs
        const store = db.createObjectStore(this.storeName, { keyPath: 'keyId' })
        store.createIndex('userId', 'userId', { unique: false })
        store.createIndex('createdAt', 'createdAt', { unique: false })
      }
    })
  }

  /**
   * Generate a new RSA key pair for encryption
   */
  async generateKeyPair(): Promise<KeyPair> {
    try {
      const keyPair = await window.crypto.subtle.generateKey(
        {
          name: 'RSA-OAEP',
          modulusLength: 2048,
          publicExponent: new Uint8Array([1, 0, 1]),
          hash: 'SHA-256'
        },
        true, // extractable
        ['encrypt', 'decrypt']
      )

      return keyPair as KeyPair
    } catch (error) {
      throw new SecureKeyError(`Failed to generate key pair: ${error}`)
    }
  }

  /**
   * Store a key pair securely in IndexedDB
   */
  async storeKeyPair(keyPair: KeyPair, userId: string): Promise<string> {
    try {
      const db = await this.initDB()

      // Export keys to JWK format for storage
      const publicJwk = await window.crypto.subtle.exportKey('jwk', keyPair.publicKey)
      const privateJwk = await window.crypto.subtle.exportKey('jwk', keyPair.privateKey)

      const keyId = crypto.randomUUID()
      const storedKeyPair: StoredKeyPair = {
        publicKey: publicJwk,
        privateKey: privateJwk,
        userId,
        createdAt: new Date().toISOString(),
        keyId
      }

      return new Promise((resolve, reject) => {
        const transaction = db.transaction([this.storeName], 'readwrite')
        const store = transaction.objectStore(this.storeName)
        const request = store.add(storedKeyPair)

        request.onsuccess = () => resolve(keyId)
        request.onerror = () => reject(new SecureKeyError('Failed to store key pair'))
      })
    } catch (error) {
      throw new SecureKeyError(`Failed to store key pair: ${error}`)
    }
  }

  /**
   * Retrieve a key pair from secure storage
   */
  async getKeyPair(keyId: string): Promise<KeyPair | null> {
    try {
      const db = await this.initDB()

      return new Promise((resolve, reject) => {
        const transaction = db.transaction([this.storeName], 'readonly')
        const store = transaction.objectStore(this.storeName)
        const request = store.get(keyId)

        request.onsuccess = async () => {
          const storedKeyPair = request.result as StoredKeyPair | undefined

          if (!storedKeyPair) {
            resolve(null)
            return
          }

          try {
            // Import keys from JWK format
            const publicKey = await window.crypto.subtle.importKey(
              'jwk',
              storedKeyPair.publicKey,
              { name: 'RSA-OAEP', hash: 'SHA-256' },
              true,
              ['encrypt']
            )

            const privateKey = await window.crypto.subtle.importKey(
              'jwk',
              storedKeyPair.privateKey,
              { name: 'RSA-OAEP', hash: 'SHA-256' },
              true,
              ['decrypt']
            )

            resolve({ publicKey, privateKey })
          } catch (error) {
            reject(new SecureKeyError(`Failed to import keys: ${error}`))
          }
        }

        request.onerror = () => reject(new SecureKeyError('Failed to retrieve key pair'))
      })
    } catch (error) {
      throw new SecureKeyError(`Failed to get key pair: ${error}`)
    }
  }

  /**
   * Get all key pairs for a specific user
   */
  async getUserKeyPairs(userId: string): Promise<StoredKeyPair[]> {
    try {
      const db = await this.initDB()

      return new Promise((resolve, reject) => {
        const transaction = db.transaction([this.storeName], 'readonly')
        const store = transaction.objectStore(this.storeName)
        const index = store.index('userId')
        const request = index.getAll(userId)

        request.onsuccess = () => resolve(request.result || [])
        request.onerror = () => reject(new SecureKeyError('Failed to retrieve user key pairs'))
      })
    } catch (error) {
      throw new SecureKeyError(`Failed to get user key pairs: ${error}`)
    }
  }

  /**
   * Delete a key pair from secure storage
   */
  async deleteKeyPair(keyId: string): Promise<void> {
    try {
      const db = await this.initDB()

      return new Promise((resolve, reject) => {
        const transaction = db.transaction([this.storeName], 'readwrite')
        const store = transaction.objectStore(this.storeName)
        const request = store.delete(keyId)

        request.onsuccess = () => resolve()
        request.onerror = () => reject(new SecureKeyError('Failed to delete key pair'))
      })
    } catch (error) {
      throw new SecureKeyError(`Failed to delete key pair: ${error}`)
    }
  }

  /**
   * Clear all key pairs for a user (for logout/cleanup)
   */
  async clearUserKeys(userId: string): Promise<void> {
    try {
      const userKeys = await this.getUserKeyPairs(userId)

      const deletePromises = userKeys.map(key => this.deleteKeyPair(key.keyId))
      await Promise.all(deletePromises)
    } catch (error) {
      throw new SecureKeyError(`Failed to clear user keys: ${error}`)
    }
  }

  /**
   * Get the current user's active key pair or generate a new one
   */
  async getCurrentUserKeyPair(userId: string): Promise<{ keyPair: KeyPair; keyId: string }> {
    try {
      // Try to get existing key pairs for the user
      const userKeys = await this.getUserKeyPairs(userId)

      if (userKeys.length > 0) {
        // Use the most recent key pair
        const latestKey = userKeys.sort((a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        )[0]

        const keyPair = await this.getKeyPair(latestKey.keyId)
        if (keyPair) {
          return { keyPair, keyId: latestKey.keyId }
        }
      }

      // Generate a new key pair if none exists or retrieval failed
      const newKeyPair = await this.generateKeyPair()
      const keyId = await this.storeKeyPair(newKeyPair, userId)

      return { keyPair: newKeyPair, keyId }
    } catch (error) {
      throw new SecureKeyError(`Failed to get or create user key pair: ${error}`)
    }
  }

  /**
   * Export public key as Base64 for sharing
   */
  async exportPublicKey(publicKey: CryptoKey): Promise<string> {
    try {
      const exported = await window.crypto.subtle.exportKey('spki', publicKey)
      const exportedAsBase64 = btoa(String.fromCharCode(...Array.from(new Uint8Array(exported))))
      return exportedAsBase64
    } catch (error) {
      throw new SecureKeyError(`Failed to export public key: ${error}`)
    }
  }

  /**
   * Import public key from Base64
   */
  async importPublicKey(base64Key: string): Promise<CryptoKey> {
    try {
      const binaryString = atob(base64Key)
      const bytes = new Uint8Array(binaryString.length)
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i)
      }

      const publicKey = await window.crypto.subtle.importKey(
        'spki',
        bytes.buffer,
        { name: 'RSA-OAEP', hash: 'SHA-256' },
        true,
        ['encrypt']
      )

      return publicKey
    } catch (error) {
      throw new SecureKeyError(`Failed to import public key: ${error}`)
    }
  }

  /**
   * Derive a key from password for additional encryption layer
   * Temporarily disabled due to type compatibility issues
   */
  // async deriveKeyFromPassword(password: string, salt: Uint8Array): Promise<CryptoKey> {
  //   try {
  //     const encoder = new TextEncoder()
  //     const passwordBuffer = encoder.encode(password)

  //     const baseKey = await window.crypto.subtle.importKey(
  //       'raw',
  //       passwordBuffer,
  //       'PBKDF2',
  //       false,
  //       ['deriveKey']
  //     )

  //     const derivedKey = await window.crypto.subtle.deriveKey(
  //       {
  //         name: 'PBKDF2',
  //         salt: salt,
  //         iterations: 100000,
  //         hash: 'SHA-256'
  //       },
  //       baseKey,
  //       { name: 'AES-GCM', length: 256 },
  //       true,
  //       ['encrypt', 'decrypt']
  //     )

  //     return derivedKey
  //   } catch (error) {
  //     throw new SecureKeyError(`Failed to derive key from password: ${error}`)
  //   }
  // }
}

// Export singleton instance
export const secureKeyManager = new SecureKeyManager()

/**
 * Migration function to move keys from localStorage to secure storage
 */
export async function migrateKeysFromLocalStorage(userId: string): Promise<void> {
  try {
    // Check if there are keys in localStorage
    const publicKeyB64 = localStorage.getItem('pengu_publicKey')
    const privateKeyB64 = localStorage.getItem('pengu_privateKey')

    if (publicKeyB64 && privateKeyB64) {
      console.log('Migrating encryption keys from localStorage to secure storage...')

      // Import the old keys
      const publicKey = await secureKeyManager.importPublicKey(publicKeyB64)

      // For private key, we need to import from PKCS8 format
      const binaryString = atob(privateKeyB64)
      const bytes = new Uint8Array(binaryString.length)
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i)
      }

      const privateKey = await window.crypto.subtle.importKey(
        'pkcs8',
        bytes.buffer,
        { name: 'RSA-OAEP', hash: 'SHA-256' },
        true,
        ['decrypt']
      )

      // Store in secure storage
      await secureKeyManager.storeKeyPair({ publicKey, privateKey }, userId)

      // Remove from localStorage
      localStorage.removeItem('pengu_publicKey')
      localStorage.removeItem('pengu_privateKey')

      console.log('Key migration completed successfully')
    }
  } catch (error) {
    console.error('Failed to migrate keys from localStorage:', error)
    // Don't throw error to avoid breaking the app
    // The user can generate new keys if needed
  }
}