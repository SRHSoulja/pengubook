'use client'

import { useEffect } from 'react'
import setupGlobalErrorHandlers from '@/lib/errorHandler'

export default function ClientErrorHandler({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    setupGlobalErrorHandlers()
  }, [])

  return <>{children}</>
}