import { NextRequest, NextResponse } from "next/server"
import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

export async function GET(
  request: NextRequest,
  { params }: { params: { userId: string } }
) {
  try {
    // Get pending friend requests where user is either initiator or receiver
    const requests = await prisma.friendship.findMany({
      where: {
        OR: [
          { initiatorId: params.userId, status: "PENDING" },
          { receiverId: params.userId, status: "PENDING" }
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
      },
      orderBy: {
        createdAt: "desc"
      }
    })

    const formattedRequests = requests.map(request => ({
      id: request.id,
      status: request.status,
      createdAt: request.createdAt,
      initiator: {
        id: request.initiator.id,
        username: request.initiator.username,
        displayName: request.initiator.displayName,
        avatar: request.initiator.avatar,
        level: request.initiator.level,
        profile: {
          profileVerified: request.initiator.profile?.profileVerified || false
        }
      },
      receiver: {
        id: request.receiver.id,
        username: request.receiver.username,
        displayName: request.receiver.displayName,
        avatar: request.receiver.avatar,
        level: request.receiver.level,
        profile: {
          profileVerified: request.receiver.profile?.profileVerified || false
        }
      }
    }))

    return NextResponse.json({
      success: true,
      data: formattedRequests
    })
  } catch (error) {
    console.error("Error fetching friend requests:", error)
    return NextResponse.json(
      { error: "Failed to fetch friend requests" },
      { status: 500 }
    )
  }
}
