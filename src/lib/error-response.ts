import { NextResponse } from 'next/server'

/**
 * Error response utility for API endpoints
 *
 * SECURITY: In production, hides sensitive error details to prevent information disclosure
 * Development: Shows full error details for debugging
 */

interface ErrorResponseOptions {
  error: string
  details?: string
  status?: number
  logError?: boolean
}

/**
 * Create a standardized error response
 * - In production: Hides stack traces and sensitive details
 * - In development: Shows full error information
 */
export function errorResponse(options: ErrorResponseOptions): NextResponse {
  const {
    error,
    details,
    status = 500,
    logError = true
  } = options

  const isProduction = process.env.NODE_ENV === 'production'

  // Log error server-side (always)
  if (logError) {
    console.error('[API Error]', {
      error,
      details: details?.substring(0, 200),
      status,
      timestamp: new Date().toISOString()
    })
  }

  // SECURITY: In production, sanitize error details
  const sanitizedDetails = isProduction
    ? undefined // Hide all details in production
    : details // Show details in development

  return NextResponse.json(
    {
      error,
      ...(sanitizedDetails && { details: sanitizedDetails }),
      timestamp: new Date().toISOString()
    },
    { status }
  )
}

/**
 * Common error responses
 */
export const ErrorResponses = {
  unauthorized: (details?: string) =>
    errorResponse({
      error: 'Unauthorized',
      details,
      status: 401
    }),

  forbidden: (details?: string) =>
    errorResponse({
      error: 'Forbidden',
      details,
      status: 403
    }),

  notFound: (resource: string = 'Resource') =>
    errorResponse({
      error: `${resource} not found`,
      status: 404
    }),

  badRequest: (message: string, details?: string) =>
    errorResponse({
      error: message,
      details,
      status: 400
    }),

  rateLimited: (retryAfter?: number) =>
    NextResponse.json(
      {
        error: 'Rate limit exceeded',
        ...(retryAfter && { retryAfter }),
        timestamp: new Date().toISOString()
      },
      {
        status: 429,
        headers: retryAfter
          ? { 'Retry-After': retryAfter.toString() }
          : undefined
      }
    ),

  internalError: (details?: string) =>
    errorResponse({
      error: 'Internal server error',
      details,
      status: 500
    }),

  serviceUnavailable: (details?: string) =>
    errorResponse({
      error: 'Service temporarily unavailable',
      details,
      status: 503
    })
}

/**
 * Sanitize error for client response
 * Removes stack traces and sensitive information in production
 */
export function sanitizeError(error: any): string {
  const isProduction = process.env.NODE_ENV === 'production'

  if (isProduction) {
    // In production, only return generic message
    return 'An error occurred'
  }

  // In development, return error message (but not full stack)
  if (error instanceof Error) {
    return error.message
  }

  if (typeof error === 'string') {
    return error
  }

  return 'Unknown error'
}
