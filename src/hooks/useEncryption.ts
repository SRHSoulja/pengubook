'use client'

import { useState, useEffect, useCallback } from 'react'
import { MessageEncryption, KeyStorage } from '@/lib/encryption'
import { useAuth } from '@/providers/AuthProvider'

interface EncryptedMessage {
  encryptedContent: string
  iv: string
  salt: string
}

export function useEncryption() {
  const { user } = useAuth()
  const [isInitialized, setIsInitialized] = useState(false)
  const [hasKeys, setHasKeys] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)
  const [encryptionEnabled, setEncryptionEnabled] = useState(false)

  // Check if user has encryption keys
  useEffect(() => {
    const checkKeys = () => {
      const keysExist = KeyStorage.hasKeys()
      setHasKeys(keysExist)
      setIsInitialized(true)

      // Check if encryption is enabled in localStorage
      const encryptionPref = localStorage.getItem('encryption_enabled')
      setEncryptionEnabled(encryptionPref === 'true')
    }

    checkKeys()
  }, [])

  // Initialize encryption keys for the user
  const initializeEncryption = useCallback(async (password: string): Promise<boolean> => {
    if (!user) return false

    try {
      setIsGenerating(true)

      // Generate new key pair
      const keyPair = await MessageEncryption.generateKeyPair()

      // Store keys locally
      await KeyStorage.storeKeyPair(keyPair, password)

      // Upload public key to server
      const publicKeyString = await MessageEncryption.exportPublicKey(keyPair.publicKey)

      const response = await fetch('/api/user/encryption/public-key', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          userId: user.id,
          publicKey: publicKeyString
        })
      })

      if (response.ok) {
        setHasKeys(true)
        setEncryptionEnabled(true)
        localStorage.setItem('encryption_enabled', 'true')
        return true
      } else {
        // Clean up local keys if server update failed
        KeyStorage.clearKeys()
        console.error('Failed to upload public key to server')
        return false
      }
    } catch (error) {
      console.error('Failed to initialize encryption:', error)
      return false
    } finally {
      setIsGenerating(false)
    }
  }, [user])

  // Enable encryption (load existing keys)
  const enableEncryption = useCallback(async (password: string): Promise<boolean> => {
    try {
      const keyPair = await KeyStorage.loadKeyPair(password)
      if (keyPair) {
        setEncryptionEnabled(true)
        localStorage.setItem('encryption_enabled', 'true')
        return true
      }
      return false
    } catch (error) {
      console.error('Failed to enable encryption:', error)
      return false
    }
  }, [])

  // Disable encryption
  const disableEncryption = useCallback(() => {
    setEncryptionEnabled(false)
    localStorage.setItem('encryption_enabled', 'false')
  }, [])

  // Encrypt a message for a specific recipient
  const encryptMessage = useCallback(async (
    content: string,
    recipientUserId: string,
    password: string
  ): Promise<EncryptedMessage | null> => {
    if (!encryptionEnabled) return null

    try {
      // Get recipient's public key from server
      const response = await fetch(`/api/user/${recipientUserId}/public-key`)
      if (!response.ok) {
        throw new Error('Failed to get recipient public key')
      }

      const { publicKey: publicKeyString } = await response.json()
      if (!publicKeyString) {
        throw new Error('Recipient does not have encryption enabled')
      }

      // Import recipient's public key
      const recipientPublicKey = await MessageEncryption.importPublicKey(publicKeyString)

      // Encrypt the message
      return await MessageEncryption.encryptMessage(content, recipientPublicKey)
    } catch (error) {
      console.error('Failed to encrypt message:', error)
      return null
    }
  }, [encryptionEnabled])

  // Decrypt a message
  const decryptMessage = useCallback(async (
    encryptedMessage: EncryptedMessage,
    password: string
  ): Promise<string | null> => {
    if (!encryptionEnabled) return null

    try {
      // Load user's private key
      const keyPair = await KeyStorage.loadKeyPair(password)
      if (!keyPair) {
        throw new Error('Failed to load private key')
      }

      // Decrypt the message
      return await MessageEncryption.decryptMessage(encryptedMessage, keyPair.privateKey)
    } catch (error) {
      console.error('Failed to decrypt message:', error)
      return null
    }
  }, [encryptionEnabled])

  // Reset encryption (remove all keys)
  const resetEncryption = useCallback(async (): Promise<void> => {
    if (!user) return

    try {
      // Remove public key from server
      await fetch('/api/user/encryption/public-key', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ userId: user.id })
      })

      // Clear local keys
      KeyStorage.clearKeys()

      // Reset state
      setHasKeys(false)
      setEncryptionEnabled(false)
      localStorage.removeItem('encryption_enabled')
    } catch (error) {
      console.error('Failed to reset encryption:', error)
    }
  }, [user])

  return {
    isInitialized,
    hasKeys,
    isGenerating,
    encryptionEnabled,
    initializeEncryption,
    enableEncryption,
    disableEncryption,
    encryptMessage,
    decryptMessage,
    resetEncryption
  }
}