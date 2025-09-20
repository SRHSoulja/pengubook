import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { isBanned } = await request.json()
    const userId = params.id

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { isBanned },
      select: {
        id: true,
        username: true,
        displayName: true,
        isBanned: true,
      }
    })

    return NextResponse.json(updatedUser)
  } catch (error) {
    console.error('Failed to update user ban status:', error)
    return NextResponse.json(
      { error: 'Failed to update user ban status' },
      { status: 500 }
    )
  }
}