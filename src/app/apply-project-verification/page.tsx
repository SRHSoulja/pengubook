'use client'

import { useState } from 'react'
import { useAuth } from '@/providers/AuthProvider'
import { useTheme } from '@/providers/ThemeProvider'
import { useRouter } from 'next/navigation'
import Navbar from '@/components/Navbar'
import Link from 'next/link'

export default function ApplyProjectVerificationPage() {
  const { user, isAuthenticated, loading: authLoading } = useAuth()
  const { currentTheme } = useTheme()
  const router = useRouter()

  const [formData, setFormData] = useState({
    projectName: '',
    projectType: '',
    contractAddress: '',
    officialWebsite: '',
    officialTwitter: '',
    officialDiscord: '',
    description: '',
    teamInfo: '',
    proofOfOwnership: ''
  })
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSubmitting(true)

    try {
      const response = await fetch('/api/projects/apply', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': user?.id || '',
          'x-wallet-address': user?.walletAddress || ''
        },
        body: JSON.stringify(formData)
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to submit application')
      }

      setSuccess(true)
      setTimeout(() => {
        router.push('/dashboard')
      }, 3000)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  if (authLoading) {
    return (
      <div style={{ background: `linear-gradient(135deg, ${currentTheme.colors.from}, ${currentTheme.colors.via}, ${currentTheme.colors.to})` }} className="min-h-screen transition-all duration-500">
        <Navbar />
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="w-8 h-8 border-4 border-white border-t-transparent rounded-full animate-spin"></div>
        </div>
      </div>
    )
  }

  if (!authLoading && !isAuthenticated) {
    return (
      <div style={{ background: `linear-gradient(135deg, ${currentTheme.colors.from}, ${currentTheme.colors.via}, ${currentTheme.colors.to})` }} className="min-h-screen transition-all duration-500">
        <Navbar />
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center text-white">
            <div className="text-6xl mb-4">🔒</div>
            <h1 className="text-2xl font-bold mb-4">Authentication Required</h1>
            <p className="text-gray-300 mb-6">Please connect your wallet to apply for project verification</p>
            <Link href="/" className="bg-cyan-500 text-white px-6 py-3 rounded-xl hover:bg-cyan-600 transition-colors">
              Back to Home
            </Link>
          </div>
        </div>
      </div>
    )
  }

  if (success) {
    return (
      <div style={{ background: `linear-gradient(135deg, ${currentTheme.colors.from}, ${currentTheme.colors.via}, ${currentTheme.colors.to})` }} className="min-h-screen transition-all duration-500">
        <Navbar />
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center text-white max-w-md">
            <div className="text-6xl mb-4">✅</div>
            <h1 className="text-2xl font-bold mb-4">Application Submitted!</h1>
            <p className="text-gray-300 mb-6">
              Thank you for applying for project verification. Our team will review your application and get back to you soon.
            </p>
            <p className="text-sm text-gray-400">Redirecting to dashboard...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div style={{ background: `linear-gradient(135deg, ${currentTheme.colors.from}, ${currentTheme.colors.via}, ${currentTheme.colors.to})` }} className="min-h-screen transition-all duration-500">
      <Navbar />

      <div className="container mx-auto px-4 py-8 max-w-3xl">
        <div className="bg-black/20 backdrop-blur-lg rounded-2xl border border-white/20 p-8">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="text-5xl mb-4">🏢</div>
            <h1 className="text-3xl font-bold text-white mb-2">Apply for Project Verification</h1>
            <p className="text-gray-300">
              Get your Abstract token or NFT project officially verified on PeBloq
            </p>
          </div>

          {/* Info Box */}
          <div className="bg-blue-500/20 border border-blue-500/50 rounded-xl p-4 mb-6">
            <h3 className="text-white font-semibold mb-2 flex items-center gap-2">
              <span>ℹ️</span>
              <span>What is Project Verification?</span>
            </h3>
            <ul className="text-sm text-gray-200 space-y-1 ml-6 list-disc">
              <li>Official blue checkmark badge on your profile</li>
              <li>Special project account status with enhanced profile features</li>
              <li>Display official links (website, Twitter, Discord) on your profile</li>
              <li>Featured in our verified projects showcase</li>
              <li>Build trust with the Abstract community</li>
            </ul>
          </div>

          {error && (
            <div className="bg-red-500/20 border border-red-500/50 rounded-xl p-4 mb-6 text-red-200">
              {error}
            </div>
          )}

          {/* Application Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Project Name */}
            <div>
              <label className="block text-white font-semibold mb-2">
                Project Name <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                required
                value={formData.projectName}
                onChange={(e) => setFormData({ ...formData, projectName: e.target.value })}
                placeholder="e.g., PenguCoin, Abstract Penguins NFT"
                className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-3 text-white placeholder-gray-400"
              />
            </div>

            {/* Project Type */}
            <div>
              <label className="block text-white font-semibold mb-2">
                Project Type <span className="text-red-400">*</span>
              </label>
              <select
                required
                value={formData.projectType}
                onChange={(e) => setFormData({ ...formData, projectType: e.target.value })}
                className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-3 text-white"
              >
                <option value="">Select type...</option>
                <option value="token">Token</option>
                <option value="nft">NFT Collection</option>
                <option value="defi">DeFi Protocol</option>
                <option value="game">Game</option>
                <option value="dao">DAO</option>
                <option value="infrastructure">Infrastructure</option>
              </select>
            </div>

            {/* Contract Address */}
            <div>
              <label className="block text-white font-semibold mb-2">
                Contract Address <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                required
                value={formData.contractAddress}
                onChange={(e) => setFormData({ ...formData, contractAddress: e.target.value })}
                placeholder="0x..."
                className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-3 text-white placeholder-gray-400 font-mono text-sm"
              />
              <p className="text-xs text-gray-400 mt-1">
                Your token or NFT contract address on Abstract blockchain
              </p>
            </div>

            {/* Official Website */}
            <div>
              <label className="block text-white font-semibold mb-2">
                Official Website
              </label>
              <input
                type="url"
                value={formData.officialWebsite}
                onChange={(e) => setFormData({ ...formData, officialWebsite: e.target.value })}
                placeholder="https://yourproject.com"
                className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-3 text-white placeholder-gray-400"
              />
            </div>

            {/* Official Twitter */}
            <div>
              <label className="block text-white font-semibold mb-2">
                Official Twitter/X
              </label>
              <input
                type="text"
                value={formData.officialTwitter}
                onChange={(e) => setFormData({ ...formData, officialTwitter: e.target.value })}
                placeholder="@yourproject"
                className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-3 text-white placeholder-gray-400"
              />
            </div>

            {/* Official Discord */}
            <div>
              <label className="block text-white font-semibold mb-2">
                Official Discord
              </label>
              <input
                type="url"
                value={formData.officialDiscord}
                onChange={(e) => setFormData({ ...formData, officialDiscord: e.target.value })}
                placeholder="https://discord.gg/..."
                className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-3 text-white placeholder-gray-400"
              />
            </div>

            {/* Project Description */}
            <div>
              <label className="block text-white font-semibold mb-2">
                Project Description <span className="text-red-400">*</span>
              </label>
              <textarea
                required
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Tell us about your project, its purpose, and goals..."
                rows={5}
                className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-3 text-white placeholder-gray-400 resize-none"
              />
            </div>

            {/* Team Info */}
            <div>
              <label className="block text-white font-semibold mb-2">
                Team Information
              </label>
              <textarea
                value={formData.teamInfo}
                onChange={(e) => setFormData({ ...formData, teamInfo: e.target.value })}
                placeholder="Tell us about your team members, backgrounds, and experience..."
                rows={4}
                className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-3 text-white placeholder-gray-400 resize-none"
              />
            </div>

            {/* Proof of Ownership */}
            <div>
              <label className="block text-white font-semibold mb-2">
                Proof of Ownership <span className="text-red-400">*</span>
              </label>
              <textarea
                required
                value={formData.proofOfOwnership}
                onChange={(e) => setFormData({ ...formData, proofOfOwnership: e.target.value })}
                placeholder="How can you prove you own/represent this project? (e.g., Tweet from official account, signed message from contract deployer, etc.)"
                rows={4}
                className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-3 text-white placeholder-gray-400 resize-none"
              />
              <p className="text-xs text-gray-400 mt-1">
                We need to verify you control this project. Include links to tweets, signed messages, or other proof.
              </p>
            </div>

            {/* Submit Button */}
            <div className="flex gap-4 pt-4">
              <button
                type="submit"
                disabled={submitting}
                className="flex-1 bg-gradient-to-r from-cyan-500 to-blue-500 text-white px-6 py-4 rounded-lg hover:from-cyan-600 hover:to-blue-600 transition-colors font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? 'Submitting...' : 'Submit Application'}
              </button>
              <Link
                href="/dashboard"
                className="bg-gray-500 text-white px-6 py-4 rounded-lg hover:bg-gray-600 transition-colors font-semibold"
              >
                Cancel
              </Link>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
