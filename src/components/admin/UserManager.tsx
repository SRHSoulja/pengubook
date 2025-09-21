'use client'

import { useState, useEffect } from 'react'

interface User {
  id: string
  username: string
  displayName: string
  walletAddress: string
  isBanned: boolean
  createdAt: string
}

export default function UserManager() {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchUsers()
  }, [])

  const fetchUsers = async () => {
    try {
      const response = await fetch('/api/admin/users', {
        credentials: 'include' // Include NextAuth cookies
      })
      const data = await response.json()

      if (response.ok && data.success) {
        setUsers(data.users)
      } else {
        console.error('Failed to fetch users:', data.error)
      }
    } catch (error) {
      console.error('Failed to fetch users:', error)
    } finally {
      setLoading(false)
    }
  }

  const toggleBan = async (userId: string, currentBanStatus: boolean) => {
    try {
      const response = await fetch(`/api/admin/users/${userId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isBanned: !currentBanStatus }),
        credentials: 'include'
      })

      if (response.ok) {
        await fetchUsers() // Refresh the list
      } else {
        const data = await response.json()
        console.error('Failed to update user ban status:', data.error)
      }
    } catch (error) {
      console.error('Failed to update user ban status:', error)
    }
  }

  if (loading) {
    return <div className="p-4">Loading users...</div>
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-xl font-semibold mb-4">User Management</h2>

      <div className="overflow-x-auto">
        <table className="min-w-full table-auto">
          <thead>
            <tr className="border-b">
              <th className="text-left p-2">Username</th>
              <th className="text-left p-2">Display Name</th>
              <th className="text-left p-2">Wallet</th>
              <th className="text-left p-2">Status</th>
              <th className="text-left p-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.id} className="border-b">
                <td className="p-2 font-mono text-sm">{user.username}</td>
                <td className="p-2">{user.displayName}</td>
                <td className="p-2 font-mono text-xs">
                  {user.walletAddress.slice(0, 6)}...{user.walletAddress.slice(-4)}
                </td>
                <td className="p-2">
                  <span className={`px-2 py-1 rounded text-xs ${
                    user.isBanned
                      ? 'bg-red-100 text-red-800'
                      : 'bg-green-100 text-green-800'
                  }`}>
                    {user.isBanned ? 'Banned' : 'Active'}
                  </span>
                </td>
                <td className="p-2">
                  <button
                    onClick={() => toggleBan(user.id, user.isBanned)}
                    className={`px-3 py-1 rounded text-xs ${
                      user.isBanned
                        ? 'bg-green-600 hover:bg-green-700 text-white'
                        : 'bg-red-600 hover:bg-red-700 text-white'
                    }`}
                  >
                    {user.isBanned ? 'Unban' : 'Ban'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}