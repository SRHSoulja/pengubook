'use client'

import { useState, useEffect } from 'react'
import { useAbstractClient } from '@abstract-foundation/agw-react'

interface TipButtonProps {
  userId: string
}

interface Token {
  id: string
  symbol: string
  name: string
  contractAddress: string | null
  decimals: number
  logoUrl?: string
  isEnabled: boolean
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
  const [recipientData, setRecipientData] = useState<UserData | null>(null)

  useEffect(() => {
    if (showModal) {
      fetchTokens()
      fetchRecipientData()
    }
  }, [showModal, userId])

  const fetchTokens = async () => {
    try {
      const response = await fetch('/api/tokens')
      const data = await response.json()
      if (response.ok) {
        setTokens(data.tokens.filter((token: Token) => token.isEnabled))
        if (data.tokens.length > 0) {
          setSelectedToken(data.tokens[0].symbol)
        }
      }
    } catch (error) {
      console.error('Failed to fetch tokens:', error)
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
      const selectedTokenData = tokens.find(t => t.symbol === selectedToken)
      if (!selectedTokenData) {
        setStatus('Invalid token selected!')
        setIsSending(false)
        return
      }

      setStatus('🔐 Please sign the transaction in your wallet...')

      let txHash: string

      if (selectedToken === 'ETH' || !selectedTokenData.contractAddress) {
        // Native ETH transaction
        const ethAmount = BigInt(Math.floor(parseFloat(amount) * Math.pow(10, selectedTokenData.decimals)))
        txHash = await client.sendTransaction({
          to: recipientData.walletAddress as `0x${string}`,
          value: ethAmount
        })
      } else {
        // ERC-20 token transaction
        const tokenAmount = BigInt(Math.floor(parseFloat(amount) * Math.pow(10, selectedTokenData.decimals)))

        txHash = await client.writeContract({
          address: selectedTokenData.contractAddress as `0x${string}`,
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

      // Record the tip in the backend
      const tipResponse = await fetch('/api/tips', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-wallet-address': client.account.address
        },
        body: JSON.stringify({
          toUserId: userId,
          tokenId: selectedTokenData.id,
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

            <div className="grid grid-cols-2 gap-3 mb-4">
              <div>
                <label className="block text-sm font-medium text-white mb-2">Amount</label>
                <input
                  type="number"
                  step="0.001"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.01"
                  className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-white mb-2">Token</label>
                <select
                  value={selectedToken}
                  onChange={(e) => setSelectedToken(e.target.value)}
                  className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                >
                  {tokens.map(token => (
                    <option key={token.symbol} value={token.symbol} className="bg-gray-800">
                      {token.symbol} - {token.name}
                    </option>
                  ))}
                </select>
              </div>
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
                disabled={!amount || isSending || !recipientData || tokens.length === 0}
                className="flex-1 bg-gradient-to-r from-yellow-500 to-orange-500 text-white py-3 rounded-xl hover:from-yellow-600 hover:to-orange-600 transition-all disabled:opacity-50"
              >
                {isSending ? 'Sending...' : 'Send Tip'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}