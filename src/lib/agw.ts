import { createAbstractClient } from '@abstract-foundation/agw-client'
import { abstract } from 'viem/chains'
import { http } from 'viem'
import type { AbstractClient } from '@abstract-foundation/agw-client'

export class AGWProvider {
  private client: AbstractClient | null = null
  private account: any = null

  async connect(): Promise<string | null> {
    if (typeof window === 'undefined') return null

    try {
      // Create AGW client - this will handle wallet connection internally
      this.client = await createAbstractClient({
        chain: abstract,
        transport: http(),
      })

      // Get the connected account from AGW
      const account = await this.client.account
      this.account = account

      // Return the wallet address
      return account?.address || null
    } catch (error) {
      console.error('Failed to connect to Abstract Global Wallet:', error)
      // AGW handles wallet connection internally, no need for MetaMask
      return null
    }
  }

  async getBalance(address: string): Promise<string> {
    if (!this.client) throw new Error('AGW client not initialized')
    try {
      const balance = await this.client.getBalance({ address: address as `0x${string}` })
      return (Number(balance) / 1e18).toString()
    } catch (error) {
      console.error('Failed to get balance:', error)
      return '0'
    }
  }

  async sendTip(to: string, amount: string, tokenAddress?: string): Promise<string> {
    if (!this.client) throw new Error('AGW client not initialized')

    try {
      if (tokenAddress) {
        // ERC-20 token transfer - would need to implement contract interaction
        throw new Error('ERC-20 transfers not implemented yet')
      } else {
        // Native token transfer via AGW
        const hash = await this.client.sendTransaction({
          to: to as `0x${string}`,
          value: BigInt(Math.floor(parseFloat(amount) * 1e18)),
        })
        return hash
      }
    } catch (error) {
      console.error('Failed to send tip:', error)
      throw error
    }
  }

  isConnected(): boolean {
    return this.client !== null && this.account !== null
  }

  getAddress(): string | null {
    return this.account?.address || null
  }
}

export const agwProvider = new AGWProvider()