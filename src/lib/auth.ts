import { NextRequest } from 'next/server'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export interface AuthenticatedUser {
  id: string
  walletAddress: string
  username: string
  displayName: string
  level: number
  isBanned: boolean
}

export class AuthenticationError extends Error {
  constructor(message: string, public statusCode: number = 401) {
    super(message)
    this.name = 'AuthenticationError'
  }
}

export class AuthorizationError extends Error {
  constructor(message: string, public statusCode: number = 403) {
    super(message)
    this.name = 'AuthorizationError'
  }
}

export async function authenticateUser(request: NextRequest): Promise<AuthenticatedUser> {
  // Get wallet address from header (for Abstract Global Wallet)
  const walletAddress = request.headers.get('x-wallet-address')

  if (!walletAddress) {
    throw new AuthenticationError('Authentication required - wallet address not provided')
  }

  // Validate wallet address format (basic Ethereum address validation)
  if (!/^0x[a-fA-F0-9]{40}$/.test(walletAddress)) {
    throw new AuthenticationError('Invalid wallet address format')
  }

  // Get user from database
  const user = await prisma.user.findUnique({
    where: { walletAddress: walletAddress.toLowerCase() },
    select: {
      id: true,
      walletAddress: true,
      username: true,
      displayName: true,
      level: true,
      isBanned: true
    }
  })

  if (!user) {
    throw new AuthenticationError('User not found')
  }

  if (user.isBanned) {
    throw new AuthorizationError('Account banned')
  }

  return user
}

export async function getUserFromBody(body: any): Promise<string> {
  const userId = body.userId

  if (!userId) {
    throw new AuthenticationError('User ID is required in request body')
  }

  if (typeof userId !== 'string' || userId.trim().length === 0) {
    throw new AuthenticationError('Invalid user ID format')
  }

  // Verify user exists and is not banned
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, isBanned: true }
  })

  if (!user) {
    throw new AuthenticationError('User not found')
  }

  if (user.isBanned) {
    throw new AuthorizationError('Account banned')
  }

  return userId
}

export async function checkCommunityPermission(
  userId: string,
  communityId: string,
  requiredRoles: string[]
): Promise<void> {
  const membership = await prisma.communityMember.findUnique({
    where: {
      userId_communityId: {
        userId,
        communityId
      }
    },
    select: { role: true }
  })

  if (!membership) {
    throw new AuthorizationError('You are not a member of this community')
  }

  if (!requiredRoles.includes(membership.role)) {
    throw new AuthorizationError('Insufficient permissions for this action')
  }
}

export async function checkCommunityOwnership(
  userId: string,
  communityId: string
): Promise<void> {
  const community = await prisma.community.findUnique({
    where: { id: communityId },
    select: { creatorId: true }
  })

  if (!community) {
    throw new AuthenticationError('Community not found')
  }

  if (community.creatorId !== userId) {
    throw new AuthorizationError('Only the community creator can perform this action')
  }
}

export function validateInput(input: any, fieldName: string, maxLength: number = 255): string {
  if (!input || typeof input !== 'string') {
    throw new AuthenticationError(`${fieldName} is required and must be a string`)
  }

  const trimmed = input.trim()
  if (trimmed.length === 0) {
    throw new AuthenticationError(`${fieldName} cannot be empty`)
  }

  if (trimmed.length > maxLength) {
    throw new AuthenticationError(`${fieldName} cannot exceed ${maxLength} characters`)
  }

  // Basic XSS prevention - remove potentially dangerous characters
  const sanitized = trimmed
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<[^>]*>/g, '')

  return sanitized
}

export function validateArrayInput(input: any, fieldName: string, maxItems: number = 10): string[] {
  if (!Array.isArray(input)) {
    throw new AuthenticationError(`${fieldName} must be an array`)
  }

  if (input.length > maxItems) {
    throw new AuthenticationError(`${fieldName} cannot exceed ${maxItems} items`)
  }

  return input.map((item, index) => {
    if (typeof item !== 'string') {
      throw new AuthenticationError(`${fieldName}[${index}] must be a string`)
    }
    return validateInput(item, `${fieldName}[${index}]`, 50)
  })
}