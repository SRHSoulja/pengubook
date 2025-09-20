import { NextRequest, NextResponse } from 'next/server'
import { writeFile, mkdir } from 'fs/promises'
import { join } from 'path'
import { existsSync } from 'fs'
import { v4 as uuidv4 } from 'uuid'
import { rateLimiters, RateLimitError } from '@/lib/rateLimit'
import { authenticateUserSecure, AuthenticationError, AuthorizationError } from '@/lib/auth/secure'
import { withEnhancedCSRFProtection } from '@/lib/csrf'
import crypto from 'crypto'

const ALLOWED_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'image/gif',
  'video/mp4',
  'video/webm',
  'video/quicktime'
]

const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB

// Security: File signature validation to prevent malicious file uploads
const FILE_SIGNATURES = {
  'image/jpeg': [Buffer.from([0xFF, 0xD8, 0xFF])],
  'image/png': [Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A])],
  'image/gif': [Buffer.from([0x47, 0x49, 0x46, 0x38, 0x37, 0x61]), Buffer.from([0x47, 0x49, 0x46, 0x38, 0x39, 0x61])],
  'image/webp': [Buffer.from([0x52, 0x49, 0x46, 0x46])],
  'video/mp4': [Buffer.from([0x00, 0x00, 0x00, 0x18, 0x66, 0x74, 0x79, 0x70]), Buffer.from([0x00, 0x00, 0x00, 0x20, 0x66, 0x74, 0x79, 0x70])]
}

// Suspicious patterns that might indicate malicious content
const MALICIOUS_PATTERNS = [
  Buffer.from('<?php'),
  Buffer.from('<script'),
  Buffer.from('javascript:'),
  Buffer.from('<iframe'),
  Buffer.from('eval('),
  Buffer.from('exec('),
  Buffer.from('system('),
  Buffer.from('shell_exec')
]

function validateFileSignature(buffer: Buffer, mimeType: string): boolean {
  const signatures = FILE_SIGNATURES[mimeType as keyof typeof FILE_SIGNATURES]
  if (!signatures) return false

  return signatures.some(signature =>
    buffer.subarray(0, signature.length).equals(signature)
  )
}

function scanForMaliciousContent(buffer: Buffer): boolean {
  return MALICIOUS_PATTERNS.some(pattern => buffer.includes(pattern))
}

function generateSecureFileName(originalName: string, userId: string): string {
  const fileExtension = originalName.split('.').pop()?.toLowerCase() || 'bin'
  const timestamp = Date.now()
  const randomBytes = crypto.randomBytes(8).toString('hex')
  const userHash = crypto.createHash('sha256').update(userId).digest('hex').substring(0, 8)

  return `${userHash}_${timestamp}_${randomBytes}.${fileExtension}`
}

const postHandler = async (request: NextRequest) => {
  try {
    // Apply rate limiting for uploads
    rateLimiters.writeOperations(request)

    // Authenticate user
    const user = await authenticateUserSecure(request)

    const data = await request.formData()
    const file: File | null = data.get('file') as unknown as File
    const uploadType = data.get('type') as string || 'general'

    if (!file) {
      return NextResponse.json(
        { error: 'No file uploaded' },
        { status: 400 }
      )
    }

    // Validate upload type
    const allowedUploadTypes = ['avatar', 'banner', 'post-media', 'message-media', 'general']
    if (!allowedUploadTypes.includes(uploadType)) {
      return NextResponse.json(
        { error: 'Invalid upload type' },
        { status: 400 }
      )
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: 'File size too large. Maximum size is 10MB.' },
        { status: 400 }
      )
    }

    // Validate file type
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: 'File type not supported. Allowed types: images and videos.' },
        { status: 400 }
      )
    }

    // Convert file to buffer for security scanning
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    // Security: Validate file signature matches MIME type
    if (!validateFileSignature(buffer, file.type)) {
      return NextResponse.json(
        { error: 'File signature does not match declared type. Potential security threat detected.' },
        { status: 400 }
      )
    }

    // Security: Scan for malicious content patterns
    if (scanForMaliciousContent(buffer)) {
      return NextResponse.json(
        { error: 'Malicious content detected in file. Upload rejected.' },
        { status: 400 }
      )
    }

    // Generate secure filename with user context
    const fileName = generateSecureFileName(file.name, user.id)

    // Create upload directory based on type
    const uploadDir = join(process.cwd(), 'public', 'uploads', uploadType)
    if (!existsSync(uploadDir)) {
      await mkdir(uploadDir, { recursive: true })
    }

    // Save the already-converted buffer
    const filePath = join(uploadDir, fileName)
    await writeFile(filePath, buffer)

    // Return the public URL
    const fileUrl = `/uploads/${uploadType}/${fileName}`

    return NextResponse.json({
      success: true,
      data: {
        url: fileUrl,
        fileName: fileName,
        fileSize: file.size,
        fileType: file.type,
        uploadType: uploadType,
        uploadedBy: user.id,
        uploadedAt: new Date().toISOString()
      }
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
        { error: 'Too many upload requests' },
        {
          status: 429,
          headers: { 'Retry-After': error.retryAfter.toString() }
        }
      )
    }

    console.error('Upload error:', error)
    return NextResponse.json(
      { error: 'Failed to upload file' },
      { status: 500 }
    )
  }
}

// GET - Upload endpoint info (with authentication)
const getHandler = async (request: NextRequest) => {
  try {
    // Authenticate user
    const user = await authenticateUserSecure(request)

    const searchParams = request.nextUrl.searchParams
    const type = searchParams.get('type') || 'general'

    return NextResponse.json({
      success: true,
      data: {
        message: 'Upload endpoint is ready',
        allowedTypes: ALLOWED_TYPES,
        maxFileSize: `${MAX_FILE_SIZE / 1024 / 1024}MB`,
        allowedUploadTypes: ['avatar', 'banner', 'post-media', 'message-media', 'general'],
        user: {
          id: user.id,
          username: user.username
        }
      }
    })
  } catch (error) {
    if (error instanceof AuthenticationError || error instanceof AuthorizationError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.statusCode }
      )
    }

    console.error('Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export const POST = withEnhancedCSRFProtection(postHandler)
export const GET = withEnhancedCSRFProtection(getHandler)