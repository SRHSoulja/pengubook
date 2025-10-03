/**
 * Centralized ABI (Application Binary Interface) constants
 * Prevents duplication and ensures consistency across the application
 */

/**
 * ERC-20 Token Standard ABI (viem format)
 * Used for ERC-20 token interactions (transfers, balances, approvals)
 */
export const ERC20_ABI = [
  // Transfer tokens
  {
    name: 'transfer',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'to', type: 'address' },
      { name: 'amount', type: 'uint256' }
    ],
    outputs: [{ name: '', type: 'bool' }]
  },
  // Get token balance
  {
    name: 'balanceOf',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'owner', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }]
  },
  // Get token decimals
  {
    name: 'decimals',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'uint8' }]
  },
  // Get token symbol
  {
    name: 'symbol',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'string' }]
  },
  // Get token name
  {
    name: 'name',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'string' }]
  },
  // Approve spender
  {
    name: 'approve',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'spender', type: 'address' },
      { name: 'amount', type: 'uint256' }
    ],
    outputs: [{ name: '', type: 'bool' }]
  },
  // Get allowance
  {
    name: 'allowance',
    type: 'function',
    stateMutability: 'view',
    inputs: [
      { name: 'owner', type: 'address' },
      { name: 'spender', type: 'address' }
    ],
    outputs: [{ name: '', type: 'uint256' }]
  },
  // Get total supply
  {
    name: 'totalSupply',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'uint256' }]
  }
] as const

/**
 * Minimal ERC-20 ABI for transfer only (lighter weight)
 */
export const ERC20_TRANSFER_ABI = [
  {
    name: 'transfer',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'to', type: 'address' },
      { name: 'amount', type: 'uint256' }
    ],
    outputs: [{ name: '', type: 'bool' }]
  }
] as const

/**
 * EIP-1271 Smart Contract Signature Validation ABI (bytes32 hash version)
 * Used for verifying signatures from smart contract wallets
 */
export const EIP1271_BYTES32_ABI = [{
  type: 'function',
  name: 'isValidSignature',
  stateMutability: 'view',
  inputs: [
    { name: '_hash', type: 'bytes32' },
    { name: '_signature', type: 'bytes' },
  ],
  outputs: [{ name: 'magicValue', type: 'bytes4' }],
}] as const

/**
 * EIP-1271 Smart Contract Signature Validation ABI (bytes data version)
 * Alternative signature for some smart contract wallet implementations
 */
export const EIP1271_BYTES_ABI = [{
  type: 'function',
  name: 'isValidSignature',
  stateMutability: 'view',
  inputs: [
    { name: '_data', type: 'bytes' },
    { name: '_signature', type: 'bytes' },
  ],
  outputs: [{ name: 'magicValue', type: 'bytes4' }],
}] as const

/**
 * EIP-1271 Magic Values
 * These values are returned by smart contract wallets to indicate valid signatures
 */
export const EIP1271_MAGIC_VALUES = {
  /** Magic value for bytes32 hash signature validation */
  MAGIC_BYTES32: '0x1626ba7e' as const,
  /** Magic value for bytes data signature validation */
  MAGIC_BYTES: '0x20c13b0b' as const,
} as const

/**
 * ERC-721 NFT Standard ABI (viem format)
 * Used for NFT ownership verification and transfers
 */
export const ERC721_ABI = [
  // Get NFT owner
  {
    name: 'ownerOf',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'tokenId', type: 'uint256' }],
    outputs: [{ name: '', type: 'address' }]
  },
  // Get NFT balance
  {
    name: 'balanceOf',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'owner', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }]
  },
  // Get token by owner index
  {
    name: 'tokenOfOwnerByIndex',
    type: 'function',
    stateMutability: 'view',
    inputs: [
      { name: 'owner', type: 'address' },
      { name: 'index', type: 'uint256' }
    ],
    outputs: [{ name: '', type: 'uint256' }]
  },
  // Get token metadata URI
  {
    name: 'tokenURI',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'tokenId', type: 'uint256' }],
    outputs: [{ name: '', type: 'string' }]
  },
  // Transfer NFT
  {
    name: 'transferFrom',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'from', type: 'address' },
      { name: 'to', type: 'address' },
      { name: 'tokenId', type: 'uint256' }
    ],
    outputs: []
  },
  // Safe transfer NFT
  {
    name: 'safeTransferFrom',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'from', type: 'address' },
      { name: 'to', type: 'address' },
      { name: 'tokenId', type: 'uint256' }
    ],
    outputs: []
  }
] as const

/**
 * Ethers.js compatible ABI formats
 * For legacy code using ethers.js instead of viem
 */
export const ETHERS_ABIS = {
  ERC20: [
    'function balanceOf(address owner) view returns (uint256)',
    'function decimals() view returns (uint8)',
    'function symbol() view returns (string)',
    'function name() view returns (string)',
    'function totalSupply() view returns (uint256)',
    'function transfer(address to, uint256 amount) returns (bool)',
    'function approve(address spender, uint256 amount) returns (bool)',
    'function allowance(address owner, address spender) view returns (uint256)'
  ],
  ERC721: [
    'function ownerOf(uint256 tokenId) view returns (address)',
    'function balanceOf(address owner) view returns (uint256)',
    'function tokenOfOwnerByIndex(address owner, uint256 index) view returns (uint256)',
    'function tokenURI(uint256 tokenId) view returns (string)',
    'function transferFrom(address from, address to, uint256 tokenId)',
    'function safeTransferFrom(address from, address to, uint256 tokenId)'
  ]
} as const
