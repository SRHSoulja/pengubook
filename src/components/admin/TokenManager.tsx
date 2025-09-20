'use client'

import { useState } from 'react'

export default function TokenManager() {
  const [tokens, setTokens] = useState([
    {
      id: '1',
      name: 'Ethereum',
      symbol: 'ETH',
      contractAddress: '0x0000000000000000000000000000000000000000',
      decimals: 18,
      isEnabled: true
    },
    {
      id: '2',
      name: 'USD Coin',
      symbol: 'USDC',
      contractAddress: '0xa0b86a33e6f4e5b12e49b1e2b8f3b5a2c8d7f9e0',
      decimals: 6,
      isEnabled: true
    }
  ])

  const [showAddModal, setShowAddModal] = useState(false)
  const [newToken, setNewToken] = useState({
    name: '',
    symbol: '',
    contractAddress: '',
    decimals: 18
  })

  const handleAddToken = () => {
    const token = {
      id: Date.now().toString(),
      ...newToken,
      isEnabled: true
    }
    setTokens([...tokens, token])
    setNewToken({ name: '', symbol: '', contractAddress: '', decimals: 18 })
    setShowAddModal(false)
  }

  const toggleTokenStatus = (id: string) => {
    setTokens(tokens.map(token =>
      token.id === id ? { ...token, isEnabled: !token.isEnabled } : token
    ))
  }

  const removeToken = (id: string) => {
    setTokens(tokens.filter(token => token.id !== id))
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold">Token Management</h2>
        <button
          onClick={() => setShowAddModal(true)}
          className="bg-primary text-white px-4 py-2 rounded hover:bg-secondary"
        >
          Add Token
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b">
              <th className="text-left py-3">Name</th>
              <th className="text-left py-3">Symbol</th>
              <th className="text-left py-3">Contract Address</th>
              <th className="text-left py-3">Decimals</th>
              <th className="text-left py-3">Status</th>
              <th className="text-left py-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {tokens.map((token) => (
              <tr key={token.id} className="border-b">
                <td className="py-3">{token.name}</td>
                <td className="py-3">{token.symbol}</td>
                <td className="py-3 font-mono text-sm">
                  {token.contractAddress.slice(0, 10)}...{token.contractAddress.slice(-8)}
                </td>
                <td className="py-3">{token.decimals}</td>
                <td className="py-3">
                  <span className={`px-2 py-1 rounded text-sm ${
                    token.isEnabled ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                  }`}>
                    {token.isEnabled ? 'Enabled' : 'Disabled'}
                  </span>
                </td>
                <td className="py-3 space-x-2">
                  <button
                    onClick={() => toggleTokenStatus(token.id)}
                    className={`px-3 py-1 rounded text-sm ${
                      token.isEnabled
                        ? 'bg-red-500 text-white hover:bg-red-600'
                        : 'bg-green-500 text-white hover:bg-green-600'
                    }`}
                  >
                    {token.isEnabled ? 'Disable' : 'Enable'}
                  </button>
                  <button
                    onClick={() => removeToken(token.id)}
                    className="px-3 py-1 bg-gray-500 text-white rounded text-sm hover:bg-gray-600"
                  >
                    Remove
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-96">
            <h3 className="text-lg font-semibold mb-4">Add New Token</h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Token Name</label>
                <input
                  type="text"
                  value={newToken.name}
                  onChange={(e) => setNewToken({...newToken, name: e.target.value})}
                  className="w-full border rounded px-3 py-2"
                  placeholder="e.g., Dai Stablecoin"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Symbol</label>
                <input
                  type="text"
                  value={newToken.symbol}
                  onChange={(e) => setNewToken({...newToken, symbol: e.target.value})}
                  className="w-full border rounded px-3 py-2"
                  placeholder="e.g., DAI"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Contract Address</label>
                <input
                  type="text"
                  value={newToken.contractAddress}
                  onChange={(e) => setNewToken({...newToken, contractAddress: e.target.value})}
                  className="w-full border rounded px-3 py-2"
                  placeholder="0x..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Decimals</label>
                <input
                  type="number"
                  value={newToken.decimals}
                  onChange={(e) => setNewToken({...newToken, decimals: parseInt(e.target.value)})}
                  className="w-full border rounded px-3 py-2"
                />
              </div>
            </div>

            <div className="flex space-x-3 mt-6">
              <button
                onClick={() => setShowAddModal(false)}
                className="flex-1 bg-gray-300 text-gray-700 py-2 rounded hover:bg-gray-400"
              >
                Cancel
              </button>
              <button
                onClick={handleAddToken}
                disabled={!newToken.name || !newToken.symbol || !newToken.contractAddress}
                className="flex-1 bg-primary text-white py-2 rounded hover:bg-secondary disabled:opacity-50"
              >
                Add Token
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}