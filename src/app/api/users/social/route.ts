import { NextRequest, NextResponse } from "next/server"
import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

export async function POST(request: NextRequest) {
  try {
    const { walletAddress, discordName, twitterHandle } = await request.json()

    if (!walletAddress) {
      return NextResponse.json(
        { error: "Wallet address is required" },
        { status: 400 }
      )
    }

    // Update user's social accounts
    const user = await prisma.user.update({
      where: { walletAddress },
      data: {
        discordName: discordName || null,
        twitterHandle: twitterHandle || null
      }
    })

    return NextResponse.json({
      success: true,
      message: "Social accounts updated successfully",
      user
    })
  } catch (error) {
    console.error("Error updating social accounts:", error)
    return NextResponse.json(
      { error: "Failed to update social accounts" },
      { status: 500 }
    )
  }
}
