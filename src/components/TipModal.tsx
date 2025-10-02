'use client'

import { useState, useEffect } from 'react'
import { useAbstractClient } from '@abstract-foundation/agw-react'

interface TipModalProps {
  isOpen: boolean
  onClose: () => void
}

export default function TipModal({ isOpen, onClose }: TipModalProps) {
  const { data: client } = useAbstractClient()
  const [recipientAddress, setRecipientAddress] = useState('')
  const [amount, setAmount] = useState('')
  const [message, setMessage] = useState('')
  const [selectedToken, setSelectedToken] = useState('ETH')
  const [tokens, setTokens] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [status, setStatus] = useState('')

  useEffect(() => {
    if (isOpen) {
      fetchTokens()
    }
  }, [isOpen])

  const fetchTokens = async () => {
    try {
      const response = await fetch('/api/tokens')
      const data = await response.json()
      if (response.ok) {
        setTokens(data.tokens)
      }
    } catch (error) {
      console.error('Failed to fetch tokens:', error)
    }
  }

  if (!isOpen) return null

  const handleSendTip = async () => {
    if (!client || !recipientAddress || !amount) {
      setStatus('Please fill in all required fields!')
      return
    }

    setLoading(true)
    setStatus('Preparing tip transaction...')

    try {
      // First check if recipient exists or create fake profile
      const checkResponse = await fetch('/api/tips/check-recipient', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recipientAddress })
      })

      const recipientData = await checkResponse.json()

      if (!checkResponse.ok) {
        setStatus('Invalid recipient address or user not found!')
        setLoading(false)
        return
      }

      setStatus('Initiating AGW transaction...')

      const selectedTokenData = tokens.find(t => t.symbol === selectedToken)

      console.log('AGW Transaction Details:', {
        from: client.account.address,
        to: recipientAddress,
        amount: `${amount} ${selectedToken}`,
        token: selectedTokenData,
        message
      })

      // REAL AGW transaction - this will prompt for signature
      setStatus('🔐 Please sign the transaction in your wallet...')

      let txHash: string

      if (selectedToken === 'ETH') {
        // Native ETH transaction
        txHash = await client.sendTransaction({
          to: recipientAddress as `0x${string}`,
          value: BigInt(Math.floor(parseFloat(amount) * Math.pow(10, selectedTokenData?.decimals || 18)))
        })
      } else {
        // ERC-20 token transaction - call the token contract
        const tokenAmount = BigInt(Math.floor(parseFloat(amount) * Math.pow(10, selectedTokenData?.decimals || 18)))

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
          args: [recipientAddress as `0x${string}`, tokenAmount]
        })
      }

      setStatus('⛓️ Transaction submitted! Waiting for confirmation...')
      console.log('Transaction hash:', txHash)

      // Log the tip attempt
      const tipResponse = await fetch('/api/tips/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fromAddress: client.account.address,
          toAddress: recipientAddress,
          amount,
          tokenSymbol: selectedToken,
          message,
          transactionHash: txHash
        })
      })

      if (tipResponse.ok) {
        setStatus(`🎉 Tip sent successfully to ${recipientData.user.displayName}!`)
        setTimeout(() => {
          onClose()
          setStatus('')
          setRecipientAddress('')
          setAmount('')
          setMessage('')
        }, 3000)
      } else {
        setStatus('Failed to record tip. Please try again.')
      }

    } catch (error) {
      console.error('Tip failed:', error)
      setStatus('Transaction failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white/10 backdrop-blur-lg rounded-2xl border border-white/20 p-8 max-w-md w-full">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-white flex items-center">
            <img src="https://gmgnrepeat.com/icons/penguintip1.png" alt="Send Tip" className="w-8 h-8 mr-3" />
            Send Tip
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white text-2xl"
          >
            ×
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-white mb-2">
              Recipient Wallet Address
            </label>
            <input
              type="text"
              value={recipientAddress}
              onChange={(e) => setRecipientAddress(e.target.value)}
              placeholder="0x1234...abcd"
              className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-cyan-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-white mb-2">
                Amount
              </label>
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
              <label className="block text-sm font-medium text-white mb-2">
                Token
              </label>
              <select
                value={selectedToken}
                onChange={(e) => setSelectedToken(e.target.value)}
                className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
              >
                {tokens.map((token) => (
                  <option key={token.symbol} value={token.symbol} className="bg-gray-800">
                    {token.logoUrl} {token.symbol}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-white mb-2">
              Message (Optional)
            </label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Great post! 🎉"
              rows={3}
              className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-cyan-500 resize-none"
            />
          </div>

          {status && (
            <div className="bg-blue-500/20 border border-blue-500/30 rounded-xl p-3">
              <p className="text-blue-200 text-sm">{status}</p>
            </div>
          )}

          <div className="flex space-x-3">
            <button
              onClick={onClose}
              disabled={loading}
              className="flex-1 bg-gray-500/20 text-gray-300 py-3 rounded-xl hover:bg-gray-500/30 transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={handleSendTip}
              disabled={loading || !recipientAddress || !amount}
              className="flex-1 bg-gradient-to-r from-green-500 to-emerald-500 text-white py-3 rounded-xl hover:from-green-600 hover:to-emerald-600 transition-all disabled:opacity-50"
            >
              {loading ? 'Sending...' : 'Send Tip'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}