import { NextRequest, NextResponse } from 'next/server'
export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

import { prisma } from '@/lib/prisma'

// POST - Report an NFT collection
export async function POST(request: NextRequest) {
  try {
    const { userId, contractAddress, reason, description } = await request.json()

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized - User ID required' }, { status: 401 })
    }

    if (!contractAddress) {
      return NextResponse.json({ error: 'Contract address is required' }, { status: 400 })
    }

    if (!reason) {
      return NextResponse.json({ error: 'Reason is required' }, { status: 400 })
    }

    // Validate address format
    if (!/^0x[a-fA-F0-9]{40}$/.test(contractAddress)) {
      return NextResponse.json({ error: 'Invalid contract address format' }, { status: 400 })
    }

    // Ensure collection exists in database
    const collection = await prisma.nFTCollection.upsert({
      where: { contractAddress: contractAddress.toLowerCase() },
      create: {
        contractAddress: contractAddress.toLowerCase(),
        tokenType: 'ERC721', // Default
        totalReports: 1
      },
      update: {
        totalReports: {
          increment: 1
        }
      }
    })

    // Create report
    const report = await prisma.reportedNFT.create({
      data: {
        reporterId: userId,
        contractAddress: contractAddress.toLowerCase(),
        reason,
        description: description || null,
        status: 'PENDING'
      }
    })

    // Auto-blacklist if report count exceeds threshold
    const BLACKLIST_THRESHOLD = 10
    if (collection.totalReports >= BLACKLIST_THRESHOLD && !collection.isBlacklisted) {
      await prisma.nFTCollection.update({
        where: { id: collection.id },
        data: {
          isBlacklisted: true,
          blacklistReason: `Auto-blacklisted after ${BLACKLIST_THRESHOLD} reports`
        }
      })
    }

    return NextResponse.json({
      success: true,
      report,
      message: collection.totalReports >= BLACKLIST_THRESHOLD
        ? 'Collection has been blacklisted due to multiple reports'
        : 'Report submitted successfully'
    })
  } catch (error: any) {
    console.error('Error reporting NFT:', error)
    return NextResponse.json({ error: 'Failed to submit report' }, { status: 500 })
  }
}

// GET - Get reports for admin review
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')
    const isAdmin = searchParams.get('isAdmin') === 'true'

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Only admins can view all reports
    if (!isAdmin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    const reports = await prisma.reportedNFT.findMany({
      include: {
        reporter: {
          select: {
            id: true,
            username: true,
            displayName: true,
            avatar: true
          }
        },
        collection: {
          select: {
            name: true,
            symbol: true,
            tokenType: true,
            totalReports: true,
            isBlacklisted: true
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: 100
    })

    return NextResponse.json(reports)
  } catch (error) {
    console.error('Error fetching NFT reports:', error)
    return NextResponse.json({ error: 'Failed to fetch reports' }, { status: 500 })
  }
}

// PATCH - Update report status (admin only)
export async function PATCH(request: NextRequest) {
  try {
    const { reportId, status, reviewerId, blacklist } = await request.json()

    if (!reviewerId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify reviewer is admin
    const reviewer = await prisma.user.findUnique({
      where: { id: reviewerId },
      select: { isAdmin: true }
    })

    if (!reviewer?.isAdmin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    const report = await prisma.reportedNFT.update({
      where: { id: reportId },
      data: {
        status,
        reviewedBy: reviewerId,
        reviewedAt: new Date()
      }
    })

    // If blacklisting the collection
    if (blacklist && status === 'BLACKLISTED') {
      await prisma.nFTCollection.update({
        where: { contractAddress: report.contractAddress },
        data: {
          isBlacklisted: true,
          blacklistReason: report.reason
        }
      })
    }

    return NextResponse.json({ success: true, report })
  } catch (error) {
    console.error('Error updating report:', error)
    return NextResponse.json({ error: 'Failed to update report' }, { status: 500 })
  }
}
