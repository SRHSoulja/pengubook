import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

export async function POST(request: NextRequest) {
  try {
    const { walletAddress, provider, providerAccountId, userName } = await request.json()

    if (!walletAddress || !provider || !providerAccountId) {
      return NextResponse.json(
        { error: 'Wallet address, provider, and provider account ID are required' },
        { status: 400 }
      )
    }

    const prisma = new PrismaClient()

    try {
      // Find the wallet user
      const walletUser = await prisma.user.findUnique({
        where: { walletAddress }
      })

      if (!walletUser) {
        await prisma.$disconnect()
        return NextResponse.json(
          { error: 'Wallet user not found' },
          { status: 404 }
        )
      }

      // Prepare update data based on provider
      const updateData: any = {}

      if (provider === 'discord') {
        updateData.discordName = userName || `Discord User ${providerAccountId}`
        updateData.discordId = providerAccountId
      } else if (provider === 'twitter') {
        updateData.twitterHandle = userName || `@TwitterUser${providerAccountId}`
        updateData.twitterId = providerAccountId
      }

      console.log('🔗 Linking social account:', `${provider} (${providerAccountId.slice(0, 8)}...) to wallet ${walletAddress.slice(0, 8)}...`)

      // Update the wallet user with OAuth account information
      if (Object.keys(updateData).length > 0) {
        await prisma.user.update({
          where: { walletAddress },
          data: updateData
        })
        console.log('✅ Social account linked:', `${provider} linked to ${walletAddress.slice(0, 8)}...`)
      }

      await prisma.$disconnect()

      return NextResponse.json({
        success: true,
        message: 'Social account linked successfully',
        linkedAccount: { provider, ...updateData }
      })
    } catch (error) {
      console.error('❌ Database error:', error)
      await prisma.$disconnect()
      return NextResponse.json(
        { error: 'Failed to link account' },
        { status: 500 }
      )
    }
  } catch (error) {
    console.error('❌ Link social account error:', error)
    return NextResponse.json(
      { error: 'Failed to link social account' },
      { status: 500 }
    )
  }
}