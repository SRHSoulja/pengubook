/**
 * Safe decimal-to-wei conversion utilities
 * Prevents precision loss when converting decimal amounts to blockchain wei amounts
 * Uses string manipulation instead of floating-point math
 */

/**
 * Converts a decimal string to wei (BigInt) without precision loss
 * @param amount - Decimal amount as string (e.g., "1.5", "0.000001")
 * @param decimals - Number of decimals for the token (18 for ETH, varies for ERC-20)
 * @returns BigInt representation of the amount in wei
 * @throws Error if amount is invalid or has too many decimal places
 *
 * @example
 * parseDecimalToWei("1.5", 18) // Returns 1500000000000000000n
 * parseDecimalToWei("0.000001", 6) // Returns 1n (for USDC)
 * parseDecimalToWei("100", 18) // Returns 100000000000000000000n
 */
export function parseDecimalToWei(amount: string, decimals: number): bigint {
  // Validate input
  if (!amount || amount.trim() === '') {
    throw new Error('Amount cannot be empty')
  }

  // Remove leading/trailing whitespace
  amount = amount.trim()

  // Validate decimals
  if (decimals < 0 || decimals > 77) {
    throw new Error(`Invalid decimals: ${decimals}. Must be between 0 and 77`)
  }

  // Check for invalid characters
  if (!/^[0-9]*\.?[0-9]*$/.test(amount)) {
    throw new Error(`Invalid amount format: ${amount}. Must be a valid decimal number`)
  }

  // Handle empty or zero
  if (amount === '0' || amount === '0.' || amount === '.0' || amount === '0.0') {
    return BigInt(0)
  }

  // Split into integer and decimal parts
  const parts = amount.split('.')
  const integerPart = parts[0] || '0'
  const decimalPart = parts[1] || ''

  // Check if decimal part exceeds token decimals
  if (decimalPart.length > decimals) {
    throw new Error(
      `Amount has too many decimal places. Maximum ${decimals} decimals allowed, got ${decimalPart.length}`
    )
  }

  // Pad decimal part to match token decimals
  const paddedDecimalPart = decimalPart.padEnd(decimals, '0')

  // Combine integer and decimal parts
  const weiString = integerPart + paddedDecimalPart

  // Remove leading zeros (except for zero itself)
  const cleanWeiString = weiString.replace(/^0+/, '') || '0'

  return BigInt(cleanWeiString)
}

/**
 * Converts wei (BigInt) to a decimal string
 * @param wei - Amount in wei as BigInt
 * @param decimals - Number of decimals for the token
 * @param maxDecimalPlaces - Maximum decimal places to display (default: decimals)
 * @returns Decimal string representation
 *
 * @example
 * formatWeiToDecimal(1500000000000000000n, 18) // Returns "1.5"
 * formatWeiToDecimal(1000000n, 6) // Returns "1" (USDC)
 * formatWeiToDecimal(123456789n, 6, 2) // Returns "123.45" (rounded to 2 decimals)
 */
export function formatWeiToDecimal(
  wei: bigint,
  decimals: number,
  maxDecimalPlaces?: number
): string {
  // Handle zero
  if (wei === BigInt(0)) {
    return '0'
  }

  // Convert to string and pad with leading zeros if needed
  const weiString = wei.toString()
  const paddedWeiString = weiString.padStart(decimals + 1, '0')

  // Split into integer and decimal parts
  const integerPart = paddedWeiString.slice(0, -decimals) || '0'
  let decimalPart = paddedWeiString.slice(-decimals)

  // Remove trailing zeros from decimal part
  decimalPart = decimalPart.replace(/0+$/, '')

  // Limit decimal places if specified
  if (maxDecimalPlaces !== undefined && decimalPart.length > maxDecimalPlaces) {
    decimalPart = decimalPart.slice(0, maxDecimalPlaces)
    // Remove trailing zeros again after truncation
    decimalPart = decimalPart.replace(/0+$/, '')
  }

  // Return formatted string
  if (decimalPart === '') {
    return integerPart
  }

  return `${integerPart}.${decimalPart}`
}

/**
 * Validates if an amount string is valid for conversion
 * @param amount - Amount to validate
 * @param decimals - Number of decimals allowed
 * @returns { valid: boolean, error?: string }
 */
export function validateDecimalAmount(
  amount: string,
  decimals: number
): { valid: boolean; error?: string } {
  try {
    parseDecimalToWei(amount, decimals)
    return { valid: true }
  } catch (error: any) {
    return { valid: false, error: error.message }
  }
}

/**
 * Safely converts a number to a decimal string for blockchain operations
 * Avoids floating-point precision issues
 * @param value - Number value
 * @param maxDecimals - Maximum decimal places to preserve
 * @returns String representation safe for parseDecimalToWei
 */
export function numberToSafeDecimalString(value: number, maxDecimals: number = 18): string {
  if (!Number.isFinite(value)) {
    throw new Error('Value must be a finite number')
  }

  if (value < 0) {
    throw new Error('Value cannot be negative')
  }

  // Convert to string with maximum precision
  const stringValue = value.toString()

  // If no decimal point, return as-is
  if (!stringValue.includes('.')) {
    return stringValue
  }

  // Split and truncate decimal places
  const [integerPart, decimalPart] = stringValue.split('.')
  const truncatedDecimal = decimalPart.slice(0, maxDecimals)

  if (truncatedDecimal === '' || truncatedDecimal === '0') {
    return integerPart
  }

  return `${integerPart}.${truncatedDecimal}`
}
