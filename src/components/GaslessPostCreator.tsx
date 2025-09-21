'use client'

import { useState } from 'react'
import { useAuth } from '@/providers/AuthProvider'
import { useAbstractClient } from '@abstract-foundation/agw-react'
import { GaslessSocialService, DOMAIN, TYPES } from '@/lib/gasless-social'

interface GaslessPostCreatorProps {
  onPostCreated?: (post: any) => void
  onCancel?: () => void
}

export default function GaslessPostCreator({ onPostCreated, onCancel }: GaslessPostCreatorProps) {
  const { user } = useAuth()
  const { data: client } = useAbstractClient()
  const [content, setContent] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSigning, setIsSigning] = useState(false)

  const handleGaslessPost = async () => {
    if (!user || !client || !content.trim()) return

    try {
      setIsSigning(true)

      // Get user's current nonce for replay protection
      const gaslessService = new GaslessSocialService()
      const userNonce = await gaslessService.getUserNonce(user.walletAddress)

      // Sign the post message (gasless for user)
      const { signature, postData } = await gaslessService.signPost(
        client.account, // AGW wallet instance
        content.trim(),
        userNonce
      )

      setIsSigning(false)
      setIsSubmitting(true)

      // Submit to our gasless API (we pay gas)
      const response = await fetch('/api/gasless/post', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-wallet-address': user.walletAddress,
          'x-user-id': user.id
        },
        body: JSON.stringify({
          content: content.trim(),
          signature,
          postData
        }),
        credentials: 'include'
      })

      const data = await response.json()

      if (response.ok) {
        setContent('')
        if (onPostCreated) {
          onPostCreated(data.post)
        }
        alert('✅ Post created on-chain with gasless transaction!')
      } else {
        alert('❌ ' + (data.error || 'Failed to create gasless post'))
      }
    } catch (error: any) {
      console.error('Gasless posting error:', error)
      alert('❌ Failed to create gasless post: ' + error.message)
    } finally {
      setIsSigning(false)
      setIsSubmitting(false)
    }
  }

  if (!user || user.level < 5) {
    return (
      <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-4 mb-6">
        <div className="flex items-center gap-3">
          <span className="text-2xl">⚡</span>
          <div>
            <h3 className="text-yellow-300 font-semibold">Gasless Posting Available at Level 5</h3>
            <p className="text-yellow-200 text-sm">
              Reach level 5 to post directly on-chain without paying gas fees!
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-gradient-to-r from-purple-500/10 to-cyan-500/10 backdrop-blur-lg rounded-2xl border border-purple-400/20 p-6 mb-8">
      <div className="flex items-center gap-3 mb-4">
        <span className="text-2xl">⚡</span>
        <div>
          <h2 className="text-lg font-semibold text-white">Gasless On-Chain Posting</h2>
          <p className="text-purple-300 text-sm">
            Post directly to the blockchain without paying gas fees!
          </p>
        </div>
      </div>

      <div className="space-y-4">
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Share your thoughts on the blockchain..."
          rows={4}
          maxLength={500}
          className="w-full px-4 py-3 rounded-lg bg-white/10 border border-purple-400/20 text-white placeholder-gray-300 focus:outline-none focus:border-purple-400 resize-none"
          disabled={isSubmitting || isSigning}
        />

        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-300">
            {content.length}/500 characters
            {content.length > 0 && (
              <span className="ml-2 text-purple-300">
                • Will be stored permanently on-chain
              </span>
            )}
          </div>

          <div className="flex gap-3">
            {onCancel && (
              <button
                onClick={onCancel}
                disabled={isSubmitting || isSigning}
                className="px-4 py-2 rounded-lg bg-gray-500 hover:bg-gray-600 disabled:bg-gray-700 disabled:cursor-not-allowed text-white transition-colors"
              >
                Cancel
              </button>
            )}

            <button
              onClick={handleGaslessPost}
              disabled={!content.trim() || isSubmitting || isSigning}
              className="bg-gradient-to-r from-purple-500 to-cyan-500 hover:from-purple-600 hover:to-cyan-600 disabled:from-gray-500 disabled:to-gray-600 disabled:cursor-not-allowed text-white px-6 py-2 rounded-lg transition-all font-semibold flex items-center gap-2"
            >
              {isSigning ? (
                <>
                  <span className="animate-spin">⏳</span>
                  Signing Message...
                </>
              ) : isSubmitting ? (
                <>
                  <span className="animate-spin">⏳</span>
                  Posting to Blockchain...
                </>
              ) : (
                <>
                  <span>⚡</span>
                  Post On-Chain (Gasless)
                </>
              )}
            </button>
          </div>
        </div>

        {/* Info box */}
        <div className="bg-purple-500/10 border border-purple-500/20 rounded-lg p-3">
          <div className="flex items-start gap-2 text-sm">
            <span className="text-purple-400">ℹ️</span>
            <div className="text-purple-200">
              <p className="font-medium mb-1">How gasless posting works:</p>
              <ul className="text-xs space-y-1 text-purple-300">
                <li>• You sign a message with your wallet (no gas cost)</li>
                <li>• PenguBook submits your post to the blockchain</li>
                <li>• Your post is permanently stored on-chain</li>
                <li>• You get all the benefits without paying gas fees!</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}