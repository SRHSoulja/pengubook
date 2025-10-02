'use client'

import { useState, useEffect } from 'react'
import { useAbstractClient } from '@abstract-foundation/agw-react'

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

  useEffect(() => {
    if (showModal) {
      fetchTokens()
      fetchRecipientData()
    }
  }, [showModal, userId])

  const fetchTokens = async () => {
    if (!client?.account?.address) return

    try {
      setLoadingTokens(true)

      // Fetch wallet balance with user's hidden tokens filtered
      const response = await fetch(`/api/wallet/balance?address=${client.account.address}&userId=${userId}`)
      const data = await response.json()

      if (response.ok) {
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
    if (!amount || !client?.account?.address || !recipientData) {
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

      setStatus('🔐 Please sign the transaction in your wallet...')

      let txHash: string

      if (selectedToken === 'ETH') {
        // Native ETH transaction
        const ethAmount = BigInt(Math.floor(requiredAmount * Math.pow(10, decimals)))
        txHash = await client.sendTransaction({
          to: recipientData.walletAddress as `0x${string}`,
          value: ethAmount
        })
      } else {
        // ERC-20 token transaction
        const tokenAmount = BigInt(Math.floor(requiredAmount * Math.pow(10, decimals)))

        txHash = await client.writeContract({
          address: tokenAddress as `0x${string}`,
          abi: [
            {
              name: 'transfer',
              type: 'function',
              stateMutability: 'nonpayable',
              inputs: [
                { name: 'to', type: 'address' },
                { name: 'amount', type: 'uint256' }
              ],
              outputs: [{ name: '', type: 'bool' }]
            }
          ],
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
          'x-wallet-address': client.account.address
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

  return (
    <>
      <button
        onClick={() => setShowModal(true)}
        className="bg-yellow-500 hover:bg-yellow-600 text-white px-4 py-2 rounded-lg transition-colors"
      >
        💰 Tip
      </button>

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white/10 backdrop-blur-lg rounded-2xl border border-white/20 p-6 w-96">
            <h3 className="text-lg font-semibold mb-4 text-white">Send Tip</h3>

            <div className="mb-4">
              <label className="block text-sm font-medium text-white mb-2">Select Token</label>
              {loadingTokens ? (
                <div className="flex items-center justify-center py-4">
                  <div className="w-6 h-6 border-3 border-cyan-400 border-t-transparent rounded-full animate-spin"></div>
                  <span className="ml-2 text-gray-400">Loading tokens...</span>
                </div>
              ) : (
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {/* Native ETH */}
                  {nativeToken && (
                    <button
                      type="button"
                      onClick={() => setSelectedToken('ETH')}
                      className={`w-full flex items-center justify-between p-3 rounded-lg transition-all ${
                        selectedToken === 'ETH'
                          ? 'bg-cyan-500/30 border-2 border-cyan-400'
                          : 'bg-white/5 border border-white/10 hover:bg-white/10'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        {nativeToken.logoUrl && (
                          <img src={nativeToken.logoUrl} alt="ETH" className="w-8 h-8 rounded-full" />
                        )}
                        <div className="text-left">
                          <div className="font-medium text-white">{nativeToken.symbol}</div>
                          <div className="text-xs text-gray-400">Native Token</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-white font-medium">{parseFloat(nativeToken.balance).toFixed(4)}</div>
                        {nativeToken.valueUsd && (
                          <div className="text-xs text-gray-400">${nativeToken.valueUsd.toFixed(2)}</div>
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
                      className={`w-full flex items-center justify-between p-3 rounded-lg transition-all ${
                        selectedToken === token.symbol
                          ? 'bg-cyan-500/30 border-2 border-cyan-400'
                          : 'bg-white/5 border border-white/10 hover:bg-white/10'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        {token.logoUrl ? (
                          <img src={token.logoUrl} alt={token.symbol} className="w-8 h-8 rounded-full" />
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-400 to-pink-400 flex items-center justify-center text-white text-xs font-bold">
                            {token.symbol.slice(0, 2)}
                          </div>
                        )}
                        <div className="text-left">
                          <div className="flex items-center gap-1">
                            <span className="font-medium text-white">{token.symbol}</span>
                            {token.isVerified && (
                              <span className="text-cyan-400 text-xs">✓</span>
                            )}
                          </div>
                          <div className="text-xs text-gray-400 truncate max-w-[120px]">{token.name}</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-white font-medium">{parseFloat(token.balance).toFixed(4)}</div>
                        {token.valueUsd && (
                          <div className="text-xs text-gray-400">${token.valueUsd.toFixed(2)}</div>
                        )}
                      </div>
                    </button>
                  ))}

                  {!nativeToken && tokens.length === 0 && (
                    <div className="text-center py-4 text-gray-400">
                      No tokens available
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-white mb-2">Amount</label>
              <div className="relative">
                <input
                  type="number"
                  step="0.001"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.01"
                  className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                />
                <div className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">
                  {selectedToken}
                </div>
              </div>
              {selectedToken && (
                <div className="mt-1 text-xs text-gray-400">
                  Available: {
                    selectedToken === 'ETH'
                      ? parseFloat(nativeToken?.balance || '0').toFixed(6)
                      : parseFloat(tokens.find(t => t.symbol === selectedToken)?.balance || '0').toFixed(6)
                  } {selectedToken}
                </div>
              )}
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-white mb-2">Message (Optional)</label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Great post! 🐧"
                rows={3}
                className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-cyan-500 resize-none"
              />
            </div>

            {recipientData && (
              <div className="mb-4 p-3 bg-blue-500/20 border border-blue-500/30 rounded-xl">
                <p className="text-blue-200 text-sm">
                  <span className="font-medium">Sending to:</span> {recipientData.displayName} (@{recipientData.username})
                </p>
              </div>
            )}

            {status && (
              <div className="mb-4 p-3 bg-purple-500/20 border border-purple-500/30 rounded-xl">
                <p className="text-purple-200 text-sm">{status}</p>
              </div>
            )}

            <div className="flex space-x-3">
              <button
                onClick={() => setShowModal(false)}
                disabled={isSending}
                className="flex-1 bg-gray-500/20 text-gray-300 py-3 rounded-xl hover:bg-gray-500/30 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSendTip}
                disabled={!amount || isSending || !recipientData || (!nativeToken && tokens.length === 0) || loadingTokens}
                className="flex-1 bg-gradient-to-r from-yellow-500 to-orange-500 text-white py-3 rounded-xl hover:from-yellow-600 hover:to-orange-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSending ? 'Sending...' : loadingTokens ? 'Loading...' : 'Send Tip'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}