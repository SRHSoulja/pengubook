'use client'

import { useEffect } from 'react'
import { useAuth } from '@/providers/AuthProvider'
import { useTheme } from '@/providers/ThemeProvider'
import { useRouter } from 'next/navigation'
import PenguinLoadingScreen from '@/components/PenguinLoadingScreen'

export default function ProfilePage() {
  const { user, loading: authLoading, isAuthenticated } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!authLoading && isAuthenticated && user?.walletAddress) {
      // Redirect to the full profile view using wallet address
      router.replace(`/profile/${user.walletAddress}`)
    } else if (!authLoading && isAuthenticated && user?.id) {
      // Fallback to user ID if no wallet address (OAuth-only users)
      router.replace(`/profile/${user.id}`)
    }
  }, [authLoading, isAuthenticated, user, router])

  // Show loading screen while checking auth
  if (authLoading) {
    return <PenguinLoadingScreen />
  }

  // Show access denied if not authenticated
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-900 via-purple-900 to-indigo-900 flex items-center justify-center">
        <div className="text-center text-white">
          <div className="flex justify-center mb-4"><img src="https://gmgnrepeat.com/icons/pengubookicon1.png" alt="PeBloq" className="w-24 h-24" /></div>
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