'use client'

import { useEffect } from 'react'
import { useAuth } from '@/providers/AuthProvider'
import { useRouter } from 'next/navigation'
import PenguinLoadingScreen from '@/components/PenguinLoadingScreen'

export default function ProfilePage() {
  const { user, loading: authLoading, isAuthenticated } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!authLoading && isAuthenticated && user?.id) {
      // Redirect to the full profile view using wallet address
      router.replace(`/profile/${user.id}`)
    }
  }, [authLoading, isAuthenticated, user, router])

  // Show loading screen while checking auth or redirecting
  if (authLoading || (isAuthenticated && user)) {
    return <PenguinLoadingScreen />
  }

  // Show access denied if not authenticated
  if (!isAuthenticated || !user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-900 via-purple-900 to-indigo-900 flex items-center justify-center">
        <div className="text-center text-white">
          <div className="text-6xl mb-4">🐧</div>
          <h1 className="text-2xl font-bold mb-4">Profile Access Required</h1>
          <p className="text-gray-300 mb-6">Please connect your wallet to view your profile</p>
          <a href="/" className="bg-cyan-500 text-white px-6 py-3 rounded-xl hover:bg-cyan-600 transition-colors">
            Back to Home
          </a>
        </div>
      </div>
    )
  }

  // This should never render since we redirect above
  return null
}