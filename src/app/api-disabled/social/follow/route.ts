import { NextRequest, NextResponse } from "next/server"
import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

export async function POST(request: NextRequest) {
  try {
    const { followerId, followingId } = await request.json()

    if (!followerId || !followingId) {
      return NextResponse.json(
        { error: "Follower ID and Following ID are required" },
        { status: 400 }
      )
    }

    if (followerId === followingId) {
      return NextResponse.json(
        { error: "Cannot follow yourself" },
        { status: 400 }
      )
    }

    // Check if already following
    const existingFollow = await prisma.follow.findUnique({
      where: {
        followerId_followingId: {
          followerId,
          followingId
        }
      }
    })

    if (existingFollow) {
      return NextResponse.json(
        { error: "Already following this user" },
        { status: 400 }
      )
    }

    // Create follow relationship
    await prisma.follow.create({
      data: {
        followerId,
        followingId
      }
    })

    // Update follower counts
    await Promise.all([
      prisma.profile.update({
        where: { userId: followingId },
        data: { followersCount: { increment: 1 } }
      }),
      prisma.profile.update({
        where: { userId: followerId },
        data: { followingCount: { increment: 1 } }
      })
    ])

    return NextResponse.json({
      success: true,
      message: "Successfully followed user!"
    })
  } catch (error) {
    console.error("Error following user:", error)
    return NextResponse.json(
      { error: "Failed to follow user" },
      { status: 500 }
    )
  }
}
