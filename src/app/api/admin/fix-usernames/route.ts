import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// Admin-only endpoint to fix user_ usernames
export async function POST(request: NextRequest) {
  try {
    const adminWallet = process.env.NEXT_PUBLIC_ADMIN_WALLET_ADDRESS

    // Check if user is admin
    const walletAddress = request.headers.get('x-wallet-address')
    if (!walletAddress || walletAddress.toLowerCase() !== adminWallet?.toLowerCase()) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Find all users with user_ usernames
    const usersToFix = await prisma.user.findMany({
      where: {
        username: {
          startsWith: 'user_'
        }
      }
    })

    console.log(`Found ${usersToFix.length} users with user_ usernames`)

    const results = []

    for (const user of usersToFix) {
      // If user has a wallet address, set username to wallet address
      if (user.walletAddress && user.walletAddress !== '') {
        console.log(`Fixing ${user.username} -> ${user.walletAddress}`)

        const updated = await prisma.user.update({
          where: { id: user.id },
          data: {
            username: user.walletAddress,
            displayName: user.displayName?.startsWith('Penguin ')
              ? `USER_${user.walletAddress.slice(-4).toUpperCase()}`
              : user.displayName
          }
        })

        results.push({
          id: user.id,
          oldUsername: user.username,
          newUsername: updated.username,
          newDisplayName: updated.displayName
        })
      }
    }

    return NextResponse.json({
      success: true,
      fixed: results.length,
      results
    })
  } catch (error) {
    console.error('Error fixing usernames:', error)
    return NextResponse.json(
      { error: 'Failed to fix usernames' },
      { status: 500 }
    )
  }
}
