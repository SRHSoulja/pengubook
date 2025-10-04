import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

// Handle contact form submissions
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, email, subject, message, type, userId } = body

    if (!name || !email || !subject || !message) {
      return NextResponse.json(
        { error: 'All fields are required' },
        { status: 400 }
      )
    }

    // Store contact submission in database
    const submission = await prisma.contactSubmission.create({
      data: {
        userId: userId || null,
        name,
        email,
        subject,
        message,
        type: type || 'other',
        status: 'PENDING'
      }
    })

    console.log('[Contact Form] Submission created:', {
      id: submission.id,
      type: submission.type,
      userId: userId || 'anonymous',
      timestamp: submission.createdAt
    })

    // TODO: Send email notification to admin

    return NextResponse.json({
      success: true,
      message: 'Contact form submitted successfully',
      submissionId: submission.id
    })
  } catch (error) {
    console.error('Contact form error:', error)
    return NextResponse.json(
      { error: 'Failed to submit contact form' },
      { status: 500 }
    )
  }
}
