import { NextRequest, NextResponse } from "next/server"
import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

export async function GET(
  request: NextRequest,
  { params }: { params: { userId: string } }
) {
  try {
    // Get accepted friendships where user is either initiator or receiver
    const friendships = await prisma.friendship.findMany({
      where: {
        OR: [
          { initiatorId: params.userId, status: "ACCEPTED" },
          { receiverId: params.userId, status: "ACCEPTED" }
        ]
      },
      include: {
        initiator: {
          include: {
            profile: true
          }
        },
        receiver: {
          include: {
            profile: true
          }
        }
      }
    })

    // Extract the friend (the other user in each friendship)
    const friends = friendships.map(friendship => {
      const friend = friendship.initiatorId === params.userId 
        ? friendship.receiver 
        : friendship.initiator
        
      return {
        id: friend.id,
        username: friend.username,
        displayName: friend.displayName,
        avatar: friend.avatar,
        level: friend.level,
        isOnline: friend.isOnline,
        lastSeen: friend.lastSeen,
        profile: {
          profileVerified: friend.profile?.profileVerified || false,
          followersCount: friend.profile?.followersCount || 0,
          postsCount: friend.profile?.postsCount || 0
        }
      }
    })

    return NextResponse.json({
      success: true,
      data: friends
    })
  } catch (error) {
    console.error("Error fetching friends:", error)
    return NextResponse.json(
      { error: "Failed to fetch friends" },
      { status: 500 }
    )
  }
}
