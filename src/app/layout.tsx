import './globals.css'
import { Inter } from 'next/font/google'
import AbstractProvider from '@/providers/AbstractProvider'
import { AuthProvider } from '@/providers/AuthProvider'
import { ThemeProvider } from '@/providers/ThemeProvider'
import MobileBottomNav from '@/components/MobileBottomNav'

const inter = Inter({ subsets: ['latin'] })

export const metadata = {
  title: 'PenguBook',
  description: 'Social platform with AGW integration and Abstract token tipping',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <AbstractProvider>
          <AuthProvider>
            <ThemeProvider>
              {children}
              <MobileBottomNav />
            </ThemeProvider>
          </AuthProvider>
        </AbstractProvider>
      </body>
    </html>
  )
}