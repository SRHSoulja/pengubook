import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

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

    const applicationId = params.id
    const body = await request.json()
    const { status, adminNotes } = body

    // Validate status
    if (!['APPROVED', 'REJECTED', 'PENDING'].includes(status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
    }

    // Find application
    const application = await prisma.projectApplication.findUnique({
      where: { id: applicationId },
      include: { user: true }
    })

    if (!application) {
      return NextResponse.json({ error: 'Application not found' }, { status: 404 })
    }

    // Update application
    const updatedApplication = await prisma.projectApplication.update({
      where: { id: applicationId },
      data: {
        status,
        adminNotes: adminNotes || null,
        reviewedBy: admin.id,
        reviewedAt: new Date()
      }
    })

    // If approved, update user's profile to be a project account
    if (status === 'APPROVED') {
      // Create or update profile
      const existingProfile = await prisma.profile.findUnique({
        where: { userId: application.userId }
      })

      if (existingProfile) {
        await prisma.profile.update({
          where: { userId: application.userId },
          data: {
            isProject: true,
            projectType: application.projectType,
            projectWebsite: application.officialWebsite,
            projectTwitter: application.officialTwitter,
            projectDiscord: application.officialDiscord,
            contractAddress: application.contractAddress,
            profileVerified: true // Auto-verify approved projects
          }
        })
      } else {
        await prisma.profile.create({
          data: {
            userId: application.userId,
            isProject: true,
            projectType: application.projectType,
            projectWebsite: application.officialWebsite,
            projectTwitter: application.officialTwitter,
            projectDiscord: application.officialDiscord,
            contractAddress: application.contractAddress,
            profileVerified: true
          }
        })
      }
    }

    return NextResponse.json({
      success: true,
      application: updatedApplication
    })
  } catch (error) {
    console.error('Update project application error:', error)
    return NextResponse.json(
      { error: 'Failed to update application' },
      { status: 500 }
    )
  }
}
