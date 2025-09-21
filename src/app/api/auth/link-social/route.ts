import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { PrismaClient } from '@prisma/client'

export async function POST(request: NextRequest) {
  try {
    const { walletAddress } = await request.json()

    if (!walletAddress) {
      return NextResponse.json(
        { error: 'Wallet address is required' },
        { status: 400 }
      )
    }

    // Get the current NextAuth session
    const session = await getServerSession()

    if (!session?.user) {
      return NextResponse.json(
        { error: 'No OAuth session found' },
        { status: 401 }
      )
    }

    const prisma = new PrismaClient()

    try {
      // Find the wallet user
      const walletUser = await prisma.user.findUnique({
        where: { walletAddress }
      })

      if (!walletUser) {
        return NextResponse.json(
          { error: 'Wallet user not found' },
          { status: 404 }
        )
      }

      // Find the OAuth accounts associated with the NextAuth session
      const oauthUser = await prisma.user.findUnique({
        where: { id: session.user.id }
      })

      if (!oauthUser) {
        return NextResponse.json(
          { error: 'OAuth user not found' },
          { status: 404 }
        )
      }

      // Get the OAuth accounts
      const accounts = await prisma.account.findMany({
        where: { userId: oauthUser.id }
      })

      // Update the wallet user with OAuth account information
      const updateData: any = {}

      for (const account of accounts) {
        if (account.provider === 'discord') {
          updateData.discordName = oauthUser.name || `Discord User ${account.providerAccountId}`
        } else if (account.provider === 'twitter') {
          updateData.twitterHandle = oauthUser.name || `@TwitterUser${account.providerAccountId}`
        }
      }

      if (Object.keys(updateData).length > 0) {
        await prisma.user.update({
          where: { walletAddress },
          data: updateData
        })
      }

      // Clean up: Delete the temporary OAuth user and its accounts
      await prisma.account.deleteMany({
        where: { userId: oauthUser.id }
      })

      await prisma.session.deleteMany({
        where: { userId: oauthUser.id }
      })

      await prisma.user.delete({
        where: { id: oauthUser.id }
      })

      await prisma.$disconnect()

      return NextResponse.json({
        success: true,
        message: 'Social accounts linked successfully',
        linkedAccounts: updateData
      })
    } catch (error) {
      console.error('Database error:', error)
      await prisma.$disconnect()
      return NextResponse.json(
        { error: 'Failed to link accounts' },
        { status: 500 }
      )
    }
  } catch (error) {
    console.error('Link social accounts error:', error)
    return NextResponse.json(
      { error: 'Failed to link social accounts' },
      { status: 500 }
    )
  }
}