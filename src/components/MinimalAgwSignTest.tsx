'use client'
import { useAbstractClient } from '@abstract-foundation/agw-react'
import { useToast } from '@/components/ui/Toast'

export default function MinimalAgwSignTest() {
  const { data: agw } = useAbstractClient()
  const { success, error } = useToast()

  return (
    <div style={{padding:12,border:'1px solid #ddd',marginTop:12}}>
      <div>addr: {agw?.account?.address || '(none)'} </div>
      <button
        onClick={async () => {
          try {
            if (!agw?.account?.address) return error('No AGW address')
            await new Promise(r=>setTimeout(r,700)) // settle
            const msg = JSON.stringify({ domain: location.hostname, nonce: `${Date.now()}` })
            const sig = await agw.signMessage!({ message: msg })
            success('OK: ' + sig.slice(0,14) + '…')
          } catch (e:any) {
            console.error('sign failed', e)
            error('FAIL: ' + (e?.message || e))
          }
        }}
      >
        Test AGW sign
      </button>
    </div>
  )
}
