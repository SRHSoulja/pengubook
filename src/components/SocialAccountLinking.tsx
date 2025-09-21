'use client'

import { signIn, signOut, useSession } from 'next-auth/react'
import { useState, useEffect } from 'react'
import { useAuth } from '@/providers/AuthProvider'

export default function SocialAccountLinking() {
  const { data: session, status } = useSession()
  const { user, refetchUser } = useAuth()
  const [loadingProvider, setLoadingProvider] = useState<string | null>(null)
  const [linkedAccounts, setLinkedAccounts] = useState({
    discord: false,
    twitter: false
  })

  useEffect(() => {
    if (user) {
      setLinkedAccounts({
        discord: !!(user.discordName || session?.user?.discordId),
        twitter: !!(user.twitterHandle || session?.user?.twitterId)
      })
    }
  }, [user, session])

  const handleLinkAccount = async (provider: string) => {
    if (!user) {
      console.error('User must be authenticated with wallet first')
      return
    }

    setLoadingProvider(provider)
    try {
      // Store current user ID to link accounts after OAuth
      sessionStorage.setItem('linkToUserId', user.id)

      await signIn(provider, {
        callbackUrl: '/dashboard?linked=true',
        redirect: true
      })
    } catch (error) {
      console.error('Link account error:', error)
      setLoadingProvider(null)
    }
  }

  const handleUnlinkAccount = async () => {
    setLoadingProvider('unlink')
    try {
      await signOut({ callbackUrl: '/dashboard?unlinked=true' })
      refetchUser()
    } catch (error) {
      console.error('Unlink account error:', error)
      setLoadingProvider(null)
    }
  }

  if (!user) {
    return (
      <div className="glass-card p-6">
        <p className="text-gray-400 text-center">
          Connect your wallet first to link social accounts
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h3 className="text-xl font-bold text-white mb-2">Link Social Accounts</h3>
        <p className="text-gray-300 text-sm">
          Connect your Discord and X accounts for verification and social features
        </p>
      </div>

      {/* Discord Section */}
      <div className="glass-card p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <svg className="w-6 h-6 text-[#5865F2]" viewBox="0 0 24 24" fill="currentColor">
              <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515a.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0a12.64 12.64 0 0 0-.617-1.25a.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057a19.9 19.9 0 0 0 5.993 3.03a.078.078 0 0 0 .084-.028a14.09 14.09 0 0 0 1.226-1.994a.076.076 0 0 0-.041-.106a13.107 13.107 0 0 1-1.872-.892a.077.077 0 0 1-.008-.128a10.2 10.2 0 0 0 .372-.292a.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127a12.299 12.299 0 0 1-1.873.892a.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028a19.839 19.839 0 0 0 6.002-3.03a.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419c0-1.333.956-2.419 2.157-2.419c1.21 0 2.176 1.096 2.157 2.42c0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419c0-1.333.955-2.419 2.157-2.419c1.21 0 2.176 1.096 2.157 2.42c0 1.333-.946 2.418-2.157 2.418z"/>
            </svg>
            <div>
              <h4 className="font-semibold text-white">Discord</h4>
              {linkedAccounts.discord ? (
                <p className="text-sm text-green-400">
                  Connected: {user.discordName || 'Discord Account'}
                </p>
              ) : (
                <p className="text-sm text-gray-400">Not connected</p>
              )}
            </div>
          </div>

          {linkedAccounts.discord ? (
            <button
              onClick={handleUnlinkAccount}
              disabled={loadingProvider !== null}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white text-sm rounded-lg transition-colors"
            >
              {loadingProvider === 'unlink' ? 'Unlinking...' : 'Unlink'}
            </button>
          ) : (
            <button
              onClick={() => handleLinkAccount('discord')}
              disabled={loadingProvider !== null}
              className="px-4 py-2 bg-[#5865F2] hover:bg-[#4752C4] disabled:bg-[#5865F2]/50 text-white text-sm rounded-lg transition-colors"
            >
              {loadingProvider === 'discord' ? 'Linking...' : 'Link Discord'}
            </button>
          )}
        </div>
      </div>

      {/* Twitter/X Section */}
      <div className="glass-card p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <svg className="w-6 h-6 text-white" viewBox="0 0 24 24" fill="currentColor">
              <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
            </svg>
            <div>
              <h4 className="font-semibold text-white">X (Twitter)</h4>
              {linkedAccounts.twitter ? (
                <p className="text-sm text-green-400">
                  Connected: {user.twitterHandle || 'X Account'}
                </p>
              ) : (
                <p className="text-sm text-gray-400">Not connected</p>
              )}
            </div>
          </div>

          {linkedAccounts.twitter ? (
            <button
              onClick={handleUnlinkAccount}
              disabled={loadingProvider !== null}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white text-sm rounded-lg transition-colors"
            >
              {loadingProvider === 'unlink' ? 'Unlinking...' : 'Unlink'}
            </button>
          ) : (
            <button
              onClick={() => handleLinkAccount('twitter')}
              disabled={loadingProvider !== null}
              className="px-4 py-2 bg-black hover:bg-gray-800 disabled:bg-gray-600 text-white text-sm rounded-lg transition-colors"
            >
              {loadingProvider === 'twitter' ? 'Linking...' : 'Link X'}
            </button>
          )}
        </div>
      </div>

      <div className="text-center text-xs text-gray-400">
        <p>
          Linking social accounts helps other users identify and verify you.
          Your wallet remains your primary authentication method.
        </p>
      </div>
    </div>
  )
}