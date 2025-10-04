import './globals.css'
import { Inter } from 'next/font/google'
import { SpeedInsights } from '@vercel/speed-insights/next'
import AbstractProvider from '@/providers/AbstractProvider'
import { AuthProvider } from '@/providers/AuthProvider'
import { ThemeProvider } from '@/providers/ThemeProvider'
import SessionProvider from '@/providers/SessionProvider'
import MobileBottomNav from '@/components/MobileBottomNav'
import ErrorBoundary from '@/components/ErrorBoundary'
import ClientErrorHandler from '@/components/ClientErrorHandler'
import StreakCheckerWrapper from '@/components/StreakCheckerWrapper'
import ThemeWrapper from '@/components/ThemeWrapper'
import Footer from '@/components/Footer'
import CookieConsent from '@/components/CookieConsent'

const inter = Inter({ subsets: ['latin'] })

const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://pebloq.gmgnrepeat.com'

export const metadata = {
  metadataBase: new URL(baseUrl),
  title: {
    default: 'PeBloq - Web3 Social Platform',
    template: '%s | PeBloq'
  },
  description: 'Decentralized social platform powered by Abstract Global Wallet with token tipping, communities, and encrypted messaging',
  keywords: ['web3', 'social', 'abstract', 'blockchain', 'crypto', 'pengu', 'tipping', 'AGW'],
  authors: [{ name: 'PeBloq Team' }],
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: baseUrl,
    siteName: 'PeBloq',
    title: 'PeBloq - Web3 Social Platform',
    description: 'Decentralized social platform powered by Abstract Global Wallet',
    images: [
      {
        url: 'https://gmgnrepeat.com/pebloq-og.png', // Your base OG image
        width: 1200,
        height: 630,
        alt: 'PeBloq - Web3 Social Platform',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'PeBloq - Web3 Social Platform',
    description: 'Decentralized social platform powered by Abstract Global Wallet',
    images: ['https://gmgnrepeat.com/pebloq-og.png'],
  },
  icons: {
    icon: `${baseUrl}/favicon.svg`,
    apple: `${baseUrl}/apple-touch-icon.png`,
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <ErrorBoundary>
          <ClientErrorHandler>
            <SessionProvider>
              <AbstractProvider>
                <AuthProvider>
                  <ThemeProvider>
                    <ThemeWrapper>
                      <div className="flex flex-col min-h-screen">
                        <StreakCheckerWrapper />
                        <main className="flex-1">
                          {children}
                        </main>
                        <Footer />
                        <MobileBottomNav />
                        <CookieConsent />
                      </div>
                    </ThemeWrapper>
                  </ThemeProvider>
                </AuthProvider>
              </AbstractProvider>
            </SessionProvider>
          </ClientErrorHandler>
        </ErrorBoundary>
        <SpeedInsights />
      </body>
    </html>
  )
}