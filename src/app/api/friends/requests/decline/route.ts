import { NextRequest, NextResponse } from "next/server"
import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

export async function POST(request: NextRequest) {
  try {
    const { requestId } = await request.json()

    if (!requestId) {
      return NextResponse.json(
        { error: "Request ID is required" },
        { status: 400 }
      )
    }

    // Delete the friendship request (decline by removing it)
    await prisma.friendship.delete({
      where: { id: requestId }
    })

    return NextResponse.json({
      success: true,
      message: "Friend request declined"
    })
  } catch (error) {
    console.error("Error declining friend request:", error)
    return NextResponse.json(
      { error: "Failed to decline friend request" },
      { status: 500 }
    )
  }
}