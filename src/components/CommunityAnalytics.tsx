'use client'

import { useState, useEffect } from 'react'

interface AnalyticsData {
  totalMembers: number
  activeMembers: number
  totalPosts: number
  totalComments: number
  totalLikes: number
  growthRate: number
  engagementRate: number
  membershipGrowth: Array<{
    date: string
    members: number
  }>
  topContributors: Array<{
    id: string
    displayName: string
    avatar?: string
    postsCount: number
    commentsCount: number
    likesReceived: number
  }>
}

interface CommunityAnalyticsProps {
  communityId: string
  isOwnerOrAdmin: boolean
}

export default function CommunityAnalytics({ communityId, isOwnerOrAdmin }: CommunityAnalyticsProps) {
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d'>('30d')

  useEffect(() => {
    fetchAnalytics()
  }, [communityId, timeRange])

  const fetchAnalytics = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/communities/${communityId}/analytics?range=${timeRange}`)

      if (response.ok) {
        const data = await response.json()
        setAnalytics(data.data)
      } else {
        console.error('Failed to fetch analytics')
      }
    } catch (error) {
      console.error('Error fetching analytics:', error)
    } finally {
      setLoading(false)
    }
  }

  // Mock data for demonstration
  const mockAnalytics: AnalyticsData = {
    totalMembers: 1247,
    activeMembers: 342,
    totalPosts: 89,
    totalComments: 456,
    totalLikes: 1234,
    growthRate: 12.5,
    engagementRate: 27.4,
    membershipGrowth: [
      { date: '2024-01-01', members: 1200 },
      { date: '2024-01-15', members: 1220 },
      { date: '2024-01-30', members: 1247 }
    ],
    topContributors: [
      {
        id: '1',
        displayName: 'PenguinMaster',
        avatar: undefined,
        postsCount: 15,
        commentsCount: 67,
        likesReceived: 234
      },
      {
        id: '2',
        displayName: 'IcyExplorer',
        avatar: undefined,
        postsCount: 12,
        commentsCount: 45,
        likesReceived: 189
      },
      {
        id: '3',
        displayName: 'ArcticDreamer',
        avatar: undefined,
        postsCount: 8,
        commentsCount: 78,
        likesReceived: 156
      }
    ]
  }

  if (!isOwnerOrAdmin) {
    return (
      <div className="bg-white/10 backdrop-blur-lg rounded-2xl border border-white/20 p-6">
        <div className="text-center text-gray-400">
          <div className="text-4xl mb-4">🔒</div>
          <p>Analytics are only available to community owners and admins</p>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="bg-white/10 backdrop-blur-lg rounded-2xl border border-white/20 p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-gray-700 rounded w-1/4"></div>
          <div className="grid grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-20 bg-gray-700 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  const data = analytics || mockAnalytics

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-white flex items-center gap-2">
          <span>📊</span>
          Community Analytics
        </h2>
        <select
          value={timeRange}
          onChange={(e) => setTimeRange(e.target.value as '7d' | '30d' | '90d')}
          className="px-3 py-2 bg-black/30 text-white border border-white/20 rounded-lg focus:outline-none focus:border-cyan-400"
        >
          <option value="7d">Last 7 days</option>
          <option value="30d">Last 30 days</option>
          <option value="90d">Last 90 days</option>
        </select>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white/10 backdrop-blur-lg rounded-xl border border-white/20 p-6">
          <div className="text-cyan-400 text-sm font-medium">Total Members</div>
          <div className="text-2xl font-bold text-white mt-1">{data.totalMembers.toLocaleString()}</div>
          <div className="text-green-400 text-sm mt-1 flex items-center gap-1">
            ↗️ +{data.growthRate}% growth
          </div>
        </div>

        <div className="bg-white/10 backdrop-blur-lg rounded-xl border border-white/20 p-6">
          <div className="text-purple-400 text-sm font-medium">Active Members</div>
          <div className="text-2xl font-bold text-white mt-1">{data.activeMembers.toLocaleString()}</div>
          <div className="text-gray-400 text-sm mt-1">
            {Math.round((data.activeMembers / data.totalMembers) * 100)}% of total
          </div>
        </div>

        <div className="bg-white/10 backdrop-blur-lg rounded-xl border border-white/20 p-6">
          <div className="text-yellow-400 text-sm font-medium">Total Posts</div>
          <div className="text-2xl font-bold text-white mt-1">{data.totalPosts.toLocaleString()}</div>
          <div className="text-gray-400 text-sm mt-1">
            {data.totalComments.toLocaleString()} comments
          </div>
        </div>

        <div className="bg-white/10 backdrop-blur-lg rounded-xl border border-white/20 p-6">
          <div className="text-pink-400 text-sm font-medium">Engagement Rate</div>
          <div className="text-2xl font-bold text-white mt-1">{data.engagementRate}%</div>
          <div className="text-gray-400 text-sm mt-1">
            {data.totalLikes.toLocaleString()} total likes
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Growth Chart */}
        <div className="bg-white/10 backdrop-blur-lg rounded-xl border border-white/20 p-6">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <span>📈</span>
            Member Growth
          </h3>

          {/* Simple line visualization */}
          <div className="space-y-3">
            {data.membershipGrowth.map((point, index) => (
              <div key={index} className="flex items-center justify-between">
                <span className="text-gray-400 text-sm">
                  {new Date(point.date).toLocaleDateString()}
                </span>
                <div className="flex items-center gap-3">
                  <div className="w-24 bg-gray-700 rounded-full h-2">
                    <div
                      className="bg-gradient-to-r from-cyan-400 to-blue-500 h-2 rounded-full transition-all duration-500"
                      style={{
                        width: `${(point.members / Math.max(...data.membershipGrowth.map(p => p.members))) * 100}%`
                      }}
                    />
                  </div>
                  <span className="text-white font-medium w-16 text-right">
                    {point.members.toLocaleString()}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Top Contributors */}
        <div className="bg-white/10 backdrop-blur-lg rounded-xl border border-white/20 p-6">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <span>🏆</span>
            Top Contributors
          </h3>

          <div className="space-y-4">
            {data.topContributors.map((contributor, index) => (
              <div key={contributor.id} className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-cyan-400 to-blue-500 flex items-center justify-center text-white font-bold text-sm">
                  {contributor.avatar ? (
                    <img
                      src={contributor.avatar}
                      alt={contributor.displayName}
                      className="w-full h-full rounded-full object-cover"
                    />
                  ) : (
                    contributor.displayName.charAt(0)
                  )}
                </div>

                <div className="flex-1">
                  <div className="text-white font-medium">{contributor.displayName}</div>
                  <div className="text-gray-400 text-sm">
                    {contributor.postsCount} posts • {contributor.commentsCount} comments
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-yellow-400 font-medium">{contributor.likesReceived}</div>
                  <div className="text-gray-500 text-xs">likes</div>
                </div>

                <div className="w-6 text-center">
                  {index === 0 && <span className="text-yellow-400">🥇</span>}
                  {index === 1 && <span className="text-gray-300">🥈</span>}
                  {index === 2 && <span className="text-orange-400">🥉</span>}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Activity Insights */}
      <div className="bg-white/10 backdrop-blur-lg rounded-xl border border-white/20 p-6">
        <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <span>💡</span>
          Insights & Recommendations
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg">
            <h4 className="text-blue-300 font-semibold mb-2">📱 Engagement</h4>
            <p className="text-gray-300 text-sm">
              Your community has a {data.engagementRate}% engagement rate, which is{' '}
              {data.engagementRate > 25 ? 'excellent' : data.engagementRate > 15 ? 'good' : 'fair'}.
              {data.engagementRate <= 15 && ' Consider creating more interactive content to boost engagement.'}
            </p>
          </div>

          <div className="p-4 bg-green-500/10 border border-green-500/30 rounded-lg">
            <h4 className="text-green-300 font-semibold mb-2">📊 Growth</h4>
            <p className="text-gray-300 text-sm">
              Your community is growing at {data.growthRate}% rate.
              {data.growthRate > 10 && ' Great momentum! Keep promoting your community.'}
              {data.growthRate <= 10 && ' Consider running member referral campaigns or events.'}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}