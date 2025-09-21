import { NextResponse } from 'next/server'

export async function GET() {
  try {
    // Skip database operations during build
    if (!process.env.DATABASE_URL) {
      return NextResponse.json({
        success: false,
        error: 'Database not available during build'
      }, { status: 503 })
    }

    const { PrismaClient } = await import('@prisma/client')
    const prisma = new PrismaClient()

    // Get system stats
    const totalUsers = await prisma.user.count()
    const totalTips = await prisma.tip.count().catch(() => 0) // In case tips table doesn't exist yet

    await prisma.$disconnect()

    // Calculate uptime (since app start)
    const uptimeMs = process.uptime() * 1000
    const uptimeHours = Math.floor(uptimeMs / (1000 * 60 * 60))
    const uptimeMinutes = Math.floor((uptimeMs % (1000 * 60 * 60)) / (1000 * 60))
    const uptime = `${uptimeHours}h ${uptimeMinutes}m`

    return NextResponse.json({
      success: true,
      totalUsers,
      connectedUsers: Math.floor(totalUsers * 0.1), // Simulate 10% online
      totalTips,
      totalTipVolume: '0', // Will be calculated once tips are implemented
      enabledTokens: 5, // ETH, USDC, USDT, DAI, WBTC
      uptime,
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    console.error('System stats error:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch system stats',
      details: error instanceof Error ? error.message : 'Unknown error',
      totalUsers: 0,
      connectedUsers: 0,
      totalTips: 0,
      totalTipVolume: '0',
      enabledTokens: 5,
      uptime: '0h 0m'
    }, { status: 500 })
  }
}