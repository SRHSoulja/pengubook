import { NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()
const serverStartTime = Date.now()

export async function GET() {
  try {
    // Get real database statistics
    const [
      totalUsers,
      totalTips,
      recentUsers,
      enabledTokens,
      allTips
    ] = await Promise.all([
      prisma.user.count(),
      prisma.tip.count(),
      prisma.user.count({
        where: {
          createdAt: {
            gte: new Date(Date.now() - 24 * 60 * 60 * 1000) // Last 24 hours
          }
        }
      }),
      prisma.token.count({
        where: {
          isEnabled: true
        }
      }),
      prisma.tip.findMany({
        select: {
          amount: true
        }
      })
    ])

    // Calculate total tip volume (since amount is stored as string)
    const totalTipVolume = allTips.reduce((sum, tip) => {
      const amount = parseFloat(tip.amount) || 0
      return sum + amount
    }, 0).toFixed(4)

    // Calculate uptime
    const now = Date.now()
    const uptimeMs = now - serverStartTime
    const uptimeSeconds = Math.floor(uptimeMs / 1000)
    const uptimeMinutes = Math.floor(uptimeSeconds / 60)
    const uptimeHours = Math.floor(uptimeMinutes / 60)
    const uptimeDays = Math.floor(uptimeHours / 24)

    let uptimeString = ''
    if (uptimeDays > 0) {
      uptimeString = `${uptimeDays}d ${uptimeHours % 24}h`
    } else if (uptimeHours > 0) {
      uptimeString = `${uptimeHours}h ${uptimeMinutes % 60}m`
    } else if (uptimeMinutes > 0) {
      uptimeString = `${uptimeMinutes}m ${uptimeSeconds % 60}s`
    } else {
      uptimeString = `${uptimeSeconds}s`
    }

    return NextResponse.json({
      // Colony statistics
      totalUsers,
      connectedUsers: totalUsers, // For now, same as total users
      recentUsers,

      // Tip statistics
      totalTips,
      totalTipVolume: totalTipVolume,

      // Platform statistics
      enabledTokens,

      // System statistics
      uptime: uptimeString,
      serverStartTime: serverStartTime,
      currentTime: new Date().toISOString()
    })
  } catch (error) {
    console.error('Failed to fetch system stats:', error)

    // Fallback stats if database fails
    const now = Date.now()
    const uptimeMs = now - serverStartTime
    const uptimeSeconds = Math.floor(uptimeMs / 1000)

    return NextResponse.json({
      totalUsers: 0,
      connectedUsers: 0,
      recentUsers: 0,
      totalTips: 0,
      totalTipVolume: '0',
      enabledTokens: 0,
      uptime: `${uptimeSeconds}s`,
      serverStartTime: serverStartTime,
      currentTime: new Date().toISOString(),
      error: 'Database connection failed'
    })
  }
}