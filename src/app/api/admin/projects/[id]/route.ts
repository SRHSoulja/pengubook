import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { sanitizeUrl } from '@/lib/sanitize'

export const dynamic = 'force-dynamic'

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const adminWallet = request.headers.get('x-wallet-address')

    if (!adminWallet) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify admin
    const admin = await prisma.user.findFirst({
      where: {
        walletAddress: adminWallet.toLowerCase(),
        isAdmin: true
      }
    })

    if (!admin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    const body = await request.json()
    const {
      isProject,
      projectType,
      projectWebsite,
      projectTwitter,
      projectDiscord,
      contractAddress,
      profileVerified
    } = body

    const userId = params.id

    // SECURITY: Validate project URLs before saving to database
    const sanitizedProjectWebsite = projectWebsite ? sanitizeUrl(projectWebsite) : null
    const sanitizedProjectTwitter = projectTwitter ? sanitizeUrl(projectTwitter) : null
    const sanitizedProjectDiscord = projectDiscord ? sanitizeUrl(projectDiscord) : null

    if (projectWebsite && !sanitizedProjectWebsite) {
      return NextResponse.json({ error: 'Invalid project website URL' }, { status: 400 })
    }
    if (projectTwitter && !sanitizedProjectTwitter) {
      return NextResponse.json({ error: 'Invalid project Twitter URL' }, { status: 400 })
    }
    if (projectDiscord && !sanitizedProjectDiscord) {
      return NextResponse.json({ error: 'Invalid project Discord URL' }, { status: 400 })
    }

    // Find user
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { profile: true }
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Create profile if doesn't exist
    if (!user.profile) {
      await prisma.profile.create({
        data: {
          userId,
          isProject: isProject || false,
          projectType: projectType || null,
          projectWebsite: sanitizedProjectWebsite,
          projectTwitter: sanitizedProjectTwitter,
          projectDiscord: sanitizedProjectDiscord,
          contractAddress: contractAddress || null,
          profileVerified: profileVerified || false
        }
      })
    } else {
      // Update existing profile
      await prisma.profile.update({
        where: { userId },
        data: {
          isProject: isProject !== undefined ? isProject : user.profile.isProject,
          projectType: projectType !== undefined ? projectType : user.profile.projectType,
          projectWebsite: sanitizedProjectWebsite !== null ? sanitizedProjectWebsite : user.profile.projectWebsite,
          projectTwitter: sanitizedProjectTwitter !== null ? sanitizedProjectTwitter : user.profile.projectTwitter,
          projectDiscord: sanitizedProjectDiscord !== null ? sanitizedProjectDiscord : user.profile.projectDiscord,
          contractAddress: contractAddress !== undefined ? contractAddress : user.profile.contractAddress,
          profileVerified: profileVerified !== undefined ? profileVerified : user.profile.profileVerified
        }
      })
    }

    // Fetch updated user
    const updatedUser = await prisma.user.findUnique({
      where: { id: userId },
      include: { profile: true }
    })

    return NextResponse.json({
      success: true,
      user: updatedUser
    })
  } catch (error) {
    console.error('Update project error:', error)
    return NextResponse.json(
      { error: 'Failed to update project' },
      { status: 500 }
    )
  }
}
