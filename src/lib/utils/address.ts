import { getAddress, isAddress } from 'viem'

/**
 * Validates and normalizes Ethereum address to checksum format
 * @param address - Address to validate
 * @returns Checksummed address
 * @throws Error if invalid
 */
export function validateAndNormalizeAddress(address: string): `0x${string}` {
  if (!address) {
    throw new Error('Address is required')
  }

  if (!isAddress(address)) {
    throw new Error('Invalid Ethereum address format')
  }

  // getAddress returns checksummed address
  return getAddress(address)
}

/**
 * Safe address comparison (case-insensitive)
 * @param addr1 - First address
 * @param addr2 - Second address
 * @returns true if addresses are equal
 */
export function addressesEqual(addr1: string | null | undefined, addr2: string | null | undefined): boolean {
  if (!addr1 || !addr2) return false

  try {
    return getAddress(addr1).toLowerCase() === getAddress(addr2).toLowerCase()
  } catch {
    return false
  }
}

/**
 * Normalize address to lowercase for database storage
 * Lowercase storage prevents duplicate addresses with different casing
 * @param address - Address to normalize
 * @returns Lowercase address
 */
export function normalizeAddressForStorage(address: string): string {
  if (!isAddress(address)) {
    throw new Error('Invalid Ethereum address format')
  }

  return getAddress(address).toLowerCase()
}

/**
 * Validate if a string is a valid Ethereum address (without throwing)
 * @param address - Address to validate
 * @returns true if valid
 */
export function isValidAddress(address: any): address is string {
  if (typeof address !== 'string') return false
  return isAddress(address)
}

/**
 * Get short address format for display (0x1234...5678)
 * @param address - Address to shorten
 * @param startChars - Number of characters after 0x (default 4)
 * @param endChars - Number of characters at end (default 4)
 * @returns Shortened address
 */
export function shortenAddress(address: string, startChars: number = 4, endChars: number = 4): string {
  if (!isAddress(address)) {
    return address
  }

  const checksummed = getAddress(address)
  return `${checksummed.slice(0, 2 + startChars)}...${checksummed.slice(-endChars)}`
}
