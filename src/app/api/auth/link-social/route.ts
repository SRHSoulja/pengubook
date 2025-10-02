import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

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
    const { walletAddress, provider, providerAccountId, userName, actualUsername, avatarUrl } = body

    console.log('[LinkSocial] Request body:', {
      hasWalletAddress: !!walletAddress,
      walletAddressPrefix: walletAddress?.slice(0, 10) + '...',
      provider,
      providerAccountIdPrefix: providerAccountId?.slice(0, 10) + '...',
      userName,
      actualUsername,
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
        return NextResponse.json(
          { error: 'Wallet user not found' },
          { status: 404 }
        )
      }

      console.log('[LinkSocial] Wallet user found:', {
        userId: walletUser.id.slice(0, 10) + '...',
        walletAddress: walletUser.walletAddress?.slice(0, 10) + '...' || 'none',
        hasDiscord: !!walletUser.discordId,
        hasTwitter: !!walletUser.twitterId,
        timestamp: new Date().toISOString()
      })

      // Use a transaction to handle potential conflicts atomically
      const result = await prisma.$transaction(async (tx) => {
        // Check if this social account is already linked to another user
        let existingUser = null
        if (provider === 'discord') {
          existingUser = await tx.user.findFirst({
            where: {
              discordId: providerAccountId,
              NOT: { id: walletUser.id }
            }
          })
        } else if (provider === 'twitter') {
          existingUser = await tx.user.findFirst({
            where: {
              twitterId: providerAccountId,
              NOT: { id: walletUser.id }
            }
          })
        }

        if (existingUser) {
          console.log('[LinkSocial] Social account already linked, unlinking from old user:', {
            provider,
            providerAccountId: providerAccountId.slice(0, 10) + '...',
            existingUserId: existingUser.id.slice(0, 10) + '...',
            existingWallet: existingUser.walletAddress?.slice(0, 10) + '...',
            newUserId: walletUser.id.slice(0, 10) + '...',
            timestamp: new Date().toISOString()
          })

          // Clear the existing link first
          if (provider === 'discord') {
            await tx.user.update({
              where: { id: existingUser.id },
              data: { discordId: null, discordName: null }
            })
            console.log('[LinkSocial] Cleared existing Discord link from user:', existingUser.id.slice(0, 10) + '...')
          } else if (provider === 'twitter') {
            await tx.user.update({
              where: { id: existingUser.id },
              data: { twitterId: null, twitterHandle: null }
            })
            console.log('[LinkSocial] Cleared existing Twitter/X link from user:', existingUser.id.slice(0, 10) + '...')
          }
        }

        // Now update the current user
        const updateData: any = {}
        if (provider === 'discord') {
          // Use actualUsername if available, fallback to userName
          const discordUsername = actualUsername || userName || `Discord User ${providerAccountId}`
          updateData.discordName = discordUsername
          updateData.discordId = providerAccountId
          if (avatarUrl) {
            updateData.discordAvatar = avatarUrl
          }
        } else if (provider === 'twitter') {
          // For Twitter, use actualUsername (the @handle) if available
          let twitterHandle = actualUsername || userName || `TwitterUser${providerAccountId}`

          // Remove spaces and clean up the handle
          twitterHandle = twitterHandle.replace(/\s+/g, '').replace('@', '')

          // Ensure it starts with @
          updateData.twitterHandle = twitterHandle.startsWith('@') ? twitterHandle : `@${twitterHandle}`
          updateData.twitterId = providerAccountId
          if (avatarUrl) {
            // Upgrade Twitter avatar quality from _normal to _400x400
            const upgradedAvatarUrl = avatarUrl.replace('_normal.', '_400x400.')
            updateData.twitterAvatar = upgradedAvatarUrl
            console.log('[LinkSocial] Twitter avatar upgrade:', {
              original: avatarUrl,
              upgraded: upgradedAvatarUrl,
              wasUpgraded: avatarUrl !== upgradedAvatarUrl,
              timestamp: new Date().toISOString()
            })
          }

          console.log('[LinkSocial] Twitter handle processing:', {
            originalUserName: userName,
            actualUsername,
            finalHandle: updateData.twitterHandle,
            avatarUrl,
            timestamp: new Date().toISOString()
          })
        }

        console.log('[LinkSocial] About to update user with data:', {
          walletAddress: walletAddress.slice(0, 10) + '...',
          updateData,
          updateFields: Object.keys(updateData),
          timestamp: new Date().toISOString()
        })

        const updatedUser = await tx.user.update({
          where: { walletAddress },
          data: updateData
        })

        console.log('[LinkSocial] Account linked successfully:', {
          provider,
          userId: updatedUser.id.slice(0, 10) + '...',
          walletAddress: updatedUser.walletAddress?.slice(0, 10) + '...' || 'none',
          updatedFields: Object.keys(updateData).join(', '),
          actualUpdatedData: {
            discordId: updatedUser.discordId?.slice(0, 10) + '...' || null,
            discordName: updatedUser.discordName,
            twitterId: updatedUser.twitterId?.slice(0, 10) + '...' || null,
            twitterHandle: updatedUser.twitterHandle
          },
          timestamp: new Date().toISOString()
        })

        // Verify the update by fetching the user again
        const verifyUser = await tx.user.findUnique({
          where: { walletAddress },
          select: {
            id: true,
            discordId: true,
            discordName: true,
            twitterId: true,
            twitterHandle: true
          }
        })

        console.log('[LinkSocial] Verification - user data after update:', {
          provider,
          verifyUser,
          timestamp: new Date().toISOString()
        })

        return { updateData, updatedUser, verifyUser }
      })


      return NextResponse.json({
        success: true,
        content: 'Social account linked successfully',
        linkedAccount: { provider, ...result.updateData },
        verifiedData: result.verifyUser
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