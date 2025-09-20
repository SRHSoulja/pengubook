'use client'

import { useState } from 'react'
import { agwProvider } from '@/lib/agw'

interface TipButtonProps {
  userId: string
}

export default function TipButton({ userId }: TipButtonProps) {
  const [showModal, setShowModal] = useState(false)
  const [amount, setAmount] = useState('')
  const [selectedToken, setSelectedToken] = useState('ETH')
  const [isSending, setIsSending] = useState(false)

  const mockTokens = [
    { symbol: 'ETH', name: 'Ethereum', address: null },
    { symbol: 'USDC', name: 'USD Coin', address: '0xa0b86a33e6f4e5b12e49b1e2b8f3b5a2c8d7f9e0' },
    { symbol: 'DAI', name: 'Dai Stablecoin', address: '0x6b175474e89094c44da98b954eedeac495271d0f' }
  ]

  const handleSendTip = async () => {
    if (!amount || !agwProvider.isConnected()) return

    setIsSending(true)
    try {
      const token = mockTokens.find(t => t.symbol === selectedToken)
      const mockRecipientAddress = '0x742d35Cc6634C0532925a3b8d5e8C9e3df4f1234'

      const txHash = await agwProvider.sendTip(
        mockRecipientAddress,
        amount,
        token?.address || undefined
      )

      console.log('Tip sent:', txHash)
      setShowModal(false)
      setAmount('')
    } catch (error) {
      console.error('Failed to send tip:', error)
    } finally {
      setIsSending(false)
    }
  }

  return (
    <>
      <button
        onClick={() => setShowModal(true)}
        className="bg-accent text-white px-4 py-2 rounded hover:bg-yellow-600 transition-colors"
      >
        💰 Tip
      </button>

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-96">
            <h3 className="text-lg font-semibold mb-4">Send Tip</h3>

            <div className="mb-4">
              <label className="block text-sm font-medium mb-2">Token</label>
              <select
                value={selectedToken}
                onChange={(e) => setSelectedToken(e.target.value)}
                className="w-full border rounded px-3 py-2"
              >
                {mockTokens.map(token => (
                  <option key={token.symbol} value={token.symbol}>
                    {token.symbol} - {token.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium mb-2">Amount</label>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                className="w-full border rounded px-3 py-2"
              />
            </div>

            <div className="flex space-x-3">
              <button
                onClick={() => setShowModal(false)}
                className="flex-1 bg-gray-300 text-gray-700 py-2 rounded hover:bg-gray-400"
              >
                Cancel
              </button>
              <button
                onClick={handleSendTip}
                disabled={!amount || isSending}
                className="flex-1 bg-accent text-white py-2 rounded hover:bg-yellow-600 disabled:opacity-50"
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