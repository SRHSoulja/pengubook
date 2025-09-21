import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { withAdminAuth, withRateLimit } from '@/lib/auth-middleware'
import { logger, logAPI } from '@/lib/logger'

export const dynamic = 'force-dynamic'

// Update token (admin only)
export const PUT = withRateLimit(20, 60 * 1000)(withAdminAuth(async (request: NextRequest, user: any, { params }: { params: { id: string } }) => {
  try {
    const { id } = params
    const body = await request.json()
    const { name, symbol, contractAddress, decimals, logoUrl, isEnabled } = body

    logAPI.request('tokens/update', { tokenId: id, updatedBy: user.id.slice(0, 8) + '...' })

    const prisma = new PrismaClient()

    // Check if token exists
    const existingToken = await prisma.token.findUnique({
      where: { id }
    })

    if (!existingToken) {
      await prisma.$disconnect()
      return NextResponse.json(
        { error: 'Token not found' },
        { status: 404 }
      )
    }

    // Prepare update data
    const updateData: any = {}

    if (name !== undefined) updateData.name = name.trim()
    if (symbol !== undefined) updateData.symbol = symbol.toUpperCase().trim()
    if (contractAddress !== undefined) {
      // Validate contract address format
      if (!/^0x[a-fA-F0-9]{40}$/.test(contractAddress)) {
        await prisma.$disconnect()
        return NextResponse.json(
          { error: 'Invalid contract address format' },
          { status: 400 }
        )
      }
      updateData.contractAddress = contractAddress.toLowerCase()
    }
    if (decimals !== undefined) {
      if (decimals < 0 || decimals > 18) {
        await prisma.$disconnect()
        return NextResponse.json(
          { error: 'Decimals must be between 0 and 18' },
          { status: 400 }
        )
      }
      updateData.decimals = parseInt(decimals)
    }
    if (logoUrl !== undefined) updateData.logoUrl = logoUrl?.trim() || null
    if (isEnabled !== undefined) updateData.isEnabled = Boolean(isEnabled)

    // Check for duplicate symbol or contract address (excluding current token)
    if (updateData.symbol || updateData.contractAddress) {
      const duplicateCheck: any = {
        NOT: { id }
      }

      if (updateData.symbol || updateData.contractAddress) {
        duplicateCheck.OR = []
        if (updateData.symbol) duplicateCheck.OR.push({ symbol: updateData.symbol })
        if (updateData.contractAddress) duplicateCheck.OR.push({ contractAddress: updateData.contractAddress })
      }

      const duplicateToken = await prisma.token.findFirst({
        where: duplicateCheck
      })

      if (duplicateToken) {
        await prisma.$disconnect()
        return NextResponse.json(
          { error: 'Token with this symbol or contract address already exists' },
          { status: 409 }
        )
      }
    }

    // Update token
    const updatedToken = await prisma.token.update({
      where: { id },
      data: updateData
    })

    await prisma.$disconnect()

    logger.info(`Token updated: ${updatedToken.symbol}`, {
      tokenId: updatedToken.id,
      changes: Object.keys(updateData),
      updatedBy: user.id
    }, 'TokenManagement')

    return NextResponse.json({
      success: true,
      token: {
        id: updatedToken.id,
        name: updatedToken.name,
        symbol: updatedToken.symbol,
        contractAddress: updatedToken.contractAddress,
        decimals: updatedToken.decimals,
        isEnabled: updatedToken.isEnabled,
        logoUrl: updatedToken.logoUrl
      }
    })

  } catch (error: any) {
    logAPI.error('tokens/update', error)
    return NextResponse.json(
      { error: 'Failed to update token', details: error.message },
      { status: 500 }
    )
  }
}))

// Delete token (admin only)
export const DELETE = withRateLimit(10, 60 * 1000)(withAdminAuth(async (request: NextRequest, user: any, { params }: { params: { id: string } }) => {
  try {
    const { id } = params

    logAPI.request('tokens/delete', { tokenId: id, deletedBy: user.id.slice(0, 8) + '...' })

    const prisma = new PrismaClient()

    // Check if token exists
    const existingToken = await prisma.token.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            tips: true
          }
        }
      }
    })

    if (!existingToken) {
      await prisma.$disconnect()
      return NextResponse.json(
        { error: 'Token not found' },
        { status: 404 }
      )
    }

    // Check if token has been used in tips
    if (existingToken._count.tips > 0) {
      await prisma.$disconnect()
      return NextResponse.json(
        { error: `Cannot delete token that has been used in ${existingToken._count.tips} tip(s). Disable it instead.` },
        { status: 400 }
      )
    }

    // Delete token
    await prisma.token.delete({
      where: { id }
    })

    await prisma.$disconnect()

    logger.info(`Token deleted: ${existingToken.symbol}`, {
      tokenId: existingToken.id,
      tokenSymbol: existingToken.symbol,
      deletedBy: user.id
    }, 'TokenManagement')

    return NextResponse.json({
      success: true,
      message: `Token "${existingToken.symbol}" deleted successfully`
    })

  } catch (error: any) {
    logAPI.error('tokens/delete', error)
    return NextResponse.json(
      { error: 'Failed to delete token', details: error.message },
      { status: 500 }
    )
  }
}))