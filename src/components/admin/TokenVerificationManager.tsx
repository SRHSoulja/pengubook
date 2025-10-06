'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/providers/AuthProvider'
import { useToast } from '@/components/ui/Toast'

interface VerifiedToken {
  id: string
  tokenAddress: string
  symbol?: string
  name?: string
  verifiedAt: string
}

interface AvailableToken {
  tokenAddress: string
  symbol?: string
  name?: string
  seenCount?: number
  lastSeen?: string
}

export default function TokenVerificationManager() {
  const { user } = useAuth()
  const { toast } = useToast()
  const [verifiedTokens, setVerifiedTokens] = useState<VerifiedToken[]>([])
  const [availableTokens, setAvailableTokens] = useState<AvailableToken[]>([])
  const [loading, setLoading] = useState(true)
  const [showManualModal, setShowManualModal] = useState(false)
  const [manualTokenAddress, setManualTokenAddress] = useState('')
  const [manualTokenSymbol, setManualTokenSymbol] = useState('')
  const [manualTokenName, setManualTokenName] = useState('')
  const [selectedTokens, setSelectedTokens] = useState<Set<string>>(new Set())
  const [processingBatch, setProcessingBatch] = useState(false)

  useEffect(() => {
    fetchVerifiedTokens()
    fetchAvailableTokens()
  }, [])

  const fetchVerifiedTokens = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/admin/tokens/verified')
      if (response.ok) {
        const data = await response.json()
        setVerifiedTokens(data)
      }
    } catch (error) {
      console.error('Error fetching verified tokens:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchAvailableTokens = async () => {
    try {
      const response = await fetch('/api/admin/tokens/available')
      if (response.ok) {
        const data = await response.json()
        setAvailableTokens(data)
      }
    } catch (error) {
      console.error('Error fetching available tokens:', error)
    }
  }

  const handleQuickVerify = async (token: AvailableToken) => {
    try {
      const response = await fetch('/api/admin/tokens/verified', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tokenAddress: token.tokenAddress,
          symbol: token.symbol,
          name: token.name,
          userId: user?.id
        })
      })

      if (response.ok) {
        fetchVerifiedTokens()
        fetchAvailableTokens()
      } else {
        const data = await response.json()
        toast(data.error || 'Failed to verify token', 'error')
      }
    } catch (error) {
      console.error('Error verifying token:', error)
      toast('Failed to verify token', 'error')
    }
  }

  const handleManualVerify = async () => {
    try {
      const response = await fetch('/api/admin/tokens/verified', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tokenAddress: manualTokenAddress,
          symbol: manualTokenSymbol,
          name: manualTokenName,
          userId: user?.id
        })
      })

      if (response.ok) {
        fetchVerifiedTokens()
        fetchAvailableTokens()
        setShowManualModal(false)
        setManualTokenAddress('')
        setManualTokenSymbol('')
        setManualTokenName('')
      } else {
        const data = await response.json()
        toast(data.error || 'Failed to verify token', 'error')
      }
    } catch (error) {
      console.error('Error verifying token:', error)
      toast('Failed to verify token', 'error')
    }
  }

  const handleUnverifyToken = async (tokenAddress: string) => {
    if (!confirm('Are you sure you want to remove verification from this token?')) return

    try {
      const response = await fetch(`/api/admin/tokens/verified?address=${tokenAddress}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        fetchVerifiedTokens()
        fetchAvailableTokens()
      }
    } catch (error) {
      console.error('Error unverifying token:', error)
    }
  }

  const toggleTokenSelection = (tokenAddress: string) => {
    const newSelected = new Set(selectedTokens)
    if (newSelected.has(tokenAddress)) {
      newSelected.delete(tokenAddress)
    } else {
      newSelected.add(tokenAddress)
    }
    setSelectedTokens(newSelected)
  }

  const toggleSelectAll = () => {
    if (selectedTokens.size === availableTokens.length) {
      setSelectedTokens(new Set())
    } else {
      setSelectedTokens(new Set(availableTokens.map(t => t.tokenAddress)))
    }
  }

  const batchVerify = async () => {
    if (selectedTokens.size === 0) return
    if (!confirm(`Verify ${selectedTokens.size} token(s)?`)) return

    setProcessingBatch(true)
    try {
      const tokensToVerify = availableTokens.filter(t => selectedTokens.has(t.tokenAddress))

      for (const token of tokensToVerify) {
        await fetch('/api/admin/tokens/verified', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            tokenAddress: token.tokenAddress,
            symbol: token.symbol,
            name: token.name,
            userId: user?.id
          })
        })
      }

      setSelectedTokens(new Set())
      fetchVerifiedTokens()
      fetchAvailableTokens()
    } catch (error) {
      console.error('Error batch verifying:', error)
      toast('Failed to verify some tokens', 'error')
    } finally {
      setProcessingBatch(false)
    }
  }

  return (
    <div className="bg-black/20 backdrop-blur-lg rounded-2xl border border-white/20 p-6">
      <h2 className="text-xl font-semibold text-white mb-6">Token Verification Management</h2>

      {/* Available Tokens Section */}
      <div className="mb-8">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-white">Available Tokens to Verify ({availableTokens.length})</h3>
          <button
            onClick={() => setShowManualModal(true)}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm"
          >
            + Manual Entry
          </button>
        </div>

        {loading ? (
          <div className="text-center py-8">
            <div className="w-8 h-8 border-4 border-cyan-400 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-300">Loading tokens...</p>
          </div>
        ) : availableTokens.length === 0 ? (
          <div className="text-center py-8 text-gray-300 bg-black/30 rounded-xl">
            No unverified tokens found in user wallets
          </div>
        ) : (
          <>
            {/* Batch Actions Bar */}
            <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-4 flex items-center justify-between mb-4">
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedTokens.size === availableTokens.length && availableTokens.length > 0}
                    onChange={toggleSelectAll}
                    className="w-4 h-4"
                  />
                  <span className="text-white font-medium">
                    {selectedTokens.size > 0 ? `${selectedTokens.size} selected` : 'Select All'}
                  </span>
                </label>
              </div>

              {selectedTokens.size > 0 && (
                <button
                  onClick={batchVerify}
                  disabled={processingBatch}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white rounded-lg font-semibold transition-colors flex items-center gap-2"
                >
                  {processingBatch ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      Processing...
                    </>
                  ) : (
                    <>✓ Verify Selected</>
                  )}
                </button>
              )}
            </div>

            {/* Token Items */}
            <div className="grid grid-cols-1 gap-3">
              {availableTokens.map((token) => (
                <div key={token.tokenAddress} className="bg-black/30 rounded-xl p-4 border border-white/10">
                  <div className="flex items-start gap-3">
                    <input
                      type="checkbox"
                      checked={selectedTokens.has(token.tokenAddress)}
                      onChange={() => toggleTokenSelection(token.tokenAddress)}
                      className="w-5 h-5 mt-1"
                    />

                    <div className="flex-1">
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex-1">
                          <div className="text-white font-semibold">{token.symbol || 'Unknown'}</div>
                          {token.name && <div className="text-sm text-gray-300">{token.name}</div>}
                          <div className="text-xs text-gray-500 font-mono mt-1">{token.tokenAddress}</div>
                        </div>
                        {token.seenCount && token.seenCount > 1 && (
                          <div className="text-xs text-cyan-400 bg-cyan-500/10 px-2 py-1 rounded">
                            Seen {token.seenCount}x
                          </div>
                        )}
                      </div>
                      <button
                        onClick={() => handleQuickVerify(token)}
                        className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm"
                      >
                        ✓ Verify Token
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Verified Tokens Section */}
      <div>
        <h3 className="text-lg font-semibold text-white mb-4">Verified Tokens</h3>
        {verifiedTokens.length === 0 ? (
          <div className="text-center py-8 text-gray-300 bg-black/30 rounded-xl">
            No verified tokens
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3">
            {verifiedTokens.map((token) => (
              <div key={token.id} className="bg-black/30 rounded-xl p-4 border border-blue-500/30">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <div className="text-white font-semibold">{token.symbol || 'Unknown'}</div>
                      <svg className="w-5 h-5 text-blue-400" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                    </div>
                    {token.name && <div className="text-sm text-gray-300">{token.name}</div>}
                    <div className="text-xs text-gray-500 font-mono mt-1">{token.tokenAddress}</div>
                  </div>
                  <div className="text-xs text-gray-300">
                    Verified {new Date(token.verifiedAt).toLocaleDateString()}
                  </div>
                </div>

                <button
                  onClick={() => handleUnverifyToken(token.tokenAddress)}
                  className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded text-sm"
                >
                  Remove Verification
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Manual Entry Modal */}
      {showManualModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-xl p-6 max-w-md w-full border border-white/10">
            <h3 className="text-lg font-semibold text-white mb-4">Verify Token Manually</h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm text-gray-300 mb-2">Token Address *</label>
                <input
                  type="text"
                  value={manualTokenAddress}
                  onChange={(e) => setManualTokenAddress(e.target.value)}
                  placeholder="0x..."
                  className="w-full bg-black/20 border border-white/10 rounded px-3 py-2 text-white"
                />
              </div>

              <div>
                <label className="block text-sm text-gray-300 mb-2">Symbol</label>
                <input
                  type="text"
                  value={manualTokenSymbol}
                  onChange={(e) => setManualTokenSymbol(e.target.value)}
                  placeholder="USDC"
                  className="w-full bg-black/20 border border-white/10 rounded px-3 py-2 text-white"
                />
              </div>

              <div>
                <label className="block text-sm text-gray-300 mb-2">Name</label>
                <input
                  type="text"
                  value={manualTokenName}
                  onChange={(e) => setManualTokenName(e.target.value)}
                  placeholder="USD Coin"
                  className="w-full bg-black/20 border border-white/10 rounded px-3 py-2 text-white"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => {
                  setShowManualModal(false)
                  setManualTokenAddress('')
                  setManualTokenSymbol('')
                  setManualTokenName('')
                }}
                className="flex-1 px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded text-white"
              >
                Cancel
              </button>
              <button
                onClick={handleManualVerify}
                disabled={!manualTokenAddress}
                className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded text-white disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Verify Token
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
