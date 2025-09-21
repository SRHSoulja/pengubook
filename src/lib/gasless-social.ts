import { ethers } from 'ethers'

// Types for gasless social actions
export interface GaslessPost {
  content: string
  contentHash: string
  timestamp: number
  nonce: number
}

export interface GaslessInteraction {
  postId: string
  action: 'LIKE' | 'UNLIKE' | 'FOLLOW' | 'UNFOLLOW'
  timestamp: number
  nonce: number
}

// EIP-712 domain for message signing
const DOMAIN = {
  name: 'PenguBook',
  version: '1',
  chainId: 2741, // Abstract mainnet
  verifyingContract: '0x...' // Our social contract address
}

// Message types for EIP-712
const TYPES = {
  Post: [
    { name: 'content', type: 'string' },
    { name: 'contentHash', type: 'string' },
    { name: 'timestamp', type: 'uint256' },
    { name: 'nonce', type: 'uint256' }
  ],
  Interaction: [
    { name: 'postId', type: 'string' },
    { name: 'action', type: 'string' },
    { name: 'timestamp', type: 'uint256' },
    { name: 'nonce', type: 'uint256' }
  ]
}

export class GaslessSocialService {
  private provider: ethers.Provider
  private wallet: ethers.Wallet
  private socialContract: ethers.Contract

  constructor() {
    // Only initialize if environment variables are available
    if (process.env.ABSTRACT_RPC_URL && process.env.RELAYER_PRIVATE_KEY) {
      this.provider = new ethers.JsonRpcProvider(process.env.ABSTRACT_RPC_URL)
      this.wallet = new ethers.Wallet(process.env.RELAYER_PRIVATE_KEY, this.provider)
    }

    // Social contract for gasless operations (only if wallet exists)
    if (this.wallet && process.env.SOCIAL_CONTRACT_ADDRESS) {
      this.socialContract = new ethers.Contract(
        process.env.SOCIAL_CONTRACT_ADDRESS,
        SOCIAL_CONTRACT_ABI,
        this.wallet
      )
    }
  }

  /**
   * User signs a post message (gasless on user side)
   */
  async signPost(
    userWallet: any, // AGW wallet instance
    content: string,
    userNonce: number
  ): Promise<{ signature: string; postData: GaslessPost }> {
    const contentHash = ethers.keccak256(ethers.toUtf8Bytes(content))

    const postData: GaslessPost = {
      content,
      contentHash,
      timestamp: Math.floor(Date.now() / 1000),
      nonce: userNonce
    }

    // User signs this message (no gas cost!)
    const signature = await userWallet._signTypedData(DOMAIN, TYPES.Post, postData)

    return { signature, postData }
  }

  /**
   * Server submits signed post to blockchain (we pay gas)
   */
  async submitPost(
    userAddress: string,
    postData: GaslessPost,
    signature: string
  ): Promise<{ success: boolean; txHash?: string; error?: string }> {
    try {
      // Verify signature first
      const recoveredAddress = ethers.verifyTypedData(
        DOMAIN,
        TYPES.Post,
        postData,
        signature
      )

      if (recoveredAddress.toLowerCase() !== userAddress.toLowerCase()) {
        return { success: false, error: 'Invalid signature' }
      }

      // Submit to blockchain (we pay gas)
      const tx = await this.socialContract.createPostWithSignature(
        userAddress,
        postData.content,
        postData.contentHash,
        postData.timestamp,
        postData.nonce,
        signature,
        {
          gasLimit: 300000, // Estimate gas
        }
      )

      await tx.wait()

      return { success: true, txHash: tx.hash }
    } catch (error: any) {
      console.error('Failed to submit gasless post:', error)
      return { success: false, error: error.message }
    }
  }

  /**
   * Sign social interactions (likes, follows)
   */
  async signInteraction(
    userWallet: any,
    postId: string,
    action: 'LIKE' | 'UNLIKE' | 'FOLLOW' | 'UNFOLLOW',
    userNonce: number
  ): Promise<{ signature: string; interactionData: GaslessInteraction }> {
    const interactionData: GaslessInteraction = {
      postId,
      action,
      timestamp: Math.floor(Date.now() / 1000),
      nonce: userNonce
    }

    const signature = await userWallet._signTypedData(
      DOMAIN,
      TYPES.Interaction,
      interactionData
    )

    return { signature, interactionData }
  }

  /**
   * Submit signed interaction to blockchain
   */
  async submitInteraction(
    userAddress: string,
    interactionData: GaslessInteraction,
    signature: string
  ): Promise<{ success: boolean; txHash?: string; error?: string }> {
    try {
      const recoveredAddress = ethers.verifyTypedData(
        DOMAIN,
        TYPES.Interaction,
        interactionData,
        signature
      )

      if (recoveredAddress.toLowerCase() !== userAddress.toLowerCase()) {
        return { success: false, error: 'Invalid signature' }
      }

      const tx = await this.socialContract.processInteractionWithSignature(
        userAddress,
        interactionData.postId,
        interactionData.action,
        interactionData.timestamp,
        interactionData.nonce,
        signature
      )

      await tx.wait()

      return { success: true, txHash: tx.hash }
    } catch (error: any) {
      console.error('Failed to submit gasless interaction:', error)
      return { success: false, error: error.message }
    }
  }

  /**
   * Get user's current nonce for replay protection
   */
  async getUserNonce(userAddress: string): Promise<number> {
    try {
      return await this.socialContract.nonces(userAddress)
    } catch (error) {
      console.error('Failed to get user nonce:', error)
      return 0
    }
  }

  /**
   * Check if we should process action on-chain or keep in database
   */
  shouldProcessOnChain(action: string, userLevel: number): boolean {
    // Start with high-value actions on-chain
    const onChainActions = [
      'CREATE_COMMUNITY',
      'SEND_TIP',
      'MINT_NFT',
      'TOKEN_GATE_ACCESS'
    ]

    // Gradually move more actions on-chain as user levels up
    if (userLevel >= 5) {
      onChainActions.push('CREATE_POST')
    }

    if (userLevel >= 10) {
      onChainActions.push('LIKE_POST', 'FOLLOW_USER')
    }

    return onChainActions.includes(action)
  }
}

// Smart contract ABI for gasless social interactions
const SOCIAL_CONTRACT_ABI = [
  {
    "inputs": [
      {"name": "user", "type": "address"},
      {"name": "content", "type": "string"},
      {"name": "contentHash", "type": "bytes32"},
      {"name": "timestamp", "type": "uint256"},
      {"name": "nonce", "type": "uint256"},
      {"name": "signature", "type": "bytes"}
    ],
    "name": "createPostWithSignature",
    "outputs": [{"name": "postId", "type": "uint256"}],
    "type": "function"
  },
  {
    "inputs": [
      {"name": "user", "type": "address"},
      {"name": "postId", "type": "string"},
      {"name": "action", "type": "string"},
      {"name": "timestamp", "type": "uint256"},
      {"name": "nonce", "type": "uint256"},
      {"name": "signature", "type": "bytes"}
    ],
    "name": "processInteractionWithSignature",
    "outputs": [{"name": "success", "type": "bool"}],
    "type": "function"
  },
  {
    "inputs": [{"name": "user", "type": "address"}],
    "name": "nonces",
    "outputs": [{"name": "", "type": "uint256"}],
    "type": "function"
  }
]

export { DOMAIN, TYPES }