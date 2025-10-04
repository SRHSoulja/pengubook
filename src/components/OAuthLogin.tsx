'use client'

import { signIn, signOut, useSession } from 'next-auth/react'
import { useState } from 'react'

export default function OAuthLogin() {
  const { data: session, status } = useSession()
  const [loadingProvider, setLoadingProvider] = useState<string | null>(null)

  const handleSignIn = async (provider: string) => {
    setLoadingProvider(provider)
    try {
      await signIn(provider, {
        callbackUrl: '/dashboard',
        redirect: true
      })
    } catch (error) {
      console.error('Sign in error:', error)
      setLoadingProvider(null)
    }
  }

  const handleSignOut = async () => {
    setLoadingProvider('signout')
    try {
      await signOut({ callbackUrl: '/' })
    } catch (error) {
      console.error('Sign out error:', error)
      setLoadingProvider(null)
    }
  }

  if (status === 'loading') {
    return (
      <div className="flex items-center justify-center p-4">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
      </div>
    )
  }

  if (session) {
    return (
      <div className="space-y-4">
        <div className="text-center text-white">
          <p className="mb-2">Signed in as</p>
          <div className="flex items-center justify-center space-x-3 mb-4">
            {session.user?.image && (
              <img
                src={session.user.image}
                alt="Profile"
                className="w-10 h-10 rounded-full"
              />
            )}
            <div>
              <p className="font-semibold">{session.user?.name}</p>
              <p className="text-sm text-gray-300">Connected via OAuth</p>
            </div>
          </div>
        </div>
        <button
          onClick={handleSignOut}
          disabled={loadingProvider === 'signout'}
          className="w-full bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white font-bold py-3 px-6 rounded-xl transition-colors"
        >
          {loadingProvider === 'signout' ? 'Signing Out...' : 'Sign Out'}
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="text-center mb-6">
        <h3 className="text-xl font-bold text-white mb-2">Connect Your Social Accounts</h3>
        <p className="text-gray-300 text-sm">Link your Discord and X accounts to your PeBloq profile</p>
      </div>

      <button
        onClick={() => handleSignIn('discord')}
        disabled={loadingProvider !== null}
        className="w-full bg-[#5865F2] hover:bg-[#4752C4] disabled:bg-[#5865F2]/50 text-white font-bold py-3 px-6 rounded-xl transition-colors flex items-center justify-center space-x-3"
      >
        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
          <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515a.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0a12.64 12.64 0 0 0-.617-1.25a.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057a19.9 19.9 0 0 0 5.993 3.03a.078.078 0 0 0 .084-.028a14.09 14.09 0 0 0 1.226-1.994a.076.076 0 0 0-.041-.106a13.107 13.107 0 0 1-1.872-.892a.077.077 0 0 1-.008-.128a10.2 10.2 0 0 0 .372-.292a.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127a12.299 12.299 0 0 1-1.873.892a.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028a19.839 19.839 0 0 0 6.002-3.03a.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419c0-1.333.956-2.419 2.157-2.419c1.21 0 2.176 1.096 2.157 2.42c0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419c0-1.333.955-2.419 2.157-2.419c1.21 0 2.176 1.096 2.157 2.42c0 1.333-.946 2.418-2.157 2.418z"/>
        </svg>
        <span>{loadingProvider === 'discord' ? 'Connecting...' : 'Connect Discord'}</span>
      </button>

      <button
        onClick={() => handleSignIn('twitter')}
        disabled={loadingProvider !== null}
        className="w-full bg-black hover:bg-gray-800 disabled:bg-gray-600 text-white font-bold py-3 px-6 rounded-xl transition-colors flex items-center justify-center space-x-3"
      >
        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
        </svg>
        <span>{loadingProvider === 'twitter' ? 'Connecting...' : 'Connect X (Twitter)'}</span>
      </button>

      <div className="text-center text-xs text-gray-400 mt-4">
        <p>By connecting, you agree to link your social accounts with PeBloq</p>
      </div>
    </div>
  )
}