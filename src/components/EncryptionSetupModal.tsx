'use client'

import { useState } from 'react'
import { useEncryption } from '@/hooks/useEncryption'

interface EncryptionSetupModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

export default function EncryptionSetupModal({ isOpen, onClose, onSuccess }: EncryptionSetupModalProps) {
  const { hasKeys, isGenerating, initializeEncryption, enableEncryption, resetEncryption } = useEncryption()
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [mode, setMode] = useState<'setup' | 'enable' | 'reset'>('setup')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')

  const handleInitialize = async () => {
    if (!password) {
      setError('Password is required')
      return
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters long')
      return
    }

    if (mode === 'setup' && password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }

    setError('')

    try {
      let success = false

      if (mode === 'setup') {
        success = await initializeEncryption(password)
      } else if (mode === 'enable') {
        success = await enableEncryption(password)
      }

      if (success) {
        onSuccess()
        onClose()
        setPassword('')
        setConfirmPassword('')
      } else {
        setError(mode === 'setup'
          ? 'Failed to initialize encryption. Please try again.'
          : 'Invalid password or failed to load encryption keys.')
      }
    } catch (error) {
      setError('An error occurred. Please try again.')
    }
  }

  const handleReset = async () => {
    if (window.confirm('Are you sure you want to reset encryption? This will permanently delete your keys and you will lose access to encrypted messages.')) {
      await resetEncryption()
      setMode('setup')
      setPassword('')
      setConfirmPassword('')
      setError('')
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="relative bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 rounded-2xl border border-white/20 p-8 max-w-lg w-full">
        <div className="text-center mb-6">
          <div className="text-6xl mb-4">🔐</div>
          <h2 className="text-3xl font-bold text-white mb-2">
            {mode === 'setup' && 'Set up Encryption'}
            {mode === 'enable' && 'Enable Encryption'}
            {mode === 'reset' && 'Reset Encryption'}
          </h2>
          <p className="text-gray-300">
            {mode === 'setup' && 'Secure your direct messages with end-to-end encryption'}
            {mode === 'enable' && 'Enter your password to enable encrypted messaging'}
            {mode === 'reset' && 'This will permanently delete your encryption keys'}
          </p>
        </div>

        {!hasKeys && mode === 'setup' && (
          <div className="space-y-6">
            <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
              <h3 className="text-blue-300 font-semibold mb-2">🛡️ What is encryption?</h3>
              <p className="text-gray-300 text-sm">
                End-to-end encryption ensures only you and the recipient can read your messages.
                Your messages are encrypted on your device before being sent.
              </p>
            </div>

            <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4">
              <h3 className="text-yellow-300 font-semibold mb-2">⚠️ Important</h3>
              <p className="text-gray-300 text-sm">
                Your encryption password is used to protect your private key.
                <strong className="text-yellow-300"> If you forget this password, you'll lose access to all encrypted messages.</strong>
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Encryption Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter a strong password (min 8 characters)"
                  className="w-full px-4 py-3 bg-black/30 text-white placeholder-gray-400 border border-white/20 rounded-lg focus:outline-none focus:border-cyan-400 pr-12"
                  minLength={8}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-3 text-gray-300 hover:text-gray-300 transition-colors"
                >
                  {showPassword ? '👁️' : '👁️‍🗨️'}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Confirm Password
              </label>
              <input
                type={showPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm your password"
                className="w-full px-4 py-3 bg-black/30 text-white placeholder-gray-400 border border-white/20 rounded-lg focus:outline-none focus:border-cyan-400"
                minLength={8}
              />
            </div>

            {error && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3">
                <p className="text-red-300 text-sm">{error}</p>
              </div>
            )}

            <div className="flex gap-4">
              <button
                onClick={onClose}
                className="flex-1 bg-gray-500/20 text-gray-300 px-6 py-3 rounded-lg hover:bg-gray-500/30 transition-colors"
                disabled={isGenerating}
              >
                Cancel
              </button>
              <button
                onClick={handleInitialize}
                className="flex-1 bg-gradient-to-r from-purple-500 to-blue-500 text-white px-6 py-3 rounded-lg hover:from-purple-600 hover:to-blue-600 transition-all transform hover:scale-105 font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={isGenerating || !password || password.length < 8}
              >
                {isGenerating ? 'Setting up...' : 'Set up Encryption'}
              </button>
            </div>
          </div>
        )}

        {hasKeys && (
          <div className="space-y-6">
            <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4 text-center">
              <div className="text-green-300 font-semibold mb-2">✅ Encryption Keys Found</div>
              <p className="text-gray-300 text-sm">
                You already have encryption keys set up.
              </p>
            </div>

            <div className="flex gap-4">
              {mode === 'enable' && (
                <>
                  <div className="w-full">
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Enter Password to Enable
                    </label>
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter your encryption password"
                      className="w-full px-4 py-3 bg-black/30 text-white placeholder-gray-400 border border-white/20 rounded-lg focus:outline-none focus:border-cyan-400 mb-4"
                    />

                    {error && (
                      <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 mb-4">
                        <p className="text-red-300 text-sm">{error}</p>
                      </div>
                    )}

                    <div className="flex gap-4">
                      <button
                        onClick={onClose}
                        className="flex-1 bg-gray-500/20 text-gray-300 px-6 py-3 rounded-lg hover:bg-gray-500/30 transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleInitialize}
                        className="flex-1 bg-gradient-to-r from-green-500 to-emerald-500 text-white px-6 py-3 rounded-lg hover:from-green-600 hover:to-emerald-600 transition-all transform hover:scale-105 font-semibold"
                        disabled={!password}
                      >
                        Enable
                      </button>
                    </div>
                  </div>
                </>
              )}

              {mode !== 'enable' && (
                <div className="w-full flex gap-4">
                  <button
                    onClick={() => setMode('enable')}
                    className="flex-1 bg-gradient-to-r from-green-500 to-emerald-500 text-white px-6 py-3 rounded-lg hover:from-green-600 hover:to-emerald-600 transition-all transform hover:scale-105 font-semibold"
                  >
                    Enable Encryption
                  </button>
                  <button
                    onClick={handleReset}
                    className="bg-red-500/20 text-red-300 px-4 py-3 rounded-lg hover:bg-red-500/30 transition-colors text-sm"
                  >
                    Reset
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}