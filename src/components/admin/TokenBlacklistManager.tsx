'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/providers/AuthProvider'

interface BlacklistedToken {
  id: string
  tokenAddress: string
  symbol?: string
  name?: string
  reason: string
  reportCount: number
  blacklistedAt: string
}

interface TokenReport {
  tokenAddress: string
  symbol?: string
  name?: string
  reportCount: number
  reports: any[]
  latestReason: string
  status: string
}

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
}

interface TokenBlacklistManagerProps {
  initialTab?: 'reports' | 'blacklist'
}

export default function TokenBlacklistManager({ initialTab = 'reports' }: TokenBlacklistManagerProps) {
  const { user } = useAuth()
  const [blacklistedTokens, setBlacklistedTokens] = useState<BlacklistedToken[]>([])
  const [reports, setReports] = useState<TokenReport[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<'reports' | 'blacklist'>(initialTab)
  const [showBlacklistModal, setShowBlacklistModal] = useState(false)
  const [selectedReport, setSelectedReport] = useState<TokenReport | null>(null)

  useEffect(() => {
    fetchBlacklistedTokens()
    fetchReports()
  }, [])

  const fetchBlacklistedTokens = async () => {
    try {
      const response = await fetch('/api/admin/tokens/blacklist')
      if (response.ok) {
        const data = await response.json()
        setBlacklistedTokens(data)
      }
    } catch (error) {
      console.error('Error fetching blacklisted tokens:', error)
    }
  }

  const fetchReports = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/admin/tokens/reports?status=PENDING')
      if (response.ok) {
        const data = await response.json()
        setReports(data)
      }
    } catch (error) {
      console.error('Error fetching reports:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleBlacklistToken = async (report: TokenReport) => {
    setSelectedReport(report)
    setShowBlacklistModal(true)
  }

  const confirmBlacklist = async () => {
    if (!selectedReport) return

    try {
      const response = await fetch('/api/admin/tokens/blacklist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tokenAddress: selectedReport.tokenAddress,
          symbol: selectedReport.symbol,
          name: selectedReport.name,
          reason: selectedReport.latestReason,
          userId: user?.id
        })
      })

      if (response.ok) {
        // Refresh both lists
        fetchBlacklistedTokens()
        fetchReports()
        setShowBlacklistModal(false)
        setSelectedReport(null)
      }
    } catch (error) {
      console.error('Error blacklisting token:', error)
    }
  }

  const handleDismissReport = async (tokenAddress: string) => {
    try {
      const response = await fetch('/api/admin/tokens/reports', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tokenAddress,
          status: 'DISMISSED',
          userId: user?.id
        })
      })

      if (response.ok) {
        fetchReports()
      }
    } catch (error) {
      console.error('Error dismissing report:', error)
    }
  }

  const handleRemoveFromBlacklist = async (tokenAddress: string) => {
    if (!confirm('Remove this token from the blacklist?')) return

    try {
      const response = await fetch(`/api/admin/tokens/blacklist?address=${tokenAddress}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        fetchBlacklistedTokens()
      }
    } catch (error) {
      console.error('Error removing from blacklist:', error)
    }
  }

  return (
    <div className="bg-black/20 backdrop-blur-lg rounded-2xl border border-white/20 p-6">
      <h2 className="text-xl font-semibold text-white mb-6">Token Reports & Blacklist</h2>

      {/* Tabs */}
      <div className="flex gap-4 mb-6 border-b border-white/10">
        <button
          onClick={() => setTab('reports')}
          className={`px-4 py-2 border-b-2 transition-colors ${
            tab === 'reports'
              ? 'border-cyan-400 text-cyan-400'
              : 'border-transparent text-gray-400 hover:text-white'
          }`}
        >
          Pending Reports ({reports.length})
        </button>
        <button
          onClick={() => setTab('blacklist')}
          className={`px-4 py-2 border-b-2 transition-colors ${
            tab === 'blacklist'
              ? 'border-cyan-400 text-cyan-400'
              : 'border-transparent text-gray-400 hover:text-white'
          }`}
        >
          Blacklisted Tokens ({blacklistedTokens.length})
        </button>
      </div>

      {/* Reports Tab */}
      {tab === 'reports' && (
        <div className="space-y-4">
          {loading ? (
            <div className="text-center py-8">
              <div className="w-8 h-8 border-4 border-cyan-400 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-gray-400">Loading reports...</p>
            </div>
          ) : reports.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              No pending reports
            </div>
          ) : (
            reports.map((report) => (
              <div key={report.tokenAddress} className="bg-black/30 rounded-xl p-4 border border-white/10">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <div className="text-white font-semibold">{report.symbol || 'Unknown'}</div>
                    {report.name && <div className="text-sm text-gray-400">{report.name}</div>}
                    <div className="text-xs text-gray-500 font-mono mt-1">{report.tokenAddress}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="px-3 py-1 bg-red-500/20 text-red-300 rounded-full text-sm">
                      {report.reportCount} {report.reportCount === 1 ? 'report' : 'reports'}
                    </span>
                  </div>
                </div>

                <div className="mb-3">
                  <div className="text-sm text-gray-300">
                    <strong>Latest Reason:</strong> {report.latestReason}
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => handleBlacklistToken(report)}
                    className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded"
                  >
                    Blacklist Token
                  </button>
                  <button
                    onClick={() => handleDismissReport(report.tokenAddress)}
                    className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded"
                  >
                    Dismiss
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Blacklist Tab */}
      {tab === 'blacklist' && (
        <div className="space-y-4">
          {blacklistedTokens.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              No blacklisted tokens
            </div>
          ) : (
            blacklistedTokens.map((token) => (
              <div key={token.id} className="bg-black/30 rounded-xl p-4 border border-red-500/30">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <div className="text-white font-semibold">{token.symbol || 'Unknown'}</div>
                    {token.name && <div className="text-sm text-gray-400">{token.name}</div>}
                    <div className="text-xs text-gray-500 font-mono mt-1">{token.tokenAddress}</div>
                  </div>
                  <div className="text-xs text-gray-400">
                    {new Date(token.blacklistedAt).toLocaleDateString()}
                  </div>
                </div>

                <div className="mb-3">
                  <div className="text-sm text-gray-300">
                    <strong>Reason:</strong> {token.reason}
                  </div>
                </div>

                <button
                  onClick={() => handleRemoveFromBlacklist(token.tokenAddress)}
                  className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded text-sm"
                >
                  Remove from Blacklist
                </button>
              </div>
            ))
          )}
        </div>
      )}

      {/* Blacklist Confirmation Modal */}
      {showBlacklistModal && selectedReport && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-xl p-6 max-w-md w-full border border-white/10">
            <h3 className="text-lg font-semibold text-white mb-4">Confirm Blacklist</h3>

            <div className="mb-4 p-3 bg-black/20 rounded">
              <div className="text-white font-medium">{selectedReport.symbol}</div>
              {selectedReport.name && (
                <div className="text-xs text-gray-400">{selectedReport.name}</div>
              )}
              <div className="text-xs text-gray-500 mt-1 break-all">{selectedReport.tokenAddress}</div>
            </div>

            <div className="mb-4">
              <div className="text-sm text-gray-300">
                This token has <strong>{selectedReport.reportCount}</strong> reports.
              </div>
              <div className="text-sm text-gray-300 mt-2">
                <strong>Reason:</strong> {selectedReport.latestReason}
              </div>
            </div>

            <div className="text-xs text-yellow-400 mb-4">
              ⚠️ Blacklisting will hide this token from all users' wallets and mark all reports as reviewed.
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowBlacklistModal(false)
                  setSelectedReport(null)
                }}
                className="flex-1 px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded text-white"
              >
                Cancel
              </button>
              <button
                onClick={confirmBlacklist}
                className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 rounded text-white"
              >
                Confirm Blacklist
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
