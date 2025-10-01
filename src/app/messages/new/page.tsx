'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/providers/AuthProvider'
import { useSearchParams, useRouter } from 'next/navigation'
import PenguinLoadingScreen from '@/components/PenguinLoadingScreen'

export default function NewMessagePage() {
  const { user, isAuthenticated, loading: authLoading } = useAuth()
  const searchParams = useSearchParams()
  const router = useRouter()
  const targetUserId = searchParams?.get('userId')
  const [creating, setCreating] = useState(false)

  useEffect(() => {
    if (isAuthenticated && user && targetUserId) {
      createConversation()
    }
  }, [isAuthenticated, user, targetUserId])

  const createConversation = async () => {
    if (!user?.walletAddress || !targetUserId) return

    setCreating(true)

    try {
      const response = await fetch('/api/messages/conversations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-wallet-address': user.walletAddress
        },
        body: JSON.stringify({ participantIds: [targetUserId] })
      })

      const result = await response.json()
      if (result.success) {
        // Handle both new conversation creation and existing conversation
        const conversationId = result.conversation?.id || result.data?.id
        if (conversationId) {
          router.push(`/messages/${conversationId}`)
        } else {
          console.error('No conversation ID in response:', result)
          alert('Failed to start conversation - no ID returned')
          router.push('/messages')
        }
      } else if (response.status === 409 && result.conversationId) {
        // Conversation already exists, redirect to it
        router.push(`/messages/${result.conversationId}`)
      } else {
        console.error('Failed to create conversation:', result.error)
        alert('Failed to start conversation')
        router.push('/messages')
      }
    } catch (error) {
      console.error('Error creating conversation:', error)
      alert('Failed to start conversation')
      router.push('/messages')
    }
  }

  if (authLoading || creating) {
    return <PenguinLoadingScreen />
  }

  if (!isAuthenticated) {
    router.push('/')
    return null
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-purple-900 to-indigo-900 flex items-center justify-center">
      <div className="text-center text-white">
        <div className="text-6xl mb-4 animate-spin">🐧</div>
        <h1 className="text-2xl font-bold mb-4">Starting Conversation...</h1>
        <p className="text-gray-300">Please wait while we set up your chat</p>
      </div>
    </div>
  )
}