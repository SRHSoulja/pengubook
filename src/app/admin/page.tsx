'use client'

import { useState } from 'react'
import TokenManager from '@/components/admin/TokenManager'
import UserManager from '@/components/admin/UserManager'
import Navbar from '@/components/Navbar'

export default function AdminPage() {
  const [viewMode, setViewMode] = useState<'admin' | 'normal'>('admin')

  if (viewMode === 'normal') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-900 via-purple-900 to-indigo-900">
        <Navbar />
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-4xl mx-auto">
            <div className="bg-orange-500/20 border border-orange-500/30 rounded-xl p-4 mb-6 flex items-center justify-between">
              <div className="flex items-center text-orange-300">
                <span className="text-2xl mr-3">👑</span>
                <span>You're viewing as a normal user</span>
              </div>
              <button
                onClick={() => setViewMode('admin')}
                className="bg-orange-500 text-white px-4 py-2 rounded-xl hover:bg-orange-600 transition-colors"
              >
                Back to Admin View
              </button>
            </div>

            <div className="text-center text-white">
              <div className="text-6xl mb-4">🐧</div>
              <h1 className="text-3xl font-bold mb-4">Normal User View</h1>
              <p className="text-gray-300 mb-6">
                This is what regular users see when they try to access /admin
              </p>
              <a
                href="/dashboard"
                className="inline-block bg-cyan-500 text-white px-6 py-3 rounded-xl hover:bg-cyan-600 transition-colors"
              >
                Go to Dashboard
              </a>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        <header className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">PenguBook Admin</h1>
              <p className="text-gray-600">Manage tokens, users, and platform settings</p>
            </div>
            <div className="flex items-center gap-4">
              <button
                onClick={() => setViewMode('normal')}
                className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition-colors flex items-center"
              >
                <span className="mr-2">👤</span>
                View as Normal User
              </button>
              <a
                href="/dashboard"
                className="bg-gray-500 text-white px-4 py-2 rounded-lg hover:bg-gray-600 transition-colors"
              >
                Back to App
              </a>
            </div>
          </div>
        </header>

        <div className="grid gap-8">
          <UserManager />
          <TokenManager />
        </div>
      </div>
    </div>
  )
}