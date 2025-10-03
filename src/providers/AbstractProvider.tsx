'use client'

import { AbstractWalletProvider } from '@abstract-foundation/agw-react'
import { abstract } from 'viem/chains'
import { useEffect } from 'react'

export default function AbstractProvider({
  children,
}: {
  children: React.ReactNode
}) {
  // Prevent AGW from auto-querying eth_accounts on mount
  // This stops MetaMask from being triggered
  useEffect(() => {
    // Intercept the window.ethereum.request calls temporarily
    if (typeof window !== 'undefined' && (window as any).ethereum) {
      const originalRequest = (window as any).ethereum.request
      let intercepting = true

      ;(window as any).ethereum.request = function(args: any) {
        // Block eth_accounts calls during initial mount (first 500ms)
        if (intercepting && args.method === 'eth_accounts') {
          console.log('[AbstractProvider] Blocked eth_accounts auto-call on mount')
          return Promise.resolve([])
        }
        return originalRequest.call(this, args)
      }

      // Stop intercepting after mount phase
      const timer = setTimeout(() => {
        intercepting = false
        ;(window as any).ethereum.request = originalRequest
      }, 500)

      return () => {
        clearTimeout(timer)
        if ((window as any).ethereum) {
          ;(window as any).ethereum.request = originalRequest
        }
      }
    }
  }, [])

  return (
    <AbstractWalletProvider chain={abstract}>
      {children}
    </AbstractWalletProvider>
  )
}