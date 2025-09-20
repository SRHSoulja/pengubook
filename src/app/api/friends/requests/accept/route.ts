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

    // Update friendship status to ACCEPTED
    await prisma.friendship.update({
      where: { id: requestId },
      data: {
        status: "ACCEPTED"
      }
    })

    return NextResponse.json({
      success: true,
      message: "Friend request accepted"
    })
  } catch (error) {
    console.error("Error accepting friend request:", error)
    return NextResponse.json(
      { error: "Failed to accept friend request" },
      { status: 500 }
    )
  }
}