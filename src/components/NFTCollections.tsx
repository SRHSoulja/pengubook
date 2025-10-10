'use client'

import React, { useState, useEffect } from 'react'
import { useAuth } from '@/providers/AuthProvider'
import NFTMediaDisplay from './NFTMediaDisplay'

interface NFTCollectionsProps {
  walletAddress: string
  userId?: string
  isOwnProfile?: boolean
}

interface NFT {
  contractAddress: string
  tokenId: string
  tokenType: 'ERC721' | 'ERC1155'
  name?: string
  symbol?: string
  imageUrl?: string
  animationUrl?: string
  mediaType?: 'image' | 'video' | 'audio' | 'model' | 'html'
  metadata?: any
  collectionName?: string
  isHidden?: boolean
}

interface NFTCollection {
  contractAddress: string
  name?: string
  symbol?: string
  tokenType: 'ERC721' | 'ERC1155'
  nfts: NFT[]
  totalCount: number
  isBlacklisted: boolean
  isVerified: boolean
  isCollapsed?: boolean
}

const NFTCollections = React.memo(function NFTCollections({
  walletAddress,
  userId,
  isOwnProfile = false
}: NFTCollectionsProps) {
  const { user } = useAuth()
  const [collections, setCollections] = useState<NFTCollection[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showReportModal, setShowReportModal] = useState(false)
  const [selectedCollection, setSelectedCollection] = useState<NFTCollection | null>(null)
  const [reportReason, setReportReason] = useState('SCAM')
  const [reportDescription, setReportDescription] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [showHiddenNFTs, setShowHiddenNFTs] = useState(false)
  const [hiddenNFTs, setHiddenNFTs] = useState<any[]>([])
  const [loadingHidden, setLoadingHidden] = useState(false)
  const [selectedForUnhide, setSelectedForUnhide] = useState<Set<string>>(new Set())
  const [clickPosition, setClickPosition] = useState<{ x: number; y: number } | null>(null)
  const [collapsedCollections, setCollapsedCollections] = useState<Set<string>>(new Set())

  // Load collapsed state from localStorage
  useEffect(() => {
    if (user?.id) {
      const stored = localStorage.getItem(`collapsed-nfts-${user.id}`)
      if (stored) {
        setCollapsedCollections(new Set(JSON.parse(stored)))
      }
    }
  }, [user?.id])

  useEffect(() => {
    let cancelled = false
    const controller = new AbortController()

    const fetchNFTs = async () => {
      try {
        setLoading(true)
        setError(null)

        const url = userId
          ? `/api/wallet/nfts?address=${walletAddress}&userId=${userId}`
          : `/api/wallet/nfts?address=${walletAddress}`

        const response = await fetch(url, {
          signal: controller.signal
        })

        if (cancelled) return

        const data = await response.json()

        if (response.ok) {
          setCollections(data.collections || [])
        } else {
          setError(data.error || data.message || 'Failed to fetch NFTs')
        }
      } catch (err: any) {
        if (cancelled || err.name === 'AbortError') {
          return
        }
        console.error('Error fetching NFTs:', err)
        setError('Failed to load NFT collections')
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    fetchNFTs()

    return () => {
      cancelled = true
      controller.abort()
    }
  }, [walletAddress, userId])

  const toggleCollapse = (contractAddress: string) => {
    const newCollapsed = new Set(collapsedCollections)
    if (newCollapsed.has(contractAddress)) {
      newCollapsed.delete(contractAddress)
    } else {
      newCollapsed.add(contractAddress)
    }
    setCollapsedCollections(newCollapsed)

    // Save to localStorage
    if (user?.id) {
      localStorage.setItem(`collapsed-nfts-${user.id}`, JSON.stringify(Array.from(newCollapsed)))
    }
  }

  const handleHideNFT = async (contractAddress: string, tokenId?: string) => {
    if (!user?.id) return

    try {
      const response = await fetch('/api/nfts/hidden', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          contractAddress,
          tokenId: tokenId || null
        })
      })

      if (response.ok) {
        // Refresh NFT list
        window.location.reload()
      }
    } catch (error) {
      console.error('Error hiding NFT:', error)
    }
  }

  const handleReportCollection = (collection: NFTCollection, event: React.MouseEvent) => {
    setSelectedCollection(collection)
    const scrollY = window.scrollY || window.pageYOffset
    setClickPosition({ x: event.clientX, y: event.clientY + scrollY })
    setShowReportModal(true)
  }

  const submitReport = async () => {
    if (!selectedCollection || !user?.id) return

    setSubmitting(true)
    try {
      const response = await fetch('/api/nfts/report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          contractAddress: selectedCollection.contractAddress,
          reason: reportReason,
          description: reportDescription
        })
      })

      if (response.ok) {
        const result = await response.json()
        alert(result.message || 'Report submitted successfully')
        setShowReportModal(false)
        setReportDescription('')
      }
    } catch (error) {
      console.error('Error submitting report:', error)
      alert('Failed to submit report')
    } finally {
      setSubmitting(false)
    }
  }

  const loadHiddenNFTs = async () => {
    if (!user?.id) return

    setLoadingHidden(true)
    try {
      const response = await fetch(`/api/nfts/hidden?userId=${user.id}`)
      const data = await response.json()
      setHiddenNFTs(data)
    } catch (error) {
      console.error('Error loading hidden NFTs:', error)
    } finally {
      setLoadingHidden(false)
    }
  }

  const handleUnhideSelected = async () => {
    if (!user?.id || selectedForUnhide.size === 0) return

    try {
      const keys = Array.from(selectedForUnhide)
      for (const key of keys) {
        const [contractAddress, tokenId] = key.split(':')
        await fetch(`/api/nfts/hidden?address=${contractAddress}&tokenId=${tokenId || ''}&userId=${user.id}`, {
          method: 'DELETE'
        })
      }

      setSelectedForUnhide(new Set())
      await loadHiddenNFTs()
      window.location.reload()
    } catch (error) {
      console.error('Error unhiding NFTs:', error)
    }
  }

  if (loading) {
    return (
      <div className="bg-white/10 backdrop-blur-lg rounded-2xl border border-white/20 p-6">
        <div className="flex items-center gap-3 mb-4">
          <span className="text-2xl">🖼️</span>
          <h3 className="text-xl font-bold text-white">NFT Collections</h3>
        </div>
        <div className="text-center py-8 text-gray-400">
          <div className="animate-pulse">Loading NFT collections...</div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-white/10 backdrop-blur-lg rounded-2xl border border-white/20 p-6">
        <div className="flex items-center gap-3 mb-4">
          <span className="text-2xl">🖼️</span>
          <h3 className="text-xl font-bold text-white">NFT Collections</h3>
        </div>
        <div className="text-center py-8">
          <p className="text-red-400">{error}</p>
          <p className="text-gray-400 text-sm mt-2">
            NFT indexing requires integration with Alchemy, Moralis, or The Graph
          </p>
        </div>
      </div>
    )
  }

  return (
    <>
      {/* Report Modal */}
      {showReportModal && selectedCollection && (
        <div
          className="fixed inset-0 bg-black/50 flex items-start justify-center z-50 p-4 overflow-y-auto"
          onClick={() => setShowReportModal(false)}
        >
          <div
            className="bg-gray-800 rounded-xl p-6 max-w-md w-full border border-white/10 my-4"
            style={{
              marginTop: clickPosition ? `${Math.max(clickPosition.y - 50, 20)}px` : '20vh'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-xl font-bold text-white mb-4">Report NFT Collection</h3>
            <p className="text-gray-300 text-sm mb-4">
              Report {selectedCollection.name || selectedCollection.symbol || 'this collection'} as a scam or fraudulent collection
            </p>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Reason</label>
                <select
                  value={reportReason}
                  onChange={(e) => setReportReason(e.target.value)}
                  className="w-full px-4 py-2 bg-black/30 text-white border border-white/20 rounded-lg focus:outline-none focus:border-cyan-400"
                >
                  <option value="SCAM">Scam / Fraudulent</option>
                  <option value="OFFENSIVE">Offensive Content</option>
                  <option value="SPAM">Spam</option>
                  <option value="IMPERSONATION">Impersonation</option>
                  <option value="OTHER">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Additional Details (optional)
                </label>
                <textarea
                  value={reportDescription}
                  onChange={(e) => setReportDescription(e.target.value)}
                  className="w-full px-4 py-2 bg-black/30 text-white placeholder-gray-400 border border-white/20 rounded-lg focus:outline-none focus:border-cyan-400 resize-none"
                  rows={3}
                  placeholder="Provide any additional information..."
                />
              </div>

              <div className="flex gap-3">
                <button
                  onClick={submitReport}
                  disabled={submitting}
                  className="flex-1 bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg font-medium transition-colors disabled:opacity-50"
                >
                  {submitting ? 'Submitting...' : 'Submit Report'}
                </button>
                <button
                  onClick={() => setShowReportModal(false)}
                  disabled={submitting}
                  className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg font-medium transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white/10 backdrop-blur-lg rounded-2xl border border-white/20 p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🖼️</span>
            <h3 className="text-xl font-bold text-white">NFT Collections</h3>
          </div>

          {isOwnProfile && (
            <button
              onClick={() => {
                setShowHiddenNFTs(!showHiddenNFTs)
                if (!showHiddenNFTs) {
                  loadHiddenNFTs()
                }
              }}
              className="text-sm text-cyan-400 hover:text-cyan-300 transition-colors"
            >
              {showHiddenNFTs ? '← Back to Collections' : 'View Hidden NFTs'}
            </button>
          )}
        </div>

        {showHiddenNFTs ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-gray-300">Hidden NFTs ({hiddenNFTs.length})</p>
              {selectedForUnhide.size > 0 && (
                <button
                  onClick={handleUnhideSelected}
                  className="px-4 py-2 bg-cyan-500 hover:bg-cyan-600 text-white rounded-lg font-medium transition-colors"
                >
                  Unhide Selected ({selectedForUnhide.size})
                </button>
              )}
            </div>

            {loadingHidden ? (
              <div className="text-center py-8 text-gray-400">Loading...</div>
            ) : hiddenNFTs.length === 0 ? (
              <div className="text-center py-8 text-gray-400">No hidden NFTs</div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                {hiddenNFTs.map((nft) => {
                  const key = `${nft.contractAddress}:${nft.tokenId || 'collection'}`
                  const isSelected = selectedForUnhide.has(key)

                  return (
                    <div
                      key={key}
                      className={`relative cursor-pointer border-2 rounded-lg overflow-hidden transition-all ${
                        isSelected ? 'border-cyan-500' : 'border-transparent'
                      }`}
                      onClick={() => {
                        const newSelected = new Set(selectedForUnhide)
                        if (isSelected) {
                          newSelected.delete(key)
                        } else {
                          newSelected.add(key)
                        }
                        setSelectedForUnhide(newSelected)
                      }}
                    >
                      <div className="aspect-square bg-gray-800 flex items-center justify-center">
                        <div className="text-center text-gray-500">
                          <div className="text-3xl mb-2">🖼️</div>
                          <p className="text-xs">{nft.collection?.symbol || 'NFT'}</p>
                        </div>
                      </div>
                      {isSelected && (
                        <div className="absolute top-2 right-2">
                          <div className="w-6 h-6 bg-cyan-500 rounded-full flex items-center justify-center">
                            <span className="text-white text-sm">✓</span>
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        ) : collections.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-400 mb-2">No NFT collections found</p>
            <p className="text-gray-500 text-sm">
              NFT indexing requires integration with Alchemy, Moralis, or The Graph
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {collections.map((collection) => {
              const isCollapsed = collapsedCollections.has(collection.contractAddress)

              return (
                <div
                  key={collection.contractAddress}
                  className="bg-black/20 rounded-xl p-4 border border-white/10"
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => toggleCollapse(collection.contractAddress)}
                        className="text-gray-400 hover:text-white transition-colors"
                      >
                        <span className="text-lg">{isCollapsed ? '▶' : '▼'}</span>
                      </button>
                      <div>
                        <h4 className="text-white font-semibold flex items-center gap-2">
                          {collection.name || collection.symbol || 'Unknown Collection'}
                          {collection.isVerified && <span className="text-cyan-400">✓</span>}
                          {collection.isBlacklisted && (
                            <span className="text-red-400 text-xs">(Blacklisted)</span>
                          )}
                        </h4>
                        <p className="text-gray-400 text-sm">
                          {collection.totalCount} NFT{collection.totalCount !== 1 ? 's' : ''}
                        </p>
                      </div>
                    </div>

                    {isOwnProfile && (
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleHideNFT(collection.contractAddress)}
                          className="px-3 py-1 bg-gray-700 hover:bg-gray-600 text-white text-sm rounded-lg transition-colors"
                        >
                          Hide Collection
                        </button>
                        <button
                          onClick={(e) => handleReportCollection(collection, e)}
                          className="px-3 py-1 bg-red-500/20 hover:bg-red-500/30 text-red-400 text-sm rounded-lg transition-colors border border-red-500/30"
                        >
                          Report
                        </button>
                      </div>
                    )}
                  </div>

                  {!isCollapsed && (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 mt-4">
                      {collection.nfts.slice(0, 10).map((nft) => (
                        <div
                          key={`${nft.contractAddress}-${nft.tokenId}`}
                          className="group relative"
                        >
                          <div className="aspect-square rounded-lg overflow-hidden bg-gray-900">
                            <NFTMediaDisplay
                              imageUrl={nft.imageUrl}
                              animationUrl={nft.animationUrl}
                              mediaType={nft.mediaType}
                              name={nft.name}
                              className="w-full h-full"
                            />
                          </div>
                          <div className="mt-2">
                            <p className="text-white text-sm truncate">
                              {nft.name || `#${nft.tokenId}`}
                            </p>
                          </div>
                          {isOwnProfile && (
                            <button
                              onClick={() => handleHideNFT(collection.contractAddress, nft.tokenId)}
                              className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity px-2 py-1 bg-black/80 text-white text-xs rounded"
                            >
                              Hide
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </>
  )
})

export default NFTCollections
