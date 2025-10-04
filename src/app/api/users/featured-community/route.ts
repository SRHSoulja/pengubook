import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withAuth } from '@/lib/auth-middleware'

export const dynamic = 'force-dynamic'

// SECURITY: Featured community updates require authentication
export const PUT = withAuth(async (request: NextRequest, user: any) => {
  try {
    // SECURITY: Use user ID from authenticated session
    const userId = user.id
    const { communityId } = await request.json()

    // Verify user is a member of the community
    if (communityId) {
      const membership = await prisma.communityMember.findFirst({
        where: {
          userId,
          communityId,
          status: 'ACTIVE'
        }
      })

      if (!membership) {
        return NextResponse.json(
          { error: 'You must be a member of this community to feature it' },
          { status: 403 }
        )
      }
    }

    // Update featured community
    const profile = await prisma.profile.update({
      where: { userId },
      data: {
        featuredCommunityId: communityId || null
      }
    })

    return NextResponse.json({
      success: true,
      featuredCommunityId: profile.featuredCommunityId
    })
  } catch (error: any) {
    console.error('Error updating featured community:', error)
    return NextResponse.json(
      { error: 'Failed to update featured community', details: error.message },
      { status: 500 }
    )
  }
})
