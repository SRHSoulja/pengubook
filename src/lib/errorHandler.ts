'use client'

export function setupGlobalErrorHandlers() {
  if (typeof window === 'undefined') {
    return
  }

  // Handle unhandled promise rejections
  window.addEventListener('unhandledrejection', (event) => {
    console.error('[GlobalError] Unhandled promise rejection:', {
      reason: event.reason,
      promise: event.promise,
      message: event.reason?.message || 'Unknown error',
      stack: event.reason?.stack?.split('\n').slice(0, 5).join('\n'),
      timestamp: new Date().toISOString()
    })
  })

  // Handle general errors
  window.addEventListener('error', (event) => {
    console.error('[GlobalError] Uncaught error:', {
      message: event.message,
      filename: event.filename,
      lineno: event.lineno,
      colno: event.colno,
      error: event.error?.stack?.split('\n').slice(0, 5).join('\n'),
      timestamp: new Date().toISOString()
    })
  })

  // Log navigation errors
  if ('navigation' in window) {
    ;(window as any).navigation?.addEventListener('navigateerror', (event: any) => {
      console.error('[GlobalError] Navigation error:', {
        message: event.message,
        error: event.error,
        timestamp: new Date().toISOString()
      })
    })
  }

  // Log network errors for OAuth/API calls
  const originalFetch = window.fetch
  window.fetch = async function(...args) {
    const [url, options] = args
    const urlString = typeof url === 'string' ? url : url.toString()

    try {
      const response = await originalFetch.apply(this, args)

      // Log OAuth and auth-related requests
      if (urlString.includes('/auth/') || urlString.includes('oauth') || urlString.includes('callback')) {
        console.log('[Network] Auth request:', {
          url: urlString,
          method: options?.method || 'GET',
          status: response.status,
          ok: response.ok,
          timestamp: new Date().toISOString()
        })

        // Log error responses
        if (!response.ok) {
          const clonedResponse = response.clone()
          try {
            const errorBody = await clonedResponse.text()
            console.error('[Network] Auth request failed:', {
              url: urlString,
              status: response.status,
              statusText: response.statusText,
              body: errorBody.slice(0, 500),
              timestamp: new Date().toISOString()
            })
          } catch (e) {
            // Ignore if we can't read the body
          }
        }
      }

      return response
    } catch (error: any) {
      // Log network errors for auth endpoints
      if (urlString.includes('/auth/') || urlString.includes('oauth') || urlString.includes('callback')) {
        console.error('[Network] Auth request error:', {
          url: urlString,
          error: error.message,
          stack: error.stack?.split('\n').slice(0, 3).join('\n'),
          timestamp: new Date().toISOString()
        })
      }
      throw error
    }
  }

  console.log('[ErrorHandler] Global error handlers initialized')
}

// Export for use in client components
export default setupGlobalErrorHandlers