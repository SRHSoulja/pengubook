import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    // Fetch all verified project accounts
    const projects = await prisma.user.findMany({
      where: {
        profile: {
          isProject: true,
          profileVerified: true
        }
      },
      include: {
        profile: {
          select: {
            projectType: true,
            projectWebsite: true,
            projectTwitter: true,
            projectDiscord: true,
            contractAddress: true,
            followersCount: true,
            postsCount: true
          }
        }
      },
      orderBy: [
        { createdAt: 'desc' }
      ]
    })

    return NextResponse.json({
      success: true,
      projects
    })
  } catch (error) {
    console.error('Fetch verified projects error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch verified projects' },
      { status: 500 }
    )
  }
}
