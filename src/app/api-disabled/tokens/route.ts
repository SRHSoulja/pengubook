import { NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export async function GET() {
  try {
    const tokens = await prisma.token.findMany({
      where: { isEnabled: true },
      orderBy: { symbol: 'asc' }
    })

    return NextResponse.json({ tokens })
  } catch (error) {
    console.error('Failed to fetch tokens:', error)
    return NextResponse.json(
      { error: 'Failed to fetch tokens' },
      { status: 500 }
    )
  }
}