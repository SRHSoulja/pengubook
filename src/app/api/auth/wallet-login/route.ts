import { NextRequest, NextResponse } from 'next/server'
import { SiweMessage } from 'siwe'
import { prisma } from '@/lib/prisma'

export async function POST(request: NextRequest) {
  try {
    // Skip database operations during build
    if (!process.env.DATABASE_URL) {
      return NextResponse.json({
        success: false,
        error: 'Database not available during build'
      }, { status: 503 })
    }

    const { message, signature } = await request.json()

    if (!message || !signature) {
      return NextResponse.json(
        { error: 'Message and signature are required' },
        { status: 400 }
      )
    }

    // Verify the SIWE message and signature
    try {
      const siweMessage = new SiweMessage(message)
      const fields = await siweMessage.verify({ signature })

      // Signature verification successful
      const walletAddress = fields.data.address

      // Check if user exists, create if not
      let user = await prisma.user.findUnique({
        where: { walletAddress }
      })

      if (!user) {
        // Create new user with profile
        user = await prisma.user.create({
          data: {
            walletAddress,
            username: `user_${walletAddress.slice(-6)}`,
            displayName: `Penguin ${walletAddress.slice(-4)}`,
            profile: {
              create: {
                isPrivate: false,
                showActivity: true,
                showTips: true,
                allowDirectMessages: true,
                theme: 'dark',
                profileVerified: false
              }
            }
          }
        })
      }

      return NextResponse.json({
        success: true,
        content: 'Wallet authentication successful',
        user: {
          id: user.id,
          walletAddress: user.walletAddress,
          username: user.username,
          displayName: user.displayName
        }
      })
    } catch (verifyError) {
      console.error('SIWE verification failed:', verifyError)
      return NextResponse.json(
        { error: 'Invalid signature or message' },
        { status: 401 }
      )
    }
  } catch (error) {
    console.error('Wallet login error:', error)
    return NextResponse.json(
      { error: 'Authentication failed' },
      { status: 500 }
    )
  }
}
