import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export async function POST(request: NextRequest) {
  try {
    const { walletAddress } = await request.json()

    if (!walletAddress) {
      return NextResponse.json({ error: 'Wallet address required' }, { status: 400 })
    }

    // Clear Discord info from user
    await prisma.user.update({
      where: { walletAddress },
      data: {
        discordId: null,
        discordName: null,
      },
    })

    // Remove Discord tokens from profile
    const existingProfile = await prisma.profile.findFirst({ where: { user: { walletAddress } } })
    if (existingProfile?.socialLinks) {
      const socialLinks = JSON.parse(existingProfile.socialLinks)
      delete socialLinks.discord

      await prisma.profile.update({
        where: { id: existingProfile.id },
        data: {
          socialLinks: JSON.stringify(socialLinks)
        }
      })
    }

    return NextResponse.json({ success: true, message: 'Discord account disconnected' })
  } catch (error) {
    console.error('Discord disconnect error:', error)
    return NextResponse.json({ error: 'Failed to disconnect Discord account' }, { status: 500 })
  }
}