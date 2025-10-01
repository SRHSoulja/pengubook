'use client'

import React, { useState, useEffect } from 'react'
import { useAuth } from '@/providers/AuthProvider'

interface WalletBalanceProps {
  walletAddress: string
  userId?: string
  isOwnProfile?: boolean
}

interface TokenBalance {
  token: string
  symbol: string
  name?: string
  balance: string
  decimals: number
  priceUsd?: number
  valueUsd?: number
  logoUrl?: string
  hideBalance?: boolean
  isVerified?: boolean
}

interface BalanceData {
  walletAddress: string
  nativeBalance: {
    balance: string
    symbol: string
    priceUsd?: number
    valueUsd?: number
  }
  tokens: TokenBalance[]
  totalValueUsd: number
}

const WalletBalance = React.memo(function WalletBalance({ walletAddress, userId, isOwnProfile = false }: WalletBalanceProps) {
  const { user } = useAuth()
  const [balanceData, setBalanceData] = useState<BalanceData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showReportModal, setShowReportModal] = useState(false)
  const [selectedToken, setSelectedToken] = useState<TokenBalance | null>(null)
  const [reportReason, setReportReason] = useState('SCAM')
  const [reportDescription, setReportDescription] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [showHiddenTokens, setShowHiddenTokens] = useState(false)
  const [hiddenTokens, setHiddenTokens] = useState<any[]>([])
  const [loadingHidden, setLoadingHidden] = useState(false)
  const [selectedForUnhide, setSelectedForUnhide] = useState<Set<string>>(new Set())
  const [favoriteTokens, setFavoriteTokens] = useState<Set<string>>(new Set())

  console.log('[WalletBalance] Render - isOwnProfile:', isOwnProfile, 'user?.id:', user?.id)

  // Load favorites from localStorage
  useEffect(() => {
    if (user?.id) {
      const stored = localStorage.getItem(`favorites-${user.id}`)
      if (stored) {
        setFavoriteTokens(new Set(JSON.parse(stored)))
      }
    }
  }, [user?.id])

  useEffect(() => {
    console.log('[WalletBalance] Fetching balance for:', walletAddress)

    let cancelled = false
    const controller = new AbortController()

    const fetchBalance = async () => {
      try {
        setLoading(true)
        setError(null)

        console.log('[WalletBalance] Calling API...')

        const url = userId
          ? `/api/wallet/balance?address=${walletAddress}&userId=${userId}`
          : `/api/wallet/balance?address=${walletAddress}`

        const response = await fetch(url, {
          signal: controller.signal
        })

        if (cancelled) return

        const data = await response.json()

        console.log('[WalletBalance] API response:', { ok: response.ok, data })

        if (response.ok) {
          setBalanceData(data)
          console.log('[WalletBalance] Balance data set:', data)
        } else {
          setError(data.error || 'Failed to fetch balance')
        }
      } catch (err: any) {
        if (cancelled || err.name === 'AbortError') {
          console.log('[WalletBalance] Request cancelled')
          return
        }
        console.error('[WalletBalance] Error fetching wallet balance:', err)
        setError('Failed to fetch wallet balance')
      } finally {
        if (!cancelled) {
          setLoading(false)
          console.log('[WalletBalance] Loading complete')
        }
      }
    }

    fetchBalance()

    // Cleanup function
    return () => {
      cancelled = true
      controller.abort()
    }
  }, [walletAddress, userId])

  const handleHideToken = async (token: TokenBalance) => {
    if (!user?.id) return

    try {
      const response = await fetch('/api/tokens/hidden', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          tokenAddress: token.token,
          symbol: token.symbol
        })
      })

      if (response.ok) {
        // Remove from current display
        setBalanceData(prev => {
          if (!prev) return null
          const filteredTokens = prev.tokens.filter(t => t.token !== token.token)
          let totalTokenValueUsd = 0
          for (const t of filteredTokens) {
            if (t.valueUsd && !t.hideBalance) totalTokenValueUsd += t.valueUsd
          }
          return {
            ...prev,
            tokens: filteredTokens,
            totalValueUsd: (prev.nativeBalance.valueUsd || 0) + totalTokenValueUsd
          }
        })
      }
    } catch (error) {
      console.error('Error hiding token:', error)
    }
  }

  const handleHideBalance = (token: TokenBalance) => {
    // Toggle hideBalance flag locally
    setBalanceData(prev => {
      if (!prev) return null
      const updatedTokens = prev.tokens.map(t =>
        t.token === token.token ? { ...t, hideBalance: !t.hideBalance } : t
      )

      // Recalculate total
      let totalTokenValueUsd = 0
      for (const t of updatedTokens) {
        if (t.valueUsd && !t.hideBalance) totalTokenValueUsd += t.valueUsd
      }

      return {
        ...prev,
        tokens: updatedTokens,
        totalValueUsd: (prev.nativeBalance.valueUsd || 0) + totalTokenValueUsd
      }
    })
  }

  const handleReportToken = (token: TokenBalance) => {
    setSelectedToken(token)
    setShowReportModal(true)
  }

  const fetchHiddenTokens = async () => {
    if (!user?.id) return

    setLoadingHidden(true)
    try {
      const response = await fetch(`/api/tokens/hidden?userId=${user.id}`)
      if (response.ok) {
        const data = await response.json()
        setHiddenTokens(data)
      }
    } catch (error) {
      console.error('Error fetching hidden tokens:', error)
    } finally {
      setLoadingHidden(false)
    }
  }

  const handleUnhideSelected = async () => {
    if (!user?.id || selectedForUnhide.size === 0) return

    try {
      // Unhide all selected tokens in parallel
      await Promise.all(
        Array.from(selectedForUnhide).map(tokenAddress =>
          fetch(`/api/tokens/hidden?address=${tokenAddress}&userId=${user.id}`, {
            method: 'DELETE'
          })
        )
      )

      // Remove unhidden tokens from the list
      setHiddenTokens(prev => prev.filter(t => !selectedForUnhide.has(t.tokenAddress)))
      setSelectedForUnhide(new Set())

      // Refetch balance data to show unhidden tokens
      const url = userId
        ? `/api/wallet/balance?address=${walletAddress}&userId=${userId}`
        : `/api/wallet/balance?address=${walletAddress}`

      const response = await fetch(url)
      if (response.ok) {
        const data = await response.json()
        setBalanceData(data)
      }
    } catch (error) {
      console.error('Error unhiding tokens:', error)
    }
  }

  const toggleFavorite = (tokenAddress: string) => {
    if (!user?.id) return

    setFavoriteTokens(prev => {
      const newSet = new Set(prev)
      if (newSet.has(tokenAddress)) {
        newSet.delete(tokenAddress)
      } else {
        newSet.add(tokenAddress)
      }

      // Save to localStorage
      localStorage.setItem(`favorites-${user.id}`, JSON.stringify(Array.from(newSet)))
      return newSet
    })
  }

  const openHiddenTokensModal = () => {
    setShowHiddenTokens(true)
    fetchHiddenTokens()
  }

  const submitReport = async () => {
    if (!selectedToken || !user?.id) return

    setSubmitting(true)
    try {
      const response = await fetch('/api/tokens/report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          tokenAddress: selectedToken.token,
          symbol: selectedToken.symbol,
          name: selectedToken.name,
          reason: reportReason,
          description: reportDescription
        })
      })

      if (response.ok) {
        // Remove from display (it's automatically hidden when reported)
        setBalanceData(prev => {
          if (!prev) return null
          const filteredTokens = prev.tokens.filter(t => t.token !== selectedToken.token)
          let totalTokenValueUsd = 0
          for (const t of filteredTokens) {
            if (t.valueUsd) totalTokenValueUsd += t.valueUsd
          }
          return {
            ...prev,
            tokens: filteredTokens,
            totalValueUsd: (prev.nativeBalance.valueUsd || 0) + totalTokenValueUsd
          }
        })
        setShowReportModal(false)
        setSelectedToken(null)
        setReportDescription('')
      }
    } catch (error) {
      console.error('Error reporting token:', error)
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="bg-white/10 backdrop-blur-lg rounded-2xl border border-white/20 p-6">
        <h3 className="text-lg font-semibold text-white mb-4">💰 Wallet Balance</h3>
        <div className="flex flex-col items-center justify-center py-8 space-y-3">
          <div className="w-6 h-6 border-3 border-cyan-400 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-sm text-gray-400">Loading token balances... This may take a moment</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-white/10 backdrop-blur-lg rounded-2xl border border-white/20 p-6">
        <h3 className="text-lg font-semibold text-white mb-4">💰 Wallet Balance</h3>
        <div className="text-center text-gray-400 py-4">
          <p>{error}</p>
        </div>
      </div>
    )
  }

  if (!balanceData) {
    return null
  }

  const formatUSD = (value: number | undefined) => {
    if (value === undefined) return 'N/A'
    return `$${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  }

  return (
    <div className="bg-white/10 backdrop-blur-lg rounded-2xl border border-white/20 p-6">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold text-white">💰 Wallet Balance</h3>
        {isOwnProfile && user?.id && (
          <button
            onClick={openHiddenTokensModal}
            className="text-sm text-gray-400 hover:text-white transition-colors flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            Manage Hidden
          </button>
        )}
      </div>

      {/* Native Balance */}
      <div className="mb-4 p-4 bg-black/20 rounded-xl">
        <div className="flex justify-between items-center mb-2">
          <div className="flex items-center gap-3">
            {balanceData.nativeBalance.logoUrl && (
              <img
                src={balanceData.nativeBalance.logoUrl}
                alt={balanceData.nativeBalance.symbol}
                className="w-8 h-8 rounded-full"
                onError={(e) => e.currentTarget.style.display = 'none'}
              />
            )}
            <span className="text-gray-300">{balanceData.nativeBalance.symbol}</span>
          </div>
          <span className="text-white font-semibold">{balanceData.nativeBalance.balance}</span>
        </div>
        <div className="flex justify-between items-center mt-2">
          {balanceData.nativeBalance.priceUsd !== undefined && (
            <div className="text-xs text-gray-500">
              ${balanceData.nativeBalance.priceUsd.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 6 })} / token
            </div>
          )}
          {balanceData.nativeBalance.valueUsd !== undefined && (
            <div className="text-sm text-gray-400">
              {formatUSD(balanceData.nativeBalance.valueUsd)}
            </div>
          )}
        </div>
      </div>

      {/* Token Balances */}
      {balanceData.tokens.length > 0 && (
        <div className="space-y-3 mb-4">
          {balanceData.tokens
            .sort((a, b) => {
              // Sort favorites to top
              const aFav = favoriteTokens.has(a.token)
              const bFav = favoriteTokens.has(b.token)
              if (aFav && !bFav) return -1
              if (!aFav && bFav) return 1
              return 0
            })
            .map((token, index) => (
            <div key={index} className="p-4 bg-black/20 rounded-xl group relative hover:bg-black/30 transition-colors">
              <div className="flex justify-between items-start mb-2">
                <div className="flex items-center gap-3 flex-1">
                  {token.logoUrl && (
                    <img
                      src={token.logoUrl}
                      alt={token.symbol}
                      className="w-8 h-8 rounded-full"
                      onError={(e) => e.currentTarget.style.display = 'none'}
                    />
                  )}
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-gray-300 font-medium">{token.symbol}</span>
                      {token.isVerified && (
                        <svg className="w-4 h-4 text-blue-400" fill="currentColor" viewBox="0 0 20 20" title="Verified Token">
                          <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                      )}
                    </div>
                    {token.name && (
                      <div className="text-xs text-gray-500">{token.name}</div>
                    )}
                  </div>
                  <span className="text-white font-semibold">{token.balance}</span>
                </div>
                <div className="ml-3 flex gap-2">
                  {/* Favorite button - always visible */}
                  {isOwnProfile && user?.id && (
                    <button
                      onClick={() => toggleFavorite(token.token)}
                      className={`p-2 rounded transition-colors ${
                        favoriteTokens.has(token.token)
                          ? 'bg-yellow-600/50 hover:bg-yellow-500 text-yellow-300'
                          : 'bg-gray-700/30 hover:bg-gray-600/50 text-gray-500 hover:text-yellow-300'
                      }`}
                      title={favoriteTokens.has(token.token) ? "Remove from favorites" : "Add to favorites"}
                    >
                      <svg className="w-4 h-4" fill={favoriteTokens.has(token.token) ? "currentColor" : "none"} stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                      </svg>
                    </button>
                  )}
                  {/* Action buttons - hover only */}
                  {isOwnProfile && user?.id && (
                    <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => handleHideBalance(token)}
                        className={`p-2 rounded transition-colors ${
                          token.hideBalance
                            ? 'bg-blue-700/50 hover:bg-blue-600 text-blue-300 hover:text-blue-100'
                            : 'bg-gray-700/50 hover:bg-gray-600 text-gray-300 hover:text-white'
                        }`}
                        title={token.hideBalance ? "Show balance in total" : "Hide balance from total"}
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </button>
                      <button
                        onClick={() => handleHideToken(token)}
                        className="p-2 bg-gray-700/50 hover:bg-gray-600 rounded text-gray-300 hover:text-white transition-colors"
                        title="Hide token completely"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                        </svg>
                      </button>
                      <button
                        onClick={() => handleReportToken(token)}
                        className="p-2 bg-red-700/50 hover:bg-red-600 rounded text-red-300 hover:text-red-100 transition-colors"
                        title="Report scam token"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                      </button>
                    </div>
                  )}
                </div>
              </div>
              <div className="flex justify-between items-center mt-2">
                {token.priceUsd !== undefined && (
                  <div className="text-xs text-gray-500">
                    ${token.priceUsd.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 6 })} / token
                  </div>
                )}
                {token.valueUsd !== undefined && (
                  <div className={`text-sm ${token.hideBalance ? 'text-gray-600 line-through' : 'text-gray-400'}`}>
                    {formatUSD(token.valueUsd)}
                    {token.hideBalance && (
                      <span className="ml-2 text-xs text-gray-500">(excluded)</span>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Total Value */}
      {balanceData.totalValueUsd > 0 && (
        <div className="pt-4 border-t border-white/10">
          <div className="flex justify-between items-center">
            <span className="text-gray-300 font-semibold">Total Value</span>
            <span className="text-cyan-400 font-bold text-lg">
              {formatUSD(balanceData.totalValueUsd)}
            </span>
          </div>
        </div>
      )}

      {/* Wallet Address */}
      <div className="mt-4 pt-4 border-t border-white/10">
        <div className="text-xs text-gray-400 break-all">
          {balanceData.walletAddress}
        </div>
      </div>

      {/* Report Modal */}
      {showReportModal && selectedToken && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-xl p-6 max-w-md w-full border border-white/10">
            <h3 className="text-lg font-semibold text-white mb-4">Report Scam Token</h3>

            <div className="mb-4 p-3 bg-black/20 rounded">
              <div className="text-white font-medium">{selectedToken.symbol}</div>
              {selectedToken.name && (
                <div className="text-xs text-gray-400">{selectedToken.name}</div>
              )}
              <div className="text-xs text-gray-500 mt-1 break-all">{selectedToken.token}</div>
            </div>

            <div className="mb-4">
              <label className="block text-sm text-gray-300 mb-2">Reason</label>
              <select
                value={reportReason}
                onChange={(e) => setReportReason(e.target.value)}
                className="w-full bg-black/20 border border-white/10 rounded px-3 py-2 text-white"
              >
                <option value="SCAM">Scam Token</option>
                <option value="SPAM">Spam/Airdrop</option>
                <option value="PHISHING">Phishing Attempt</option>
                <option value="IMPERSONATION">Impersonating Another Token</option>
                <option value="OTHER">Other</option>
              </select>
            </div>

            <div className="mb-4">
              <label className="block text-sm text-gray-300 mb-2">Additional Details (Optional)</label>
              <textarea
                value={reportDescription}
                onChange={(e) => setReportDescription(e.target.value)}
                placeholder="Provide any additional context..."
                className="w-full bg-black/20 border border-white/10 rounded px-3 py-2 text-white resize-none"
                rows={3}
              />
            </div>

            <div className="text-xs text-gray-400 mb-4">
              This token will be hidden from your balance and reported to admins for review.
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowReportModal(false)
                  setSelectedToken(null)
                  setReportDescription('')
                }}
                disabled={submitting}
                className="flex-1 px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded text-white disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={submitReport}
                disabled={submitting}
                className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 rounded text-white disabled:opacity-50"
              >
                {submitting ? 'Reporting...' : 'Report & Hide'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Hidden Tokens Modal */}
      {showHiddenTokens && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-xl p-6 max-w-md w-full border border-white/10 max-h-[80vh] flex flex-col">
            <h3 className="text-lg font-semibold text-white mb-4">Hidden Tokens</h3>

            {loadingHidden ? (
              <div className="flex justify-center py-8">
                <div className="w-6 h-6 border-3 border-cyan-400 border-t-transparent rounded-full animate-spin"></div>
              </div>
            ) : hiddenTokens.length === 0 ? (
              <p className="text-gray-400 text-center py-8">No hidden tokens</p>
            ) : (
              <>
                {/* Select all / clear */}
                <div className="flex gap-2 mb-3">
                  <button
                    onClick={() => setSelectedForUnhide(new Set(hiddenTokens.map(t => t.tokenAddress)))}
                    className="px-3 py-1 bg-gray-700 hover:bg-gray-600 rounded text-white text-sm"
                  >
                    Select All
                  </button>
                  <button
                    onClick={() => setSelectedForUnhide(new Set())}
                    className="px-3 py-1 bg-gray-700 hover:bg-gray-600 rounded text-white text-sm"
                  >
                    Clear
                  </button>
                  {selectedForUnhide.size > 0 && (
                    <span className="px-3 py-1 bg-cyan-600/20 text-cyan-300 rounded text-sm">
                      {selectedForUnhide.size} selected
                    </span>
                  )}
                </div>

                {/* Token list */}
                <div className="space-y-2 mb-4 overflow-y-auto flex-1">
                  {hiddenTokens.map((token) => (
                    <div
                      key={token.tokenAddress}
                      className={`p-3 rounded flex items-center gap-3 cursor-pointer transition-colors ${
                        selectedForUnhide.has(token.tokenAddress)
                          ? 'bg-cyan-600/20 border border-cyan-500/50'
                          : 'bg-black/20 hover:bg-black/30'
                      }`}
                      onClick={() => {
                        setSelectedForUnhide(prev => {
                          const newSet = new Set(prev)
                          if (newSet.has(token.tokenAddress)) {
                            newSet.delete(token.tokenAddress)
                          } else {
                            newSet.add(token.tokenAddress)
                          }
                          return newSet
                        })
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={selectedForUnhide.has(token.tokenAddress)}
                        onChange={() => {}}
                        className="w-4 h-4 rounded"
                      />
                      <div className="flex-1">
                        <div className="text-white font-medium">{token.symbol || 'Unknown'}</div>
                        <div className="text-xs text-gray-500 break-all">{token.tokenAddress}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowHiddenTokens(false)
                  setSelectedForUnhide(new Set())
                }}
                className="flex-1 px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded text-white"
              >
                Close
              </button>
              {selectedForUnhide.size > 0 && (
                <button
                  onClick={handleUnhideSelected}
                  className="flex-1 px-4 py-2 bg-cyan-600 hover:bg-cyan-700 rounded text-white"
                >
                  Unhide {selectedForUnhide.size} token{selectedForUnhide.size > 1 ? 's' : ''}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
})

export default WalletBalance
