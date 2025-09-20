// Social interaction types
import type { User } from './user'

export interface Token {
  id: string
  name: string
  symbol: string
  decimals: number
  contractAddress: string
  totalSupply: string
  verified: boolean
  price?: number
}

export interface Tip {
  id: string
  fromUserId: string
  fromUser?: User
  toUserId: string
  toUser?: User
  amount: string
  tokenSymbol: string
  message?: string
  transactionHash: string
  status: 'PENDING' | 'COMPLETED' | 'FAILED'
  createdAt: Date
  updatedAt: Date
}

export interface Follow {
  id: string
  followerId: string
  follower?: User
  followingId: string
  following?: User
  createdAt: Date
}

export interface Friendship {
  id: string
  requesterId: string
  requester?: User
  addresseeId: string
  addressee?: User
  status: 'PENDING' | 'ACCEPTED' | 'DECLINED' | 'BLOCKED'
  acceptedAt?: Date
  createdAt: Date
  updatedAt: Date
}

export interface AGWConnection {
  walletAddress: string
  isConnected: boolean
  chainId?: number
  balance?: string
}