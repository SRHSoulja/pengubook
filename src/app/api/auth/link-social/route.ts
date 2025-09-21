import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

export async function POST(request: NextRequest) {
  console.log('[LinkSocial] Request received:', {
    method: 'POST',
    headers: {
      'content-type': request.headers.get('content-type'),
      'user-agent': request.headers.get('user-agent')?.slice(0, 50) + '...',
    },
    timestamp: new Date().toISOString()
  })

  try {
    const body = await request.json()
    const { walletAddress, provider, providerAccountId, userName } = body

    console.log('[LinkSocial] Request body:', {
      hasWalletAddress: !!walletAddress,
      walletAddressPrefix: walletAddress?.slice(0, 10) + '...',
      provider,
      providerAccountIdPrefix: providerAccountId?.slice(0, 10) + '...',
      userName,
      allFields: Object.keys(body).join(', '),
      timestamp: new Date().toISOString()
    })

    if (!walletAddress || !provider || !providerAccountId) {
      console.error('[LinkSocial] Missing required fields:', {
        hasWalletAddress: !!walletAddress,
        hasProvider: !!provider,
        hasProviderAccountId: !!providerAccountId,
        timestamp: new Date().toISOString()
      })
      return NextResponse.json(
        { error: 'Wallet address, provider, and provider account ID are required' },
        { status: 400 }
      )
    }

    const prisma = new PrismaClient()

    try {
      // Find the wallet user
      console.log('[LinkSocial] Finding wallet user:', {
        walletAddress: walletAddress.slice(0, 10) + '...',
        timestamp: new Date().toISOString()
      })

      const walletUser = await prisma.user.findUnique({
        where: { walletAddress }
      })

      if (!walletUser) {
        console.error('[LinkSocial] Wallet user not found:', {
          walletAddress: walletAddress.slice(0, 10) + '...',
          timestamp: new Date().toISOString()
        })
        await prisma.$disconnect()
        return NextResponse.json(
          { error: 'Wallet user not found' },
          { status: 404 }
        )
      }

      console.log('[LinkSocial] Wallet user found:', {
        userId: walletUser.id.slice(0, 10) + '...',
        walletAddress: walletUser.walletAddress.slice(0, 10) + '...',
        hasDiscord: !!walletUser.discordId,
        hasTwitter: !!walletUser.twitterId,
        timestamp: new Date().toISOString()
      })

      // Check if this social account is already linked to another user
      let existingUser = null
      if (provider === 'discord') {
        existingUser = await prisma.user.findFirst({
          where: {
            discordId: providerAccountId,
            NOT: { id: walletUser.id }
          }
        })
      } else if (provider === 'twitter') {
        existingUser = await prisma.user.findFirst({
          where: {
            twitterId: providerAccountId,
            NOT: { id: walletUser.id }
          }
        })
      }

      if (existingUser) {
        console.error('[LinkSocial] Social account already linked to another user:', {
          provider,
          providerAccountId: providerAccountId.slice(0, 10) + '...',
          existingUserId: existingUser.id.slice(0, 10) + '...',
          existingWallet: existingUser.walletAddress?.slice(0, 10) + '...',
          attemptingUserId: walletUser.id.slice(0, 10) + '...',
          timestamp: new Date().toISOString()
        })

        // Clear the existing link first
        if (provider === 'discord') {
          await prisma.user.update({
            where: { id: existingUser.id },
            data: { discordId: null, discordName: null }
          })
          console.log('[LinkSocial] Cleared existing Discord link from user:', existingUser.id.slice(0, 10) + '...')
        } else if (provider === 'twitter') {
          await prisma.user.update({
            where: { id: existingUser.id },
            data: { twitterId: null, twitterHandle: null }
          })
          console.log('[LinkSocial] Cleared existing Twitter/X link from user:', existingUser.id.slice(0, 10) + '...')
        }
      }

      // Prepare update data based on provider
      const updateData: any = {}

      if (provider === 'discord') {
        updateData.discordName = userName || `Discord User ${providerAccountId}`
        updateData.discordId = providerAccountId
      } else if (provider === 'twitter') {
        // Clean up Twitter handle to remove @ if present and ensure proper format
        const cleanHandle = userName ? userName.replace('@', '') : `TwitterUser${providerAccountId}`
        updateData.twitterHandle = cleanHandle.startsWith('@') ? cleanHandle : `@${cleanHandle}`
        updateData.twitterId = providerAccountId
      }

      console.log('[LinkSocial] Preparing update:', {
        provider,
        providerAccountId: providerAccountId.slice(0, 10) + '...',
        walletAddress: walletAddress.slice(0, 10) + '...',
        updateFields: Object.keys(updateData).join(', '),
        updateData,
        timestamp: new Date().toISOString()
      })

      // Update the wallet user with OAuth account information
      if (Object.keys(updateData).length > 0) {
        const updatedUser = await prisma.user.update({
          where: { walletAddress },
          data: updateData
        })
        console.log('[LinkSocial] Account linked successfully:', {
          provider,
          userId: updatedUser.id.slice(0, 10) + '...',
          walletAddress: updatedUser.walletAddress.slice(0, 10) + '...',
          updatedFields: Object.keys(updateData).join(', '),
          timestamp: new Date().toISOString()
        })
      } else {
        console.warn('[LinkSocial] No update data to apply:', {
          provider,
          timestamp: new Date().toISOString()
        })
      }

      await prisma.$disconnect()

      return NextResponse.json({
        success: true,
        message: 'Social account linked successfully',
        linkedAccount: { provider, ...updateData }
      })
    } catch (dbError: any) {
      console.error('[LinkSocial] Database error:', {
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
        { error: 'Failed to link account', details: dbError.message },
        { status: 500 }
      )
    }
  } catch (error: any) {
    console.error('[LinkSocial] Request processing error:', {
      error: error.message,
      stack: error.stack?.split('\n').slice(0, 3).join('\n'),
      timestamp: new Date().toISOString()
    })
    return NextResponse.json(
      { error: 'Failed to link social account', details: error.message },
      { status: 500 }
    )
  }
}