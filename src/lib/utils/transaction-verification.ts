/**
 * Transaction verification utilities for on-chain validation
 * Verifies transactions actually occurred and succeeded on Abstract blockchain
 */

import { createPublicClient, http, defineChain, type Hash } from 'viem'

// Initialize Abstract chain client
function getAbstractClient() {
  const CHAIN_ID = Number(process.env.ABSTRACT_CHAIN_ID ?? process.env.NEXT_PUBLIC_ABSTRACT_CHAIN_ID)
  const RPC_URL = process.env.ABSTRACT_RPC_URL ?? process.env.NEXT_PUBLIC_ABSTRACT_RPC_URL

  if (!CHAIN_ID || !RPC_URL) {
    throw new Error('ABSTRACT_CHAIN_ID / ABSTRACT_RPC_URL missing')
  }

  const abstractChain = defineChain({
    id: CHAIN_ID,
    name: 'Abstract',
    network: 'abstract',
    nativeCurrency: { name: 'ETH', symbol: 'ETH', decimals: 18 },
    rpcUrls: { default: { http: [RPC_URL] } },
  })

  return createPublicClient({
    chain: abstractChain,
    transport: http(RPC_URL),
  })
}

export interface TransactionVerificationResult {
  exists: boolean
  confirmed: boolean
  success: boolean
  blockNumber?: bigint
  from?: string
  to?: string | null
  value?: bigint
  error?: string
}

/**
 * Verifies a transaction exists and succeeded on-chain
 * @param txHash - Transaction hash to verify
 * @param requiredConfirmations - Number of confirmations required (default: 1)
 * @returns Verification result with transaction details
 */
export async function verifyTransaction(
  txHash: string,
  requiredConfirmations: number = 1
): Promise<TransactionVerificationResult> {
  try {
    if (!/^0x[a-fA-F0-9]{64}$/.test(txHash)) {
      return {
        exists: false,
        confirmed: false,
        success: false,
        error: 'Invalid transaction hash format'
      }
    }

    const client = getAbstractClient()

    // Get transaction receipt
    const receipt = await client.getTransactionReceipt({
      hash: txHash as Hash
    })

    if (!receipt) {
      return {
        exists: false,
        confirmed: false,
        success: false,
        error: 'Transaction not found on-chain'
      }
    }

    // Get current block number to check confirmations
    const currentBlock = await client.getBlockNumber()
    const confirmations = currentBlock - receipt.blockNumber + BigInt(1)

    const isConfirmed = confirmations >= BigInt(requiredConfirmations)

    // Transaction status: 1 = success, 0 = failure
    const isSuccessful = receipt.status === 'success'

    return {
      exists: true,
      confirmed: isConfirmed,
      success: isSuccessful,
      blockNumber: receipt.blockNumber,
      from: receipt.from,
      to: receipt.to,
      error: !isSuccessful ? 'Transaction reverted on-chain' : undefined
    }
  } catch (error: any) {
    console.error('[Transaction Verification] Error:', error)

    return {
      exists: false,
      confirmed: false,
      success: false,
      error: error.message || 'Failed to verify transaction'
    }
  }
}

/**
 * Verifies tip transaction matches expected parameters
 * @param txHash - Transaction hash
 * @param fromAddress - Expected sender wallet address
 * @param toAddress - Expected recipient wallet address
 * @param minValue - Minimum expected value (for ETH tips)
 * @returns Verification result
 */
export async function verifyTipTransaction(
  txHash: string,
  fromAddress: string,
  toAddress: string,
  minValue?: bigint
): Promise<TransactionVerificationResult> {
  const result = await verifyTransaction(txHash, 1)

  if (!result.exists) {
    return result
  }

  // Verify addresses match (case-insensitive)
  const fromMatches = result.from?.toLowerCase() === fromAddress.toLowerCase()
  const toMatches = result.to?.toLowerCase() === toAddress.toLowerCase()

  if (!fromMatches) {
    return {
      ...result,
      success: false,
      error: 'Transaction sender does not match expected wallet address'
    }
  }

  if (!toMatches) {
    return {
      ...result,
      success: false,
      error: 'Transaction recipient does not match expected wallet address'
    }
  }

  // For ETH tips, verify minimum value if provided
  if (minValue !== undefined && result.value !== undefined) {
    if (result.value < minValue) {
      return {
        ...result,
        success: false,
        error: `Transaction value (${result.value}) less than expected minimum (${minValue})`
      }
    }
  }

  return result
}

/**
 * Waits for transaction to be confirmed
 * @param txHash - Transaction hash to wait for
 * @param confirmations - Number of confirmations to wait for
 * @param timeout - Maximum time to wait in milliseconds (default: 60000)
 * @returns Verification result when confirmed or timeout
 */
export async function waitForTransactionConfirmation(
  txHash: string,
  confirmations: number = 1,
  timeout: number = 60000
): Promise<TransactionVerificationResult> {
  const startTime = Date.now()
  const pollInterval = 2000 // Poll every 2 seconds

  while (Date.now() - startTime < timeout) {
    const result = await verifyTransaction(txHash, confirmations)

    if (result.confirmed || !result.exists || result.error) {
      return result
    }

    // Wait before next poll
    await new Promise(resolve => setTimeout(resolve, pollInterval))
  }

  return {
    exists: true,
    confirmed: false,
    success: false,
    error: 'Confirmation timeout - transaction not confirmed within time limit'
  }
}
