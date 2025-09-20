import { NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export async function POST() {
  try {
    // Update PENGU token with correct address
    await prisma.token.updateMany({
      where: { symbol: 'PENGU' },
      data: {
        contractAddress: '0x9eBe3A824Ca958e4b3Da772D2065518F009CBa62',
        name: 'Penguin Token',
        logoUrl: '🐧'
      }
    })

    // Update JOCK token with correct address
    await prisma.token.updateMany({
      where: { symbol: 'JOCK' },
      data: {
        contractAddress: '0x3Bb6d7504d5c4B251799E5959f8336eAe6129Db1',
        name: 'Jock Rock',
        logoUrl: '🪨'
      }
    })

    console.log('Updated token addresses successfully')

    return NextResponse.json({
      message: 'Token addresses updated successfully'
    })

  } catch (error) {
    console.error('Failed to update tokens:', error)
    return NextResponse.json(
      { error: 'Failed to update tokens' },
      { status: 500 }
    )
  }
}