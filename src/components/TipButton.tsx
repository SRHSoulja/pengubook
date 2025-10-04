'use client'

import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useAbstractClient } from '@abstract-foundation/agw-react'
import { useAuth } from '@/providers/AuthProvider'
import { parseDecimalToWei, numberToSafeDecimalString } from '@/lib/utils/decimal-conversion'
import { ERC20_TRANSFER_ABI } from '@/lib/constants/abis'

interface TipButtonProps {
  userId: string
}

interface Token {
  token: string
  symbol: string
  name: string
  balance: string
  decimals: number
  priceUsd?: number
  valueUsd?: number
  logoUrl?: string
  isVerified?: boolean
}

interface UserData {
  id: string
  username: string
  displayName: string
  walletAddress: string
}

export default function TipButton({ userId }: TipButtonProps) {
  const { data: client } = useAbstractClient()
  const { user: currentUser } = useAuth()
  const [showModal, setShowModal] = useState(false)
  const [amount, setAmount] = useState('')
  const [message, setMessage] = useState('')
  const [selectedToken, setSelectedToken] = useState('ETH')
  const [isSending, setIsSending] = useState(false)
  const [status, setStatus] = useState('')
  const [tokens, setTokens] = useState<Token[]>([])
  const [nativeToken, setNativeToken] = useState<any>(null)
  const [recipientData, setRecipientData] = useState<UserData | null>(null)
  const [loadingTokens, setLoadingTokens] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    return () => setMounted(false)
  }, [])

  useEffect(() => {
    if (showModal) {
      fetchTokens()
      fetchRecipientData()
    }
  }, [showModal, userId])

  const fetchTokens = async () => {
    // Try to get wallet address from multiple sources
    let walletAddress: string | undefined = client?.account?.address

    // Fallback: check if user has a wallet address in their profile
    if (!walletAddress && currentUser?.walletAddress) {
      walletAddress = currentUser.walletAddress
    }

    if (!walletAddress) {
      setStatus('Please connect your wallet to send tips')
      return
    }

    try {
      setLoadingTokens(true)

      // Fetch wallet balance with user's hidden tokens filtered
      const response = await fetch(`/api/wallet/balance?address=${walletAddress}&userId=${userId}`)
      const data = await response.json()

      if (response.ok && data) {
        // Set native ETH balance
        setNativeToken(data.nativeBalance)

        // Filter tokens with balance > 0 and sort by value
        const availableTokens = data.tokens
          .filter((token: Token) => parseFloat(token.balance) > 0)
          .sort((a: Token, b: Token) => {
            // Sort verified tokens first, then by USD value
            if (a.isVerified && !b.isVerified) return -1
            if (!a.isVerified && b.isVerified) return 1
            return (b.valueUsd || 0) - (a.valueUsd || 0)
          })

        setTokens(availableTokens)
        setSelectedToken('ETH') // Default to ETH
      } else {
        setStatus('Failed to load wallet tokens')
      }
    } catch (error) {
      console.error('Failed to fetch wallet tokens:', error)
      setStatus('Failed to load wallet tokens')
    } finally {
      setLoadingTokens(false)
    }
  }

  const fetchRecipientData = async () => {
    try {
      const response = await fetch(`/api/users/${userId}`)
      const data = await response.json()
      if (response.ok) {
        setRecipientData(data.data)
      } else {
        setStatus('Failed to fetch recipient data')
      }
    } catch (error) {
      console.error('Failed to fetch recipient data:', error)
      setStatus('Failed to fetch recipient data')
    }
  }

  const handleSendTip = async () => {
    // Get wallet address from client or current user
    const senderAddress = client?.account?.address || currentUser?.walletAddress

    if (!amount || !senderAddress || !recipientData) {
      setStatus('Please fill in all required fields!')
      return
    }

    if (!recipientData.walletAddress) {
      setStatus('Recipient does not have a wallet address!')
      return
    }

    setIsSending(true)
    setStatus('Preparing tip transaction...')

    try {
      let selectedTokenData: Token | null = null
      let decimals = 18
      let tokenAddress: string | null = null
      let tokenSymbol = selectedToken

      if (selectedToken === 'ETH') {
        decimals = nativeToken?.decimals || 18
        tokenSymbol = nativeToken?.symbol || 'ETH'
      } else {
        selectedTokenData = tokens.find(t => t.symbol === selectedToken) || null
        if (!selectedTokenData) {
          setStatus('Invalid token selected!')
          setIsSending(false)
          return
        }
        decimals = selectedTokenData.decimals
        tokenAddress = selectedTokenData.token
      }

      // Check if user has enough balance
      const requiredAmount = parseFloat(amount)
      const availableBalance = selectedToken === 'ETH'
        ? parseFloat(nativeToken?.balance || '0')
        : parseFloat(selectedTokenData?.balance || '0')

      if (requiredAmount > availableBalance) {
        setStatus(`Insufficient balance! You have ${availableBalance.toFixed(6)} ${tokenSymbol}`)
        setIsSending(false)
        return
      }

      // Check if wallet client is available for signing transactions
      if (!client?.account?.address) {
        setStatus('❌ Wallet not connected! Please connect your Abstract wallet to send tips.')
        setIsSending(false)
        return
      }

      setStatus('🔐 Please sign the transaction in your wallet...')

      let txHash: string

      if (selectedToken === 'ETH') {
        // Native ETH transaction - use safe decimal conversion
        const amountString = numberToSafeDecimalString(requiredAmount, decimals)
        const ethAmount = parseDecimalToWei(amountString, decimals)
        txHash = await client.sendTransaction({
          to: recipientData.walletAddress as `0x${string}`,
          value: ethAmount
        })
      } else {
        // ERC-20 token transaction - use safe decimal conversion
        const amountString = numberToSafeDecimalString(requiredAmount, decimals)
        const tokenAmount = parseDecimalToWei(amountString, decimals)

        txHash = await client.writeContract({
          address: tokenAddress as `0x${string}`,
          abi: ERC20_TRANSFER_ABI,
          functionName: 'transfer',
          args: [recipientData.walletAddress as `0x${string}`, tokenAmount]
        })
      }

      setStatus('⛓️ Transaction submitted! Recording tip...')

      // Get or create token in database
      let dbTokenId: string | null = null
      try {
        const tokenResponse = await fetch('/api/tokens', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            symbol: tokenSymbol,
            name: selectedTokenData?.name || tokenSymbol,
            contractAddress: tokenAddress,
            decimals: decimals
          })
        })
        const tokenData = await tokenResponse.json()
        if (tokenData.success) {
          dbTokenId = tokenData.token.id
        }
      } catch (err) {
        console.error('Failed to create/fetch token:', err)
      }

      // Record the tip in the backend
      const tipResponse = await fetch('/api/tips', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-wallet-address': senderAddress
        },
        body: JSON.stringify({
          toUserId: userId,
          tokenId: dbTokenId,
          amount: amount,
          message: message || null,
          isPublic: true,
          transactionHash: txHash
        })
      })

      const tipData = await tipResponse.json()

      if (tipResponse.ok) {
        setStatus(`🎉 Tip sent successfully to ${recipientData.displayName}!`)
        setTimeout(() => {
          setShowModal(false)
          setStatus('')
          setAmount('')
          setMessage('')
        }, 3000)
      } else {
        setStatus(`Transaction sent but failed to record: ${tipData.error}`)
      }

    } catch (error: any) {
      console.error('Tip failed:', error)
      if (error.message?.includes('User denied') || error.message?.includes('rejected')) {
        setStatus('Transaction cancelled by user.')
      } else {
        setStatus(`Transaction failed: ${error.message || 'Unknown error'}`)
      }
    } finally {
      setIsSending(false)
    }
  }

  const renderModal = () => (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4" style={{ zIndex: 99999 }}>
      <div className="bg-gradient-to-br from-gray-900 to-gray-800 border border-white/20 rounded-2xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-2xl font-bold text-white flex items-center gap-2">
                💰 Send Tip
              </h3>
              <button
                onClick={() => setShowModal(false)}
                className="text-gray-300 hover:text-white transition-colors text-2xl"
              >
                ✕
              </button>
            </div>

            {/* Recipient Info */}
            {recipientData && (
              <div className="mb-6 p-4 bg-gradient-to-r from-blue-500/20 to-purple-500/20 border border-blue-500/30 rounded-xl">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-gradient-to-br from-cyan-400 to-blue-500 rounded-full flex items-center justify-center text-white font-bold text-xl">
                    {recipientData.displayName.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="text-white font-medium">{recipientData.displayName}</p>
                    <p className="text-blue-200 text-sm">@{recipientData.username}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Token Selection */}
            <div className="mb-6">
              <label className="block text-sm font-semibold text-white mb-3">Select Token</label>
              {loadingTokens ? (
                <div className="flex items-center justify-center py-8 bg-white/5 rounded-xl">
                  <div className="w-8 h-8 border-4 border-cyan-400 border-t-transparent rounded-full animate-spin"></div>
                  <span className="ml-3 text-gray-300">Loading your tokens...</span>
                </div>
              ) : (
                <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                  {/* Native ETH */}
                  {nativeToken && (
                    <button
                      type="button"
                      onClick={() => setSelectedToken('ETH')}
                      className={`w-full flex items-center justify-between p-4 rounded-xl transition-all ${
                        selectedToken === 'ETH'
                          ? 'bg-gradient-to-r from-cyan-500/30 to-blue-500/30 border-2 border-cyan-400 shadow-lg shadow-cyan-500/20'
                          : 'bg-gray-700/30 border border-white/10 hover:bg-gray-700/50 hover:border-cyan-400/50'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        {nativeToken.logoUrl ? (
                          <img src={nativeToken.logoUrl} alt="ETH" className="w-10 h-10 rounded-full" />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-cyan-400 to-blue-500 flex items-center justify-center">
                            <span className="text-white font-bold">Ξ</span>
                          </div>
                        )}
                        <div className="text-left">
                          <div className="font-semibold text-white flex items-center gap-2">
                            {nativeToken.symbol}
                            <span className="text-xs bg-cyan-500/20 text-cyan-400 px-2 py-0.5 rounded-full">Native</span>
                          </div>
                          <div className="text-xs text-gray-300">Ethereum</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-white font-semibold">{parseFloat(nativeToken.balance).toFixed(4)}</div>
                        {nativeToken.valueUsd && (
                          <div className="text-xs text-green-400">${nativeToken.valueUsd.toFixed(2)}</div>
                        )}
                      </div>
                    </button>
                  )}

                  {/* ERC-20 Tokens */}
                  {tokens.map((token) => (
                    <button
                      key={token.token}
                      type="button"
                      onClick={() => setSelectedToken(token.symbol)}
                      className={`w-full flex items-center justify-between p-4 rounded-xl transition-all ${
                        selectedToken === token.symbol
                          ? 'bg-gradient-to-r from-cyan-500/30 to-blue-500/30 border-2 border-cyan-400 shadow-lg shadow-cyan-500/20'
                          : 'bg-gray-700/30 border border-white/10 hover:bg-gray-700/50 hover:border-cyan-400/50'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        {token.logoUrl ? (
                          <img src={token.logoUrl} alt={token.symbol} className="w-10 h-10 rounded-full" />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-400 to-pink-400 flex items-center justify-center text-white text-sm font-bold">
                            {token.symbol.slice(0, 2)}
                          </div>
                        )}
                        <div className="text-left">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-white">{token.symbol}</span>
                            {token.isVerified && (
                              <span className="text-cyan-400 text-sm" title="Verified Token">✓</span>
                            )}
                          </div>
                          <div className="text-xs text-gray-300 truncate max-w-[150px]">{token.name}</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-white font-semibold">{parseFloat(token.balance).toFixed(4)}</div>
                        {token.valueUsd && (
                          <div className="text-xs text-green-400">${token.valueUsd.toFixed(2)}</div>
                        )}
                      </div>
                    </button>
                  ))}

                  {!nativeToken && tokens.length === 0 && (
                    <div className="text-center py-8 bg-gray-700/20 rounded-xl">
                      <img src="https://gmgnrepeat.com/icons/penguintip1.png" alt="No tokens" className="w-12 h-12 mx-auto mb-2" />
                      <p className="text-gray-300">No tokens available</p>
                      <p className="text-xs text-gray-500 mt-1">Add tokens to your wallet to send tips</p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Amount Input */}
            <div className="mb-6">
              <label className="block text-sm font-semibold text-white mb-3">Amount</label>
              <div className="relative">
                <input
                  type="number"
                  step="0.001"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.01"
                  className="w-full bg-gray-700/30 border border-white/20 rounded-xl px-4 py-4 pr-20 text-white text-lg placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:border-transparent"
                />
                <div className="absolute right-4 top-1/2 -translate-y-1/2 bg-cyan-500/20 text-cyan-400 px-3 py-1 rounded-lg text-sm font-semibold">
                  {selectedToken}
                </div>
              </div>
              {selectedToken && (
                <div className="mt-2 flex items-center justify-between text-sm">
                  <span className="text-gray-300">
                    Available: <span className="text-white font-medium">
                      {selectedToken === 'ETH'
                        ? parseFloat(nativeToken?.balance || '0').toFixed(6)
                        : parseFloat(tokens.find(t => t.symbol === selectedToken)?.balance || '0').toFixed(6)
                      } {selectedToken}
                    </span>
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      const maxBalance = selectedToken === 'ETH'
                        ? parseFloat(nativeToken?.balance || '0')
                        : parseFloat(tokens.find(t => t.symbol === selectedToken)?.balance || '0')
                      setAmount((maxBalance * 0.95).toFixed(6)) // 95% to leave room for gas
                    }}
                    className="text-cyan-400 hover:text-cyan-300 text-xs font-medium"
                  >
                    MAX
                  </button>
                </div>
              )}
            </div>

            {/* Message Input */}
            <div className="mb-6">
              <label className="block text-sm font-semibold text-white mb-3">
                Message <span className="text-gray-500 font-normal">(Optional)</span>
              </label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Great post! 🎉"
                rows={3}
                maxLength={200}
                className="w-full bg-gray-700/30 border border-white/20 rounded-xl px-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:border-transparent resize-none"
              />
              <div className="mt-1 text-xs text-gray-300 text-right">
                {message.length}/200
              </div>
            </div>

            {/* Status Messages */}
            {status && (
              <div className="mb-6 p-4 bg-gradient-to-r from-purple-500/20 to-pink-500/20 border border-purple-500/30 rounded-xl">
                <p className="text-white text-sm flex items-center gap-2">
                  <span className="text-lg">{
                    status.includes('🎉') ? '🎉' :
                    status.includes('🔐') ? '🔐' :
                    status.includes('⛓️') ? '⛓️' :
                    status.includes('❌') ? '❌' :
                    'ℹ️'
                  }</span>
                  {status}
                </p>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-3 sticky bottom-0 bg-gradient-to-t from-gray-900 to-transparent pt-4">
              <button
                onClick={() => {
                  setShowModal(false)
                  setStatus('')
                  setAmount('')
                  setMessage('')
                }}
                disabled={isSending}
                className="flex-1 bg-gray-700/50 hover:bg-gray-700 text-white py-4 rounded-xl transition-all font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
              <button
                onClick={handleSendTip}
                disabled={!amount || isSending || !recipientData || (!nativeToken && tokens.length === 0) || loadingTokens}
                className="flex-1 bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-white py-4 rounded-xl transition-all font-semibold shadow-lg shadow-yellow-500/20 disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none"
              >
                {isSending ? (
                  <span className="flex items-center justify-center gap-2">
                    <div className="w-5 h-5 border-3 border-white border-t-transparent rounded-full animate-spin"></div>
                    Sending...
                  </span>
                ) : loadingTokens ? (
                  'Loading...'
                ) : (
                  `💰 Send Tip`
                )}
              </button>
            </div>
      </div>
    </div>
  )

  return (
    <>
      <button
        onClick={() => setShowModal(true)}
        className="bg-yellow-500 hover:bg-yellow-600 text-white px-4 py-2 rounded-lg transition-colors flex items-center justify-center gap-2"
      >
        <img src="https://gmgnrepeat.com/icons/penguintip1.png" alt="Tip" className="w-6 h-6" />
        <span>Tip</span>
      </button>

      {mounted && showModal && createPortal(
        renderModal(),
        document.body
      )}
    </>
  )
}