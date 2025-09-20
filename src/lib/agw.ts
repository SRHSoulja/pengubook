import { createAbstractClient } from '@abstract-foundation/agw-client'
import { createWalletClient, custom } from 'viem'
import { abstract } from 'viem/chains'
import { http } from 'viem'
import type { AbstractClient } from '@abstract-foundation/agw-client'

declare global {
  interface Window {
    ethereum?: any
  }
}

export class AGWProvider {
  private client: AbstractClient | null = null
  private account: any = null

  async connect(): Promise<string | null> {
    if (typeof window === 'undefined') return null

    try {
      // Check if wallet is available
      if (!window.ethereum) {
        throw new Error('No wallet found. Please install a Web3 wallet like MetaMask.')
      }

      // Request account access
      await window.ethereum.request({ method: 'eth_requestAccounts' })

      // Create wallet client with the existing wallet
      const walletClient = createWalletClient({
        transport: custom(window.ethereum),
        chain: abstract,
      })

      // Get the connected account
      const [address] = await walletClient.getAddresses()

      // Create AGW client
      // Temporarily disabled due to type compatibility issues
      // this.client = await createAbstractClient({
      //   chain: abstract,
      //   signer: {
      //     address,
      //     signMessage: async ({ message }) => {
      //       return await walletClient.signMessage({
      //         account: address,
      //         message: typeof message === 'string' ? message : message.raw
      //       })
      //     },
      //     signTransaction: async (transaction) => {
      //       return await walletClient.signTransaction({
      //         account: address,
      //         ...transaction
      //       })
      //     },
      //     signTypedData: async (typedData) => {
      //       return await walletClient.signTypedData({
      //         account: address,
      //         ...typedData
      //       })
      //     }
      //   },
      //   transport: http(),
      // })

      // Return the wallet address
      return address
    } catch (error) {
      console.error('Failed to connect to AGW:', error)
      return null
    }
  }

  async getBalance(address: string): Promise<string> {
    // Temporarily disabled due to type compatibility issues
    // if (!this.client) throw new Error('AGW client not initialized')
    // const balance = await this.client.getBalance({ address: address as `0x${string}` })
    // return (Number(balance) / 1e18).toString()
    return '0'
  }

  async sendTip(to: string, amount: string, tokenAddress?: string): Promise<string> {
    // Temporarily disabled due to type compatibility issues
    // if (!this.client) throw new Error('AGW client not initialized')
    // if (tokenAddress) {
    //   // ERC-20 token transfer - would need to implement contract interaction
    //   throw new Error('ERC-20 transfers not implemented yet')
    // } else {
    //   // Native token transfer
    //   const hash = await this.client.sendTransaction({
    //     to: to as `0x${string}`,
    //     value: BigInt(Math.floor(parseFloat(amount) * 1e18)),
    //   })
    //   return hash
    // }
    throw new Error('AGW functionality temporarily disabled')
  }

  isConnected(): boolean {
    // return this.client !== null
    return false
  }

  getAddress(): string | null {
    // return this.client?.account?.address || null
    return null
  }
}

export const agwProvider = new AGWProvider()