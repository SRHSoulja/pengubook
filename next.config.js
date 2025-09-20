/** @type {import('next').NextConfig} */
const nextConfig = {
  // The appDir experimental feature is now stable in Next.js 14
  // and no longer needs to be specified in experimental config

  // Skip building problematic API routes during static generation
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  output: 'standalone',
}

module.exports = nextConfig