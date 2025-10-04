'use client'

import { useState, useEffect } from 'react'
import { tokenGatingService } from '@/lib/blockchain/tokenGating'

interface TokenGateConfigProps {
  value: {
    isTokenGated: boolean
    tokenGateType: 'ERC20' | 'ERC721' | 'ERC1155' | ''
    tokenContractAddress: string
    tokenMinAmount: string
    tokenIds: string[]
    tokenSymbol: string
    tokenDecimals: number
  }
  onChange: (config: TokenGateConfigProps['value']) => void
}

export default function TokenGateConfig({ value, onChange }: TokenGateConfigProps) {
  const [validatingContract, setValidatingContract] = useState(false)
  const [contractValid, setContractValid] = useState<boolean | null>(null)
  const [validationMessage, setValidationMessage] = useState('')

  const handleToggle = (enabled: boolean) => {
    onChange({
      ...value,
      isTokenGated: enabled,
      tokenGateType: enabled ? value.tokenGateType || 'ERC20' : '',
      tokenContractAddress: enabled ? value.tokenContractAddress : '',
      tokenMinAmount: enabled ? value.tokenMinAmount : '',
      tokenIds: enabled ? value.tokenIds : [],
      tokenSymbol: enabled ? value.tokenSymbol : '',
      tokenDecimals: enabled ? value.tokenDecimals : 18
    })
  }

  const handleTypeChange = (type: 'ERC20' | 'ERC721' | 'ERC1155') => {
    onChange({
      ...value,
      tokenGateType: type,
      tokenMinAmount: type === 'ERC20' ? '1' : type === 'ERC721' ? '1' : '1',
      tokenIds: type === 'ERC721' || type === 'ERC1155' ? [] : [],
      tokenDecimals: type === 'ERC20' ? 18 : 0
    })
    setContractValid(null)
  }

  const handleContractAddressChange = async (address: string) => {
    onChange({
      ...value,
      tokenContractAddress: address,
      tokenSymbol: '',
      tokenDecimals: value.tokenGateType === 'ERC20' ? 18 : 0
    })
    setContractValid(null)

    if (address && value.tokenGateType) {
      await validateContract(address, value.tokenGateType)
    }
  }

  const validateContract = async (address: string, type: 'ERC20' | 'ERC721' | 'ERC1155') => {
    if (!address || address.length !== 42) return

    setValidatingContract(true)
    setValidationMessage('')

    try {
      const isValid = await tokenGatingService.validateContractAddress(address, type)

      if (isValid) {
        const metadata = await tokenGatingService.getTokenMetadata(address, type)
        setContractValid(true)
        setValidationMessage(`Valid ${type} contract: ${metadata.symbol}`)

        onChange({
          ...value,
          tokenContractAddress: address,
          tokenSymbol: metadata.symbol,
          tokenDecimals: metadata.decimals || (type === 'ERC20' ? 18 : 0)
        })
      } else {
        setContractValid(false)
        setValidationMessage(`Invalid ${type} contract address`)
      }
    } catch (error) {
      setContractValid(false)
      setValidationMessage('Error validating contract. Please check the address.')
    } finally {
      setValidatingContract(false)
    }
  }

  const addTokenId = () => {
    onChange({
      ...value,
      tokenIds: [...value.tokenIds, '']
    })
  }

  const removeTokenId = (index: number) => {
    const newTokenIds = value.tokenIds.filter((_, i) => i !== index)
    onChange({
      ...value,
      tokenIds: newTokenIds
    })
  }

  const updateTokenId = (index: number, tokenId: string) => {
    const newTokenIds = [...value.tokenIds]
    newTokenIds[index] = tokenId
    onChange({
      ...value,
      tokenIds: newTokenIds
    })
  }

  return (
    <div className="space-y-4 p-6 bg-black/20 rounded-xl border border-white/10">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-white flex items-center">
          <span className="mr-2">🔐</span>
          Token Gating
        </h3>
        <button
          type="button"
          onClick={() => handleToggle(!value.isTokenGated)}
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
            value.isTokenGated ? 'bg-green-500' : 'bg-gray-500'
          }`}
        >
          <span
            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
              value.isTokenGated ? 'translate-x-6' : 'translate-x-1'
            }`}
          />
        </button>
      </div>

      <p className="text-sm text-gray-300">
        Require users to hold specific tokens to join your community
      </p>

      {value.isTokenGated && (
        <div className="space-y-4">
          {/* Token Type */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Token Standard
            </label>
            <select
              value={value.tokenGateType}
              onChange={(e) => handleTypeChange(e.target.value as 'ERC20' | 'ERC721' | 'ERC1155')}
              className="w-full px-4 py-2 bg-black/30 text-white border border-white/20 rounded-lg focus:outline-none focus:border-cyan-400"
            >
              <option value="ERC20" className="bg-gray-800">ERC20 (Fungible Tokens)</option>
              <option value="ERC721" className="bg-gray-800">ERC721 (NFTs)</option>
              <option value="ERC1155" className="bg-gray-800">ERC1155 (Semi-Fungible)</option>
            </select>
            <p className="text-xs text-gray-500 mt-1">
              {value.tokenGateType === 'ERC20' && 'Standard fungible tokens (like USDC, WETH)'}
              {value.tokenGateType === 'ERC721' && 'Unique NFTs (like CryptoPunks, BAYC)'}
              {value.tokenGateType === 'ERC1155' && 'Semi-fungible tokens (gaming items, etc.)'}
            </p>
          </div>

          {/* Contract Address */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Token Contract Address
            </label>
            <input
              type="text"
              value={value.tokenContractAddress}
              onChange={(e) => handleContractAddressChange(e.target.value)}
              placeholder="0x..."
              className="w-full px-4 py-2 bg-black/30 text-white placeholder-gray-400 border border-white/20 rounded-lg focus:outline-none focus:border-cyan-400"
            />
            {validatingContract && (
              <p className="text-sm text-yellow-400 mt-1 flex items-center">
                <span className="animate-spin mr-2">⏳</span>
                Validating contract...
              </p>
            )}
            {validationMessage && (
              <p className={`text-sm mt-1 ${contractValid ? 'text-green-400' : 'text-red-400'}`}>
                {contractValid ? '✅' : '❌'} {validationMessage}
              </p>
            )}
          </div>

          {/* Minimum Amount (for all types) */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Minimum Amount Required
            </label>
            <input
              type="number"
              step={value.tokenGateType === 'ERC20' ? '0.000001' : '1'}
              min="0"
              value={value.tokenMinAmount}
              onChange={(e) => onChange({ ...value, tokenMinAmount: e.target.value })}
              placeholder={value.tokenGateType === 'ERC20' ? '1.0' : '1'}
              className="w-full px-4 py-2 bg-black/30 text-white placeholder-gray-400 border border-white/20 rounded-lg focus:outline-none focus:border-cyan-400"
            />
            <p className="text-xs text-gray-500 mt-1">
              {value.tokenGateType === 'ERC20' && `Minimum ${value.tokenSymbol || 'tokens'} required`}
              {value.tokenGateType === 'ERC721' && 'Minimum NFTs required from this collection'}
              {value.tokenGateType === 'ERC1155' && 'Minimum tokens required (applies to each token ID)'}
            </p>
          </div>

          {/* Specific Token IDs (for ERC721/ERC1155) */}
          {(value.tokenGateType === 'ERC721' || value.tokenGateType === 'ERC1155') && (
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Specific Token IDs (optional)
              </label>
              <div className="space-y-2">
                {value.tokenIds.map((tokenId, index) => (
                  <div key={index} className="flex gap-2">
                    <input
                      type="text"
                      value={tokenId}
                      onChange={(e) => updateTokenId(index, e.target.value)}
                      placeholder="Token ID (e.g., 1234)"
                      className="flex-1 px-4 py-2 bg-black/30 text-white placeholder-gray-400 border border-white/20 rounded-lg focus:outline-none focus:border-cyan-400"
                    />
                    <button
                      type="button"
                      onClick={() => removeTokenId(index)}
                      className="px-3 py-2 bg-red-500/20 text-red-400 border border-red-500/30 rounded-lg hover:bg-red-500/30 transition-colors"
                      aria-label="Remove token ID"
                    >
                      ✕
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={addTokenId}
                  className="w-full px-4 py-2 bg-blue-500/20 text-blue-400 border border-blue-500/30 rounded-lg hover:bg-blue-500/30 transition-colors"
                >
                  + Add Token ID
                </button>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Leave empty to accept any token from this collection. Add specific IDs to restrict to certain tokens.
              </p>
            </div>
          )}

          {/* ERC20 Decimals */}
          {value.tokenGateType === 'ERC20' && (
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Token Decimals
              </label>
              <input
                type="number"
                min="0"
                max="18"
                value={value.tokenDecimals}
                onChange={(e) => onChange({ ...value, tokenDecimals: parseInt(e.target.value) || 18 })}
                className="w-full px-4 py-2 bg-black/30 text-white border border-white/20 rounded-lg focus:outline-none focus:border-cyan-400"
              />
              <p className="text-xs text-gray-500 mt-1">
                Usually 18 for most ERC20 tokens. Will be auto-detected if contract is valid.
              </p>
            </div>
          )}

          {/* Preview */}
          {value.tokenSymbol && (
            <div className="p-4 bg-green-500/10 border border-green-500/30 rounded-lg">
              <h4 className="text-sm font-semibold text-green-400 mb-2">Token Gate Preview:</h4>
              <p className="text-sm text-gray-300">
                Users must hold{' '}
                {value.tokenGateType === 'ERC20' && `at least ${value.tokenMinAmount} ${value.tokenSymbol}`}
                {value.tokenGateType === 'ERC721' && value.tokenIds.length > 0
                  ? `one of the specified NFTs from ${value.tokenSymbol}`
                  : value.tokenGateType === 'ERC721' && `at least ${value.tokenMinAmount} NFT(s) from ${value.tokenSymbol}`}
                {value.tokenGateType === 'ERC1155' && value.tokenIds.length > 0
                  ? `at least ${value.tokenMinAmount} of the specified ${value.tokenSymbol} tokens`
                  : value.tokenGateType === 'ERC1155' && `${value.tokenSymbol} tokens`}
                {' '}to join this community.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}