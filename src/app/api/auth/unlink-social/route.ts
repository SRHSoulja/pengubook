import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

export async function POST(request: NextRequest) {
  console.log('[UnlinkSocial] Request received:', {
    method: 'POST',
    timestamp: new Date().toISOString()
  })

  try {
    const body = await request.json()
    const { walletAddress, provider } = body

    console.log('[UnlinkSocial] Request body:', {
      hasWalletAddress: !!walletAddress,
      walletAddressPrefix: walletAddress?.slice(0, 10) + '...',
      provider,
      timestamp: new Date().toISOString()
    })

    if (!walletAddress || !provider) {
      console.error('[UnlinkSocial] Missing required fields:', {
        hasWalletAddress: !!walletAddress,
        hasProvider: !!provider,
        timestamp: new Date().toISOString()
      })
      return NextResponse.json(
        { error: 'Wallet address and provider are required' },
        { status: 400 }
      )
    }

    if (!['discord', 'twitter'].includes(provider)) {
      return NextResponse.json(
        { error: 'Invalid provider. Must be discord or twitter' },
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
        console.error('[UnlinkSocial] Wallet user not found:', {
          walletAddress: walletAddress.slice(0, 10) + '...',
          timestamp: new Date().toISOString()
        })
        await prisma.$disconnect()
        return NextResponse.json(
          { error: 'Wallet user not found' },
          { status: 404 }
        )
      }

      console.log('[UnlinkSocial] Wallet user found:', {
        userId: walletUser.id.slice(0, 10) + '...',
        walletAddress: walletUser.walletAddress.slice(0, 10) + '...',
        hasDiscord: !!walletUser.discordId,
        hasTwitter: !!walletUser.twitterId,
        timestamp: new Date().toISOString()
      })

      // Prepare update data to clear the specific provider
      const updateData: any = {}

      if (provider === 'discord') {
        updateData.discordId = null
        updateData.discordName = null
      } else if (provider === 'twitter') {
        updateData.twitterId = null
        updateData.twitterHandle = null
      }

      console.log('[UnlinkSocial] Unlinking provider:', {
        provider,
        updateFields: Object.keys(updateData),
        timestamp: new Date().toISOString()
      })

      // Update the user to remove the social account link
      const updatedUser = await prisma.user.update({
        where: { walletAddress },
        data: updateData
      })

      console.log('[UnlinkSocial] Social account unlinked successfully:', {
        provider,
        userId: updatedUser.id.slice(0, 10) + '...',
        walletAddress: updatedUser.walletAddress.slice(0, 10) + '...',
        remainingLinks: {
          hasDiscord: !!updatedUser.discordId,
          hasTwitter: !!updatedUser.twitterId
        },
        timestamp: new Date().toISOString()
      })

      await prisma.$disconnect()

      return NextResponse.json({
        success: true,
        message: `${provider} account unlinked successfully`,
        unlinkedProvider: provider,
        remainingLinks: {
          discord: !!updatedUser.discordId,
          twitter: !!updatedUser.twitterId
        }
      })
    } catch (dbError: any) {
      console.error('[UnlinkSocial] Database error:', {
        error: dbError.message,
        code: dbError.code,
        meta: dbError.meta,
        stack: dbError.stack?.split('\n').slice(0, 3).join('\n'),
        walletAddress: walletAddress?.slice(0, 10) + '...',
        provider,
        timestamp: new Date().toISOString()
      })
      await prisma.$disconnect()
      return NextResponse.json(
        { error: 'Failed to unlink account', details: dbError.message },
        { status: 500 }
      )
    }
  } catch (error: any) {
    console.error('[UnlinkSocial] Request processing error:', {
      error: error.message,
      stack: error.stack?.split('\n').slice(0, 3).join('\n'),
      timestamp: new Date().toISOString()
    })
    return NextResponse.json(
      { error: 'Failed to unlink social account', details: error.message },
      { status: 500 }
    )
  }
}