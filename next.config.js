/** @type {import('next').NextConfig} */
const nextConfig = {
  // The appDir experimental feature is now stable in Next.js 14
  // and no longer needs to be specified in experimental config

  output: 'standalone',

  // Security headers for production hardening
  async headers() {
    const isDev = process.env.NODE_ENV !== 'production'

    return [
      {
        // Apply security headers to all routes
        source: '/:path*',
        headers: isDev ? [
          // Relaxed CSP for development
          {
            key: 'Content-Security-Policy',
            value: "default-src * 'unsafe-inline' 'unsafe-eval' data: blob:; script-src * 'unsafe-inline' 'unsafe-eval'; style-src * 'unsafe-inline'; connect-src *;"
          }
        ] : [
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'on'
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload'
          },
          {
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN'
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff'
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block'
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin'
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=(), payment=()'
          },
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://abstract-global-wallet.com https://cdn.jsdelivr.net https://va.vercel-scripts.com https://*.vercel-scripts.com",
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
              "img-src 'self' data: blob: https: http:",
              "font-src 'self' data: https://fonts.gstatic.com",
              "connect-src 'self' https://api.pebloq.gmgnrepeat.com https://api.mainnet.abs.xyz https://api.testnet.abs.xyz https://abstract-global-wallet.com wss://api.mainnet.abs.xyz wss://api.testnet.abs.xyz https://*.neon.tech wss://*.pusher.com https://api.cloudinary.com https://auth.privy.io https://*.privy.io https://vitals.vercel-insights.com https://*.vercel-insights.com",
              "media-src 'self' https://res.cloudinary.com blob: data:",
              "object-src 'none'",
              "base-uri 'self'",
              "form-action 'self'",
              "frame-ancestors 'self'",
              "upgrade-insecure-requests"
            ].join('; ')
          }
        ]
      }
    ]
  }
}

module.exports = nextConfig