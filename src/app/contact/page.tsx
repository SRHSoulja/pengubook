'use client'

import { useState } from 'react'
import { useAuth } from '@/providers/AuthProvider'
import { useToast } from '@/components/ui/Toast'
import Navbar from '@/components/Navbar'
import Link from 'next/link'

export default function ContactPage() {
  const { user } = useAuth()
  const { addToast } = useToast()
  const [formData, setFormData] = useState({
    name: user?.displayName || '',
    email: '',
    subject: '',
    message: '',
    type: 'bug'
  })
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)

    try {
      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(user?.id && { 'x-user-id': user.id })
        },
        body: JSON.stringify({
          ...formData,
          userId: user?.id
        })
      })

      if (response.ok) {
        setSubmitted(true)
        setFormData({
          name: user?.displayName || '',
          email: '',
          subject: '',
          message: '',
          type: 'bug'
        })
      } else {
        addToast('Failed to send message. Please try again.', 'error')
      }
    } catch (error) {
      console.error('Contact form error:', error)
      addToast('Failed to send message. Please try again.', 'error')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-purple-900 to-indigo-900">
      <Navbar />

      <div className="container mx-auto px-4 py-12">
        <div className="max-w-3xl mx-auto">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-white mb-4 flex items-center justify-center gap-3">
              <span>📬</span>
              Contact Support
            </h1>
            <p className="text-xl text-gray-300">
              Get in touch with the PeBloq team
            </p>
          </div>

          {submitted ? (
            <div className="bg-green-500/20 border border-green-500/30 rounded-2xl p-8 text-center">
              <div className="text-6xl mb-4">✅</div>
              <h2 className="text-2xl font-bold text-white mb-3">Message Sent!</h2>
              <p className="text-gray-200 mb-6">
                Thank you for contacting us. We'll get back to you as soon as possible.
              </p>
              <button
                onClick={() => setSubmitted(false)}
                className="bg-white/20 text-white px-6 py-3 rounded-xl hover:bg-white/30 transition-colors"
              >
                Send Another Message
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="bg-white/10 backdrop-blur-lg rounded-2xl border border-white/20 p-8">
              {/* Message Type */}
              <div className="mb-6">
                <label className="block text-white font-medium mb-3">What can we help with?</label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {[
                    { value: 'bug', label: '🐛 Bug Report', color: 'red' },
                    { value: 'feature', label: '💡 Feature Request', color: 'blue' },
                    { value: 'support', label: '❓ Support', color: 'purple' },
                    { value: 'other', label: '📝 Other', color: 'gray' }
                  ].map((type) => (
                    <button
                      key={type.value}
                      type="button"
                      onClick={() => setFormData({ ...formData, type: type.value })}
                      className={`p-3 rounded-xl border-2 transition-all text-sm font-medium ${
                        formData.type === type.value
                          ? `border-${type.color}-500 bg-${type.color}-500/20 text-white`
                          : 'border-white/20 bg-white/5 text-gray-300 hover:bg-white/10'
                      }`}
                    >
                      {type.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Name */}
              <div className="mb-6">
                <label className="block text-white font-medium mb-2">Name</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:border-cyan-500"
                  placeholder="Your name"
                  required
                />
              </div>

              {/* Email */}
              <div className="mb-6">
                <label className="block text-white font-medium mb-2">Email</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:border-cyan-500"
                  placeholder="your@email.com"
                  required
                />
              </div>

              {/* Subject */}
              <div className="mb-6">
                <label className="block text-white font-medium mb-2">Subject</label>
                <input
                  type="text"
                  value={formData.subject}
                  onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                  className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:border-cyan-500"
                  placeholder="Brief description of your inquiry"
                  required
                />
              </div>

              {/* Message */}
              <div className="mb-6">
                <label className="block text-white font-medium mb-2">Message</label>
                <textarea
                  value={formData.message}
                  onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                  className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:border-cyan-500 min-h-[150px]"
                  placeholder="Please provide as much detail as possible..."
                  required
                />
              </div>

              {/* User Info */}
              {user && (
                <div className="mb-6 p-4 bg-blue-500/10 border border-blue-500/20 rounded-xl">
                  <p className="text-blue-300 text-sm">
                    <span className="font-medium">Logged in as:</span> {user.displayName} (@{user.username})
                  </p>
                </div>
              )}

              {/* Submit */}
              <div className="flex gap-4">
                <Link
                  href="/"
                  className="flex-1 bg-white/10 text-white px-6 py-3 rounded-xl hover:bg-white/20 transition-colors text-center font-medium"
                >
                  Cancel
                </Link>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 bg-gradient-to-r from-cyan-500 to-blue-500 text-white px-6 py-3 rounded-xl hover:from-cyan-600 hover:to-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
                >
                  {submitting ? 'Sending...' : 'Send Message'}
                </button>
              </div>
            </form>
          )}

          {/* Alternative Contact Methods */}
          <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-white/10 backdrop-blur-lg rounded-xl border border-white/20 p-6 text-center">
              <div className="text-3xl mb-3">💙</div>
              <h3 className="text-white font-semibold mb-2">Need Help Now?</h3>
              <p className="text-gray-300 text-sm mb-4">
                If you're experiencing a mental health crisis
              </p>
              <a
                href="https://988lifeline.org"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition-colors text-sm font-medium"
              >
                988 Lifeline
              </a>
            </div>

            <div className="bg-white/10 backdrop-blur-lg rounded-xl border border-white/20 p-6 text-center">
              <div className="text-3xl mb-3">💰</div>
              <h3 className="text-white font-semibold mb-2">Support PeBloq</h3>
              <p className="text-gray-300 text-sm mb-4">
                Help us keep the platform running
              </p>
              <Link
                href="/tip-platform"
                className="inline-block bg-gradient-to-r from-yellow-500 to-orange-500 text-white px-4 py-2 rounded-lg hover:from-yellow-600 hover:to-orange-600 transition-colors text-sm font-medium"
              >
                Tip the Platform
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
