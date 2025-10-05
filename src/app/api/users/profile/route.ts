import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { sanitizeText, sanitizeHtml, sanitizeUrl } from '@/lib/sanitize'
import { withAuth } from '@/lib/auth-middleware'
import { INPUT_LIMITS, validateFields } from '@/lib/validation-constraints'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    // Skip database operations during build
    if (!process.env.DATABASE_URL || process.env.NODE_ENV === 'production' && !request.url) {
      return NextResponse.json({
        success: false,
        error: 'Database not available during build'
      }, { status: 503 })
    }

    const { searchParams } = new URL(request.url)
    const walletAddress = searchParams.get('walletAddress')
    const oauthId = searchParams.get('oauthId')
    const nextAuthId = searchParams.get('nextAuthId')

    console.log('[UserProfile] Request received:', {
      walletAddress: walletAddress?.slice(0, 10) + '...' || 'none',
      oauthId: oauthId?.slice(0, 10) + '...' || 'none',
      nextAuthId: nextAuthId?.slice(0, 10) + '...' || 'none',
      timestamp: new Date().toISOString()
    })

    if (!walletAddress && !oauthId && !nextAuthId) {
      return NextResponse.json(
        { error: 'Wallet address, OAuth ID, or NextAuth ID is required' },
        { status: 400 }
      )
    }

    let user = null
    if (walletAddress) {
      // Normalize wallet address to lowercase for database lookup
      const normalizedAddress = walletAddress.toLowerCase()
      console.log('[UserProfile] Searching for wallet address:', normalizedAddress)
      user = await prisma.user.findUnique({
        where: { walletAddress: normalizedAddress },
        include: { profile: true }
      })
      console.log('[UserProfile] Wallet lookup result:', user ? `Found user ${user.id}, isAdmin: ${user.isAdmin}` : 'Not found')
    } else if (nextAuthId) {
      // Look up user by NextAuth ID - could be the user ID directly or from Account table
      user = await prisma.user.findUnique({
        where: { id: nextAuthId },
        include: { profile: true }
      })

      // If not found, try looking in Account table
      if (!user) {
        const account = await prisma.account.findFirst({
          where: { providerAccountId: nextAuthId },
          include: {
            user: {
              include: { profile: true }
            }
          }
        })
        user = account?.user || null
      }
    } else if (oauthId) {
      // Try finding by Discord ID first, then Twitter ID
      user = await prisma.user.findFirst({
        where: {
          OR: [
            { discordId: oauthId },
            { twitterId: oauthId }
          ]
        },
        include: { profile: true }
      })
    }

    if (!user) {
      console.log('[UserProfile] User not found:', {
        walletAddress: walletAddress?.slice(0, 10) + '...' || 'none',
        nextAuthId: nextAuthId?.slice(0, 10) + '...' || 'none',
        oauthId: oauthId?.slice(0, 10) + '...' || 'none',
        timestamp: new Date().toISOString()
      })

      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    console.log('[UserProfile] User found:', {
      userId: user.id.slice(0, 10) + '...',
      walletAddress: user.walletAddress?.slice(0, 10) + '...' || 'none',
      hasDiscord: !!user.discordId,
      hasTwitter: !!user.twitterId,
      discordName: user.discordName,
      twitterHandle: user.twitterHandle,
      timestamp: new Date().toISOString()
    })


    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        username: user.username || user.displayName || 'Unknown',
        displayName: user.displayName || user.name || 'Unknown',
        walletAddress: user.walletAddress || '',
        bio: user.bio || '',
        avatar: user.avatar || user.image || '',
        avatarSource: user.avatarSource || 'default',
        level: user.level,
        isAdmin: user.isAdmin,
        isBanned: user.isBanned,
        discordName: user.discordName,
        discordAvatar: user.discordAvatar,
        twitterHandle: user.twitterHandle,
        twitterAvatar: user.twitterAvatar,
        discordId: user.discordId,
        twitterId: user.twitterId,
        profile: user.profile
      }
    })
  } catch (error) {
    console.error('Profile fetch error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch profile' },
      { status: 500 }
    )
  }
}

// SECURITY: Profile updates require authentication to prevent IDOR attacks
export const PUT = withAuth(async (request: NextRequest, user: any) => {
  try {
    // Skip database operations during build
    if (!process.env.DATABASE_URL) {
      return NextResponse.json({
        success: false,
        error: 'Database not available during build'
      }, { status: 503 })
    }

    const { PrismaClient } = await import('@prisma/client')


    const body = await request.json()
    const { displayName, username, bio, interests, avatarSource, bannerImage, showNSFW, allowedNSFWCategories } = body

    // SECURITY: Use wallet address from authenticated session, NOT from request body
    const walletAddress = user.walletAddress

    console.log('[UserProfile] Update request:', {
      authenticatedUserId: user.id.slice(0, 10) + '...',
      walletAddress: walletAddress?.slice(0, 10) + '...',
      displayName,
      username,
      bio: bio?.slice(0, 50) + '...',
      interests: Array.isArray(interests) ? interests.join(', ') : interests,
      avatarSource,
      bannerImage: bannerImage?.slice(0, 50) + '...' || 'none',
      receivedAvatarSource: !!avatarSource,
      timestamp: new Date().toISOString()
    })

    if (!walletAddress) {
      return NextResponse.json(
        { error: 'Wallet address not found in session' },
        { status: 400 }
      )
    }

    // Find the user first (should match authenticated user)
    const existingUser = await prisma.user.findUnique({
      where: { walletAddress }
    })

    if (!existingUser) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    // Additional check: verify the authenticated user matches the user being updated
    if (existingUser.id !== user.id) {
      return NextResponse.json(
        { error: 'Unauthorized: Cannot update another user\'s profile' },
        { status: 403 }
      )
    }

    // Validate input lengths before processing
    const validation = validateFields(
      {
        username: username,
        displayName: displayName,
        bio: bio
      },
      {
        username: INPUT_LIMITS.USERNAME,
        displayName: INPUT_LIMITS.DISPLAY_NAME,
        bio: INPUT_LIMITS.BIO
      }
    )

    if (!validation.isValid) {
      return NextResponse.json(
        { error: validation.errors.join(', ') },
        { status: 400 }
      )
    }

    // Prepare update data (excluding social accounts which are OAuth-only)
    const updateData: any = {}

    // Sanitize user inputs to prevent XSS attacks
    if (displayName !== undefined) updateData.displayName = sanitizeText(displayName)

    // SECURITY: Username must match one of the linked social accounts
    if (username !== undefined) {
      const sanitizedUsername = sanitizeText(username)

      // Check if username matches Discord or Twitter handle
      const isDiscordUsername = existingUser.discordName && sanitizedUsername === existingUser.discordName
      const isTwitterUsername = existingUser.twitterHandle && (
        sanitizedUsername === existingUser.twitterHandle ||
        sanitizedUsername === existingUser.twitterHandle.replace('@', '')
      )

      if (!isDiscordUsername && !isTwitterUsername) {
        return NextResponse.json(
          { error: 'Username must match one of your linked social accounts (Discord or X/Twitter)' },
          { status: 400 }
        )
      }

      updateData.username = sanitizedUsername
    }

    if (bio !== undefined) updateData.bio = sanitizeHtml(bio) // Allow safe HTML formatting in bio

    // Handle avatar source and update avatar URL accordingly
    if (avatarSource !== undefined) {
      updateData.avatarSource = avatarSource

      console.log('[UserProfile] Avatar source change:', {
        newSource: avatarSource,
        discordAvatar: existingUser.discordAvatar,
        twitterAvatar: existingUser.twitterAvatar,
        timestamp: new Date().toISOString()
      })

      // Update the avatar field based on the selected source
      if (avatarSource === 'discord' && existingUser.discordAvatar) {
        updateData.avatar = existingUser.discordAvatar
        console.log('[UserProfile] Setting avatar to Discord:', existingUser.discordAvatar)
      } else if (avatarSource === 'twitter' && existingUser.twitterAvatar) {
        updateData.avatar = existingUser.twitterAvatar
        console.log('[UserProfile] Setting avatar to Twitter:', existingUser.twitterAvatar)
      } else {
        // Default avatar (null or empty string - will use gradient fallback in UI)
        updateData.avatar = null
        console.log('[UserProfile] Setting avatar to default (null)')
      }
    }

    console.log('[UserProfile] Updating user with data:', {
      updateData,
      hasInterests: !!interests,
      timestamp: new Date().toISOString()
    })

    // Update the user
    const updatedUser = await prisma.user.update({
      where: { walletAddress },
      data: updateData,
      include: { profile: true }
    })

    // Handle profile interests, banner, NSFW preference, and project fields separately if provided
    const { projectWebsite, projectTwitter, projectDiscord } = body
    if ((interests && Array.isArray(interests) && interests.length > 0) || bannerImage !== undefined || showNSFW !== undefined || allowedNSFWCategories !== undefined || projectWebsite !== undefined || projectTwitter !== undefined || projectDiscord !== undefined) {
      const profileData: any = {}

      if (interests && Array.isArray(interests) && interests.length > 0) {
        profileData.interests = JSON.stringify(interests)
      }

      if (showNSFW !== undefined) {
        profileData.showNSFW = showNSFW
      }

      if (allowedNSFWCategories !== undefined) {
        profileData.allowedNSFWCategories = JSON.stringify(allowedNSFWCategories)
      }

      // Only allow project field updates for verified projects
      const currentProfile = await prisma.profile.findUnique({
        where: { userId: updatedUser.id }
      })

      if (currentProfile?.isProject && currentProfile?.profileVerified) {
        if (projectWebsite !== undefined) {
          profileData.projectWebsite = projectWebsite || null
        }
        if (projectTwitter !== undefined) {
          profileData.projectTwitter = projectTwitter || null
        }
        if (projectDiscord !== undefined) {
          profileData.projectDiscord = projectDiscord || null
        }
      }

      if (bannerImage !== undefined) {
        // Sanitize URL to prevent XSS
        const sanitizedBanner = sanitizeUrl(bannerImage)

        if (!sanitizedBanner && bannerImage) {
          return NextResponse.json(
            { error: 'Invalid banner image URL' },
            { status: 400 }
          )
        }

        // Delete old banner from Cloudinary if replacing
        const existingProfile = await prisma.profile.findUnique({
          where: { userId: updatedUser.id }
        })

        if (existingProfile?.bannerImage && existingProfile.bannerImage !== sanitizedBanner) {
          // Extract public ID from old Cloudinary URL
          const urlMatch = existingProfile.bannerImage.match(/\/([^\/]+)\.(jpg|jpeg|png|gif|webp)$/)
          if (urlMatch) {
            const publicId = `pengubook/profile-banner/${urlMatch[1]}`
            try {
              const { v2: cloudinary } = await import('cloudinary')
              await cloudinary.uploader.destroy(publicId)
              console.log('[Profile] Deleted old banner from Cloudinary:', publicId)
            } catch (error) {
              console.error('[Profile] Failed to delete old banner:', error)
              // Don't fail the request if deletion fails
            }
          }
        }

        profileData.bannerImage = sanitizedBanner || null
      }

      // Update or create profile
      await prisma.profile.upsert({
        where: { userId: updatedUser.id },
        update: profileData,
        create: {
          userId: updatedUser.id,
          ...profileData
        }
      })

      // Fetch the updated user with profile
      const userWithProfile = await prisma.user.findUnique({
        where: { id: updatedUser.id },
        include: { profile: true }
      })

      console.log('[UserProfile] Profile updated:', {
        userId: updatedUser.id.slice(0, 10) + '...',
        interests: interests || 'unchanged',
        bannerImage: bannerImage ? bannerImage.slice(0, 50) + '...' : 'unchanged',
        timestamp: new Date().toISOString()
      })


      return NextResponse.json({
        success: true,
        user: {
          id: userWithProfile!.id,
          username: userWithProfile!.username,
          displayName: userWithProfile!.displayName,
          walletAddress: userWithProfile!.walletAddress,
          bio: userWithProfile!.bio,
          avatar: userWithProfile!.avatar,
          avatarSource: userWithProfile!.avatarSource || 'default',
          level: userWithProfile!.level,
          isAdmin: userWithProfile!.isAdmin,
          isBanned: userWithProfile!.isBanned,
          discordName: userWithProfile!.discordName,
          discordAvatar: userWithProfile!.discordAvatar,
          twitterHandle: userWithProfile!.twitterHandle,
          twitterAvatar: userWithProfile!.twitterAvatar,
          profile: userWithProfile!.profile
        }
      })
    }

    console.log('[UserProfile] User updated successfully:', {
      userId: updatedUser.id.slice(0, 10) + '...',
      username: updatedUser.username,
      displayName: updatedUser.displayName,
      timestamp: new Date().toISOString()
    })


    return NextResponse.json({
      success: true,
      user: {
        id: updatedUser.id,
        username: updatedUser.username,
        displayName: updatedUser.displayName,
        walletAddress: updatedUser.walletAddress,
        bio: updatedUser.bio,
        avatar: updatedUser.avatar,
        avatarSource: updatedUser.avatarSource || 'default',
        level: updatedUser.level,
        isAdmin: updatedUser.isAdmin,
        isBanned: updatedUser.isBanned,
        discordName: updatedUser.discordName,
        discordAvatar: updatedUser.discordAvatar,
        twitterHandle: updatedUser.twitterHandle,
        twitterAvatar: updatedUser.twitterAvatar,
        profile: updatedUser.profile
      }
    })
  } catch (error) {
    console.error('Profile update error:', error)
    return NextResponse.json(
      { error: 'Failed to update profile' },
      { status: 500 }
    )
  }
})