import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withAdminAuth } from '@/lib/auth-middleware'
import { logger } from '@/lib/logger'

export const dynamic = 'force-dynamic'

/**
 * OPERATIONS: Incident Tracking & Response API
 *
 * Track security incidents, anomalies, and response actions.
 * Admin-only endpoint for incident management.
 */

/**
 * GET /api/incidents
 * List all incidents with filtering
 */
export const GET = withAdminAuth(async (request: NextRequest) => {
  const searchParams = request.nextUrl.searchParams
  const severity = searchParams.get('severity')
  const status = searchParams.get('status')
  const limit = parseInt(searchParams.get('limit') || '50')
  const offset = parseInt(searchParams.get('offset') || '0')

  try {
    const where: any = {}
    if (severity) where.severity = severity
    if (status) where.status = status

    const [incidents, total] = await Promise.all([
      prisma.securityIncident.findMany({
        where,
        take: limit,
        skip: offset,
        orderBy: { createdAt: 'desc' },
        include: {
          reporter: {
            select: { id: true, username: true, displayName: true }
          }
        }
      }),
      prisma.securityIncident.count({ where })
    ])

    return NextResponse.json({
      success: true,
      incidents,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + limit < total
      }
    })
  } catch (error: any) {
    logger.error('Failed to fetch incidents', {
      error: error.message
    }, { component: 'INCIDENTS' })

    return NextResponse.json(
      { error: 'Failed to fetch incidents' },
      { status: 500 }
    )
  }
})

/**
 * POST /api/incidents
 * Create new incident report
 */
export const POST = withAdminAuth(async (request: NextRequest, user: any) => {
  try {
    const body = await request.json()
    const { title, description, severity, type, metadata } = body

    if (!title || !description || !severity || !type) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    const incident = await prisma.securityIncident.create({
      data: {
        title,
        description,
        severity,
        type,
        status: 'open',
        reporterId: user.id,
        metadata: metadata ? JSON.stringify(metadata) : null
      },
      include: {
        reporter: {
          select: { id: true, username: true, displayName: true }
        }
      }
    })

    logger.info('Security incident created', {
      incidentId: incident.id,
      severity,
      type
    }, { component: 'INCIDENTS' })

    return NextResponse.json({
      success: true,
      incident
    }, { status: 201 })
  } catch (error: any) {
    logger.error('Failed to create incident', {
      error: error.message
    }, { component: 'INCIDENTS' })

    return NextResponse.json(
      { error: 'Failed to create incident' },
      { status: 500 }
    )
  }
})
