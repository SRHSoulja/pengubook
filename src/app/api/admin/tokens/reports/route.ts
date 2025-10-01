import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

export const dynamic = 'force-dynamic'

// GET - Get all token reports (admin only)
export async function GET(request: NextRequest) {
  try {
    const prisma = new PrismaClient()

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status') || 'PENDING'

    const reports = await prisma.tokenReport.findMany({
      where: status !== 'ALL' ? { status } : undefined,
      orderBy: { createdAt: 'desc' },
      take: 100
    })

    // Group by token address and count reports
    const grouped = reports.reduce((acc: any, report) => {
      const key = report.tokenAddress.toLowerCase()
      if (!acc[key]) {
        acc[key] = {
          tokenAddress: report.tokenAddress,
          symbol: report.symbol,
          name: report.name,
          reportCount: 0,
          reports: [],
          latestReason: report.reason,
          status: report.status
        }
      }
      acc[key].reportCount++
      acc[key].reports.push({
        id: report.id,
        reporterId: report.reporterId,
        reason: report.reason,
        description: report.description,
        createdAt: report.createdAt
      })
      return acc
    }, {})

    const groupedArray = Object.values(grouped).sort((a: any, b: any) => b.reportCount - a.reportCount)

    await prisma.$disconnect()
    return NextResponse.json(groupedArray)
  } catch (error) {
    console.error('Error fetching token reports:', error)
    return NextResponse.json({ error: 'Failed to fetch reports' }, { status: 500 })
  }
}

// PATCH - Update report status
export async function PATCH(request: NextRequest) {
  try {
    const prisma = new PrismaClient()
    const { tokenAddress, status, userId } = await request.json()

    if (!tokenAddress || !status) {
      return NextResponse.json({ error: 'Token address and status are required' }, { status: 400 })
    }

    // Update all reports for this token
    await prisma.tokenReport.updateMany({
      where: { tokenAddress: tokenAddress.toLowerCase() },
      data: {
        status,
        reviewedAt: new Date(),
        reviewedBy: userId || null
      }
    })

    await prisma.$disconnect()
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error updating report status:', error)
    return NextResponse.json({ error: 'Failed to update status' }, { status: 500 })
  }
}
