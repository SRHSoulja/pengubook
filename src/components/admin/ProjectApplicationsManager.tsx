'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

interface ProjectApplication {
  id: string
  userId: string
  projectName: string
  projectType: string
  contractAddress: string
  officialWebsite: string | null
  officialTwitter: string | null
  officialDiscord: string | null
  description: string
  teamInfo: string | null
  proofOfOwnership: string
  status: string
  adminNotes: string | null
  reviewedBy: string | null
  reviewedAt: string | null
  createdAt: string
  updatedAt: string
  user: {
    id: string
    username: string
    displayName: string
    avatar: string | null
    walletAddress: string
  }
}

export default function ProjectApplicationsManager() {
  const [applications, setApplications] = useState<ProjectApplication[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('pending')
  const [selectedApp, setSelectedApp] = useState<ProjectApplication | null>(null)
  const [adminNotes, setAdminNotes] = useState('')
  const [processing, setProcessing] = useState(false)

  useEffect(() => {
    fetchApplications()
  }, [])

  const fetchApplications = async () => {
    try {
      setLoading(true)
      const walletAddress = localStorage.getItem('pebloq-auth')
      const response = await fetch('/api/admin/project-applications', {
        headers: {
          'x-wallet-address': walletAddress || ''
        }
      })
      if (response.ok) {
        const data = await response.json()
        setApplications(data.applications || [])
      }
    } catch (err) {
      console.error('Failed to fetch applications:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleReview = async (applicationId: string, decision: 'APPROVED' | 'REJECTED') => {
    if (!selectedApp) return

    setProcessing(true)
    try {
      const walletAddress = localStorage.getItem('pebloq-auth')
      const response = await fetch(`/api/admin/project-applications/${applicationId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-wallet-address': walletAddress || ''
        },
        body: JSON.stringify({
          status: decision,
          adminNotes
        })
      })

      if (response.ok) {
        await fetchApplications()
        setSelectedApp(null)
        setAdminNotes('')
      }
    } catch (err) {
      console.error('Failed to update application:', err)
    } finally {
      setProcessing(false)
    }
  }

  const filteredApplications = applications.filter(app => {
    if (filter === 'all') return true
    return app.status === filter.toUpperCase()
  })

  const pendingCount = applications.filter(a => a.status === 'PENDING').length
  const approvedCount = applications.filter(a => a.status === 'APPROVED').length
  const rejectedCount = applications.filter(a => a.status === 'REJECTED').length

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PENDING': return 'text-yellow-400 bg-yellow-500/20 border-yellow-500/50'
      case 'APPROVED': return 'text-green-400 bg-green-500/20 border-green-500/50'
      case 'REJECTED': return 'text-red-400 bg-red-500/20 border-red-500/50'
      default: return 'text-gray-400 bg-gray-500/20 border-gray-500/50'
    }
  }

  const getProjectTypeIcon = (type: string) => {
    switch (type) {
      case 'token': return '🪙'
      case 'nft': return '🖼️'
      case 'defi': return '💰'
      case 'game': return '🎮'
      case 'dao': return '🏛️'
      case 'infrastructure': return '🔧'
      default: return '📦'
    }
  }

  return (
    <div className="bg-black/20 backdrop-blur-lg rounded-2xl border border-white/20 p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <span>📋</span>
            <span>Project Verification Applications</span>
          </h2>
          <p className="text-gray-300 text-sm mt-1">Review and approve project verification requests</p>
        </div>
        <div className="text-cyan-400 text-2xl font-bold">
          {applications.length}
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setFilter('all')}
          className={`px-4 py-2 rounded-lg ${filter === 'all' ? 'bg-cyan-500 text-white' : 'bg-white/10 text-gray-300'}`}
        >
          All ({applications.length})
        </button>
        <button
          onClick={() => setFilter('pending')}
          className={`px-4 py-2 rounded-lg ${filter === 'pending' ? 'bg-cyan-500 text-white' : 'bg-white/10 text-gray-300'}`}
        >
          Pending ({pendingCount})
        </button>
        <button
          onClick={() => setFilter('approved')}
          className={`px-4 py-2 rounded-lg ${filter === 'approved' ? 'bg-cyan-500 text-white' : 'bg-white/10 text-gray-300'}`}
        >
          Approved ({approvedCount})
        </button>
        <button
          onClick={() => setFilter('rejected')}
          className={`px-4 py-2 rounded-lg ${filter === 'rejected' ? 'bg-cyan-500 text-white' : 'bg-white/10 text-gray-300'}`}
        >
          Rejected ({rejectedCount})
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Applications List */}
        <div className="space-y-3 max-h-[600px] overflow-y-auto">
          {loading ? (
            <div className="text-center py-12 text-gray-400">Loading...</div>
          ) : filteredApplications.length > 0 ? (
            filteredApplications.map((app) => (
              <div
                key={app.id}
                onClick={() => {
                  setSelectedApp(app)
                  setAdminNotes(app.adminNotes || '')
                }}
                className={`bg-white/5 border rounded-xl p-4 cursor-pointer transition-all ${
                  selectedApp?.id === app.id
                    ? 'border-cyan-400 bg-white/10'
                    : 'border-white/10 hover:bg-white/10'
                }`}
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-2xl">{getProjectTypeIcon(app.projectType)}</span>
                      <h3 className="font-bold text-white">{app.projectName}</h3>
                    </div>
                    <p className="text-sm text-gray-400">
                      Applied by @{app.user.username}
                    </p>
                  </div>
                  <span className={`px-3 py-1 rounded-lg text-xs font-semibold border ${getStatusColor(app.status)}`}>
                    {app.status}
                  </span>
                </div>

                <div className="text-sm text-gray-300 space-y-1">
                  <p><span className="text-gray-400">Type:</span> {app.projectType}</p>
                  <p className="font-mono text-xs truncate"><span className="text-gray-400">Contract:</span> {app.contractAddress}</p>
                  <p className="text-gray-400 text-xs">
                    Applied {new Date(app.createdAt).toLocaleDateString()}
                  </p>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-12 text-gray-400">
              No {filter !== 'all' ? filter : ''} applications found
            </div>
          )}
        </div>

        {/* Application Details */}
        <div>
          {selectedApp ? (
            <div className="bg-white/5 rounded-xl p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold text-white">Application Details</h3>
                <Link
                  href={`/profile/${selectedApp.user.id}`}
                  target="_blank"
                  className="text-cyan-400 hover:text-cyan-300 text-sm"
                >
                  View Applicant →
                </Link>
              </div>

              {/* Project Info */}
              <div className="space-y-3">
                <div>
                  <label className="text-sm text-gray-400">Project Name</label>
                  <p className="text-white font-semibold">{selectedApp.projectName}</p>
                </div>

                <div>
                  <label className="text-sm text-gray-400">Project Type</label>
                  <p className="text-white">{getProjectTypeIcon(selectedApp.projectType)} {selectedApp.projectType}</p>
                </div>

                <div>
                  <label className="text-sm text-gray-400">Contract Address</label>
                  <p className="text-white font-mono text-sm break-all">{selectedApp.contractAddress}</p>
                </div>

                {selectedApp.officialWebsite && (
                  <div>
                    <label className="text-sm text-gray-400">Website</label>
                    <a href={selectedApp.officialWebsite} target="_blank" rel="noopener noreferrer" className="text-cyan-400 hover:underline block">
                      {selectedApp.officialWebsite}
                    </a>
                  </div>
                )}

                {selectedApp.officialTwitter && (
                  <div>
                    <label className="text-sm text-gray-400">Twitter</label>
                    <p className="text-white">{selectedApp.officialTwitter}</p>
                  </div>
                )}

                {selectedApp.officialDiscord && (
                  <div>
                    <label className="text-sm text-gray-400">Discord</label>
                    <a href={selectedApp.officialDiscord} target="_blank" rel="noopener noreferrer" className="text-cyan-400 hover:underline block">
                      {selectedApp.officialDiscord}
                    </a>
                  </div>
                )}

                <div>
                  <label className="text-sm text-gray-400">Description</label>
                  <p className="text-white text-sm bg-black/20 p-3 rounded-lg">{selectedApp.description}</p>
                </div>

                {selectedApp.teamInfo && (
                  <div>
                    <label className="text-sm text-gray-400">Team Information</label>
                    <p className="text-white text-sm bg-black/20 p-3 rounded-lg">{selectedApp.teamInfo}</p>
                  </div>
                )}

                <div>
                  <label className="text-sm text-gray-400">Proof of Ownership</label>
                  <p className="text-white text-sm bg-black/20 p-3 rounded-lg whitespace-pre-wrap">{selectedApp.proofOfOwnership}</p>
                </div>

                {/* Admin Notes */}
                <div>
                  <label className="text-sm text-gray-400 block mb-2">Admin Notes</label>
                  <textarea
                    value={adminNotes}
                    onChange={(e) => setAdminNotes(e.target.value)}
                    placeholder="Add internal notes about this application..."
                    rows={4}
                    className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-3 text-white placeholder-gray-400 resize-none"
                    disabled={selectedApp.status !== 'PENDING'}
                  />
                </div>

                {/* Action Buttons - Only show for pending applications */}
                {selectedApp.status === 'PENDING' && (
                  <div className="flex gap-3 pt-4">
                    <button
                      onClick={() => handleReview(selectedApp.id, 'APPROVED')}
                      disabled={processing}
                      className="flex-1 bg-green-500 text-white px-6 py-3 rounded-lg hover:bg-green-600 transition-colors font-semibold disabled:opacity-50"
                    >
                      ✓ Approve
                    </button>
                    <button
                      onClick={() => handleReview(selectedApp.id, 'REJECTED')}
                      disabled={processing}
                      className="flex-1 bg-red-500 text-white px-6 py-3 rounded-lg hover:bg-red-600 transition-colors font-semibold disabled:opacity-50"
                    >
                      ✗ Reject
                    </button>
                  </div>
                )}

                {/* Show review info for reviewed applications */}
                {selectedApp.status !== 'PENDING' && (
                  <div className="bg-black/20 p-4 rounded-lg">
                    <p className="text-sm text-gray-400">
                      {selectedApp.status === 'APPROVED' ? '✓ Approved' : '✗ Rejected'} on{' '}
                      {selectedApp.reviewedAt && new Date(selectedApp.reviewedAt).toLocaleDateString()}
                    </p>
                    {selectedApp.adminNotes && (
                      <p className="text-sm text-gray-300 mt-2">{selectedApp.adminNotes}</p>
                    )}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="bg-white/5 rounded-xl p-6 text-center text-gray-400">
              <div className="text-6xl mb-4">📋</div>
              <p>Select an application to review</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
