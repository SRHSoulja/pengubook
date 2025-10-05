import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id')
    const walletAddress = request.headers.get('x-wallet-address')

    if (!userId && !walletAddress) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify user exists
    const user = await prisma.user.findFirst({
      where: userId ? { id: userId } : { walletAddress: walletAddress!.toLowerCase() },
      include: { profile: true }
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Check if user already has a pending or approved application
    const existingApplication = await prisma.projectApplication.findFirst({
      where: {
        userId: user.id,
        status: { in: ['PENDING', 'APPROVED'] }
      }
    })

    if (existingApplication) {
      if (existingApplication.status === 'APPROVED') {
        return NextResponse.json(
          { error: 'You already have an approved project verification' },
          { status: 400 }
        )
      }
      return NextResponse.json(
        { error: 'You already have a pending application. Please wait for review.' },
        { status: 400 }
      )
    }

    const body = await request.json()
    const {
      projectName,
      projectType,
      contractAddress,
      officialWebsite,
      officialTwitter,
      officialDiscord,
      description,
      teamInfo,
      proofOfOwnership
    } = body

    // Validate required fields
    if (!projectName || !projectType || !contractAddress || !description || !proofOfOwnership) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Validate project type
    const validTypes = ['token', 'nft', 'defi', 'game', 'dao', 'infrastructure']
    if (!validTypes.includes(projectType)) {
      return NextResponse.json(
        { error: 'Invalid project type' },
        { status: 400 }
      )
    }

    // Create application
    const application = await prisma.projectApplication.create({
      data: {
        userId: user.id,
        projectName,
        projectType,
        contractAddress,
        officialWebsite: officialWebsite || null,
        officialTwitter: officialTwitter || null,
        officialDiscord: officialDiscord || null,
        description,
        teamInfo: teamInfo || null,
        proofOfOwnership,
        status: 'PENDING'
      }
    })

    return NextResponse.json({
      success: true,
      application
    })
  } catch (error) {
    console.error('Project application error:', error)
    return NextResponse.json(
      { error: 'Failed to submit application' },
      { status: 500 }
    )
  }
}
