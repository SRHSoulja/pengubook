import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import {
  getUserFromBody,
  validateInput,
  AuthenticationError,
  AuthorizationError
} from '@/lib/auth'
import { rateLimiters, RateLimitError } from '@/lib/rateLimit'

const prisma = new PrismaClient()

// POST - Upload user's public key
export async function POST(request: NextRequest) {
  try {
    rateLimiters.writeOperations(request)

    const body = await request.json()
    const userId = await getUserFromBody(body)

    // Validate public key
    const publicKey = validateInput(body.publicKey, 'Public key', 2048)

    // Verify user exists
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true }
    })

    if (!user) {
      throw new AuthenticationError('User not found')
    }

    // Update user's public key
    await prisma.user.update({
      where: { id: userId },
      data: { publicKey }
    })

    return NextResponse.json({
      success: true,
      message: 'Public key uploaded successfully'
    })
  } catch (error) {
    if (error instanceof AuthenticationError || error instanceof AuthorizationError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.statusCode }
      )
    }

    if (error instanceof RateLimitError) {
      return NextResponse.json(
        { error: 'Too many requests' },
        {
          status: 429,
          headers: { 'Retry-After': error.retryAfter.toString() }
        }
      )
    }

    console.error('Error uploading public key:', error)
    return NextResponse.json(
      { error: 'Failed to upload public key' },
      { status: 500 }
    )
  }
}

// DELETE - Remove user's public key
export async function DELETE(request: NextRequest) {
  try {
    rateLimiters.writeOperations(request)

    const body = await request.json()
    const userId = await getUserFromBody(body)

    // Verify user exists
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true }
    })

    if (!user) {
      throw new AuthenticationError('User not found')
    }

    // Remove user's public key
    await prisma.user.update({
      where: { id: userId },
      data: { publicKey: null }
    })

    return NextResponse.json({
      success: true,
      message: 'Public key removed successfully'
    })
  } catch (error) {
    if (error instanceof AuthenticationError || error instanceof AuthorizationError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.statusCode }
      )
    }

    if (error instanceof RateLimitError) {
      return NextResponse.json(
        { error: 'Too many requests' },
        {
          status: 429,
          headers: { 'Retry-After': error.retryAfter.toString() }
        }
      )
    }

    console.error('Error removing public key:', error)
    return NextResponse.json(
      { error: 'Failed to remove public key' },
      { status: 500 }
    )
  }
}