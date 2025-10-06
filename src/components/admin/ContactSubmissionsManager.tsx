'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/providers/AuthProvider'
import Link from 'next/link'

interface ContactSubmission {
  id: string
  userId: string | null
  name: string
  email: string
  subject: string
  message: string
  type: string
  status: string
  adminNotes: string | null
  createdAt: string
  updatedAt: string
  user: {
    id: string
    username: string | null
    displayName: string | null
    avatar: string | null
  } | null
}

export default function ContactSubmissionsManager() {
  const { user } = useAuth()
  const [submissions, setSubmissions] = useState<ContactSubmission[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<string>('all') // all, pending, reviewed, resolved, closed
  const [typeFilter, setTypeFilter] = useState<string>('all') // all, bug, feature, support, other
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [updatingStatus, setUpdatingStatus] = useState<string | null>(null)
  const [adminNotes, setAdminNotes] = useState<Record<string, string>>({})

  useEffect(() => {
    if (user) {
      fetchSubmissions()
    }
  }, [filter, typeFilter, user])

  const fetchSubmissions = async () => {
    if (!user) return

    try {
      setLoading(true)
      const params = new URLSearchParams()
      if (filter !== 'all') params.append('status', filter.toUpperCase())
      if (typeFilter !== 'all') params.append('type', typeFilter)

      const headers: Record<string, string> = {}
      if (user.walletAddress) headers['x-wallet-address'] = user.walletAddress
      if (user.id) headers['x-user-id'] = user.id

      const response = await fetch(`/api/admin/contact-submissions?${params}`, {
        headers,
        credentials: 'include'
      })
      if (response.ok) {
        const data = await response.json()
        setSubmissions(data.submissions || [])
      } else {
        console.error('Failed to fetch submissions:', response.status)
      }
    } catch (err) {
      console.error('Failed to fetch contact submissions:', err)
    } finally {
      setLoading(false)
    }
  }

  const updateSubmissionStatus = async (id: string, newStatus: string) => {
    if (!user) return

    try {
      setUpdatingStatus(id)
      const headers: Record<string, string> = {
        'Content-Type': 'application/json'
      }
      if (user.walletAddress) headers['x-wallet-address'] = user.walletAddress
      if (user.id) headers['x-user-id'] = user.id

      const response = await fetch(`/api/admin/contact-submissions/${id}`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({
          status: newStatus,
          adminNotes: adminNotes[id] || null
        }),
        credentials: 'include'
      })

      if (response.ok) {
        fetchSubmissions()
      }
    } catch (err) {
      console.error('Failed to update submission:', err)
    } finally {
      setUpdatingStatus(null)
    }
  }

  const filteredSubmissions = submissions

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'pending': return 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30'
      case 'reviewed': return 'bg-blue-500/20 text-blue-300 border-blue-500/30'
      case 'resolved': return 'bg-green-500/20 text-green-300 border-green-500/30'
      case 'closed': return 'bg-gray-500/20 text-gray-300 border-gray-500/30'
      default: return 'bg-gray-500/20 text-gray-300 border-gray-500/30'
    }
  }

  const getTypeIcon = (type: string) => {
    switch (type.toLowerCase()) {
      case 'bug': return '🐛'
      case 'feature': return '💡'
      case 'support': return '🆘'
      default: return '📝'
    }
  }

  return (
    <div className="bg-black/20 backdrop-blur-lg rounded-2xl border border-white/20 p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <span>📬</span>
            <span>Contact Submissions</span>
          </h2>
          <p className="text-gray-300 text-sm mt-1">Manage user contact form submissions</p>
        </div>
        <div className="text-cyan-400 text-2xl font-bold">
          {submissions.length}
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-4 mb-6">
        <div>
          <label className="block text-sm text-gray-300 mb-2">Status</label>
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="bg-white/10 border border-white/20 rounded-lg px-4 py-2 text-white"
          >
            <option value="all">All</option>
            <option value="pending">Pending</option>
            <option value="reviewed">Reviewed</option>
            <option value="resolved">Resolved</option>
            <option value="closed">Closed</option>
          </select>
        </div>

        <div>
          <label className="block text-sm text-gray-300 mb-2">Type</label>
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="bg-white/10 border border-white/20 rounded-lg px-4 py-2 text-white"
          >
            <option value="all">All Types</option>
            <option value="bug">🐛 Bug Reports</option>
            <option value="feature">💡 Feature Requests</option>
            <option value="support">🆘 Support</option>
            <option value="other">📝 Other</option>
          </select>
        </div>
      </div>

      {/* Submissions List */}
      {loading ? (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-cyan-400"></div>
        </div>
      ) : filteredSubmissions.length > 0 ? (
        <div className="space-y-4">
          {filteredSubmissions.map((submission) => (
            <div
              key={submission.id}
              className="bg-white/5 rounded-xl border border-white/10 p-4 hover:bg-white/10 transition-all"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-start gap-3 flex-1">
                  <span className="text-2xl">{getTypeIcon(submission.type)}</span>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-white font-semibold">{submission.subject}</h3>
                      <span className={`text-xs px-2 py-1 rounded border ${getStatusColor(submission.status)}`}>
                        {submission.status}
                      </span>
                      <span className="text-xs text-gray-400">
                        {new Date(submission.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                    <div className="text-sm text-gray-300 mb-2">
                      From: <span className="text-cyan-400">{submission.name}</span> ({submission.email})
                      {submission.user && (
                        <>
                          {' - '}
                          <Link href={`/profile/${submission.user.id}`} className="text-cyan-400 hover:text-cyan-300">
                            @{submission.user.username || submission.user.displayName}
                          </Link>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => setExpandedId(expandedId === submission.id ? null : submission.id)}
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  {expandedId === submission.id ? '▼' : '▶'}
                </button>
              </div>

              {expandedId === submission.id && (
                <div className="mt-4 pt-4 border-t border-white/10">
                  {/* Message */}
                  <div className="bg-white/5 rounded-lg p-4 mb-4">
                    <p className="text-sm font-semibold text-gray-300 mb-2">Message:</p>
                    <p className="text-white whitespace-pre-wrap">{submission.message}</p>
                  </div>

                  {/* Admin Notes */}
                  <div className="mb-4">
                    <label className="block text-sm font-semibold text-gray-300 mb-2">Admin Notes:</label>
                    <textarea
                      value={adminNotes[submission.id] ?? submission.adminNotes ?? ''}
                      onChange={(e) => setAdminNotes({ ...adminNotes, [submission.id]: e.target.value })}
                      className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-2 text-white resize-none"
                      rows={3}
                      placeholder="Add internal notes..."
                    />
                  </div>

                  {/* Status Actions */}
                  <div className="flex flex-wrap gap-2">
                    {['PENDING', 'REVIEWED', 'RESOLVED', 'CLOSED'].map((status) => (
                      <button
                        key={status}
                        onClick={() => updateSubmissionStatus(submission.id, status)}
                        disabled={updatingStatus === submission.id || submission.status === status}
                        className={`px-4 py-2 rounded-lg font-medium transition-all ${
                          submission.status === status
                            ? 'bg-cyan-500 text-white cursor-not-allowed'
                            : 'bg-white/10 text-gray-300 hover:bg-white/20 hover:text-white'
                        }`}
                      >
                        {updatingStatus === submission.id ? 'Updating...' : `Mark as ${status.charAt(0) + status.slice(1).toLowerCase()}`}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-12 text-gray-400">
          <div className="text-6xl mb-4">📭</div>
          <p>No submissions found</p>
        </div>
      )}
    </div>
  )
}
