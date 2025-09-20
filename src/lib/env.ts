// Environment variable validation and utilities

export function validateEnvVars() {
  const requiredVars = {
    ADMIN_WALLET_ADDRESS: process.env.ADMIN_WALLET_ADDRESS,
    NEXT_PUBLIC_ADMIN_WALLET_ADDRESS: process.env.NEXT_PUBLIC_ADMIN_WALLET_ADDRESS,
  }

  const missing = Object.entries(requiredVars)
    .filter(([key, value]) => !value)
    .map(([key]) => key)

  if (missing.length > 0) {
    console.warn(`Warning: Missing environment variables: ${missing.join(', ')}`)
    console.warn('Please check your .env.local file and ensure all required variables are set.')
  }

  return missing.length === 0
}

export function getAdminWallet(): string | undefined {
  return process.env.ADMIN_WALLET_ADDRESS
}

export function getPublicAdminWallet(): string | undefined {
  return process.env.NEXT_PUBLIC_ADMIN_WALLET_ADDRESS
}

export function isValidWalletAddress(address: string): boolean {
  return /^0x[a-fA-F0-9]{40}$/.test(address)
}