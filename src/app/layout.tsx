import './globals.css'
import { Inter } from 'next/font/google'
import AbstractProvider from '@/providers/AbstractProvider'
import { AuthProvider } from '@/providers/AuthProvider'
import { ThemeProvider } from '@/providers/ThemeProvider'
import SessionProvider from '@/providers/SessionProvider'
import MobileBottomNav from '@/components/MobileBottomNav'
import ErrorBoundary from '@/components/ErrorBoundary'
import ClientErrorHandler from '@/components/ClientErrorHandler'
import StreakCheckerWrapper from '@/components/StreakCheckerWrapper'

const inter = Inter({ subsets: ['latin'] })

export const metadata = {
  title: 'PenguBook',
  description: 'Social platform with AGW integration and Abstract token tipping',
  icons: {
    icon: '/favicon.svg',
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
                    <StreakCheckerWrapper />
                    {children}
                    <MobileBottomNav />
                  </ThemeProvider>
                </AuthProvider>
              </AbstractProvider>
            </SessionProvider>
          </ClientErrorHandler>
        </ErrorBoundary>
      </body>
    </html>
  )
}