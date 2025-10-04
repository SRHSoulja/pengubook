import { NextRequest, NextResponse } from 'next/server'
import { createPublicClient, http, isAddress, hashMessage, getAddress, isHex, toBytes, defineChain, keccak256, decodeAbiParameters } from 'viem'
import { prisma } from '@/lib/prisma'
import { EIP1271_BYTES32_ABI, EIP1271_BYTES_ABI, EIP1271_MAGIC_VALUES } from '@/lib/constants/abis'

// Environment-driven chain configuration
// NOTE: These are evaluated lazily to avoid build-time errors when env vars aren't set
function getChainConfig() {
  const CHAIN_ID = Number(process.env.ABSTRACT_CHAIN_ID ?? process.env.NEXT_PUBLIC_ABSTRACT_CHAIN_ID)
  const RPC_URL = process.env.ABSTRACT_RPC_URL ?? process.env.NEXT_PUBLIC_ABSTRACT_RPC_URL

  if (!CHAIN_ID || !RPC_URL) {
    console.error('[Chain Config] Missing environment variables:', {
      ABSTRACT_CHAIN_ID: process.env.ABSTRACT_CHAIN_ID,
      NEXT_PUBLIC_ABSTRACT_CHAIN_ID: process.env.NEXT_PUBLIC_ABSTRACT_CHAIN_ID,
      ABSTRACT_RPC_URL: process.env.ABSTRACT_RPC_URL ? 'set' : 'missing',
      NEXT_PUBLIC_ABSTRACT_RPC_URL: process.env.NEXT_PUBLIC_ABSTRACT_RPC_URL ? 'set' : 'missing',
    })
    throw new Error('ABSTRACT_CHAIN_ID / ABSTRACT_RPC_URL missing')
  }

  return { CHAIN_ID, RPC_URL }
}

function getPublicClient() {
  const { CHAIN_ID, RPC_URL } = getChainConfig()

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

// Use centralized EIP-1271 constants
const { MAGIC_BYTES32, MAGIC_BYTES } = EIP1271_MAGIC_VALUES

function tryUnwrap6492(sig: `0x${string}`) {
  if (!sig?.startsWith('0x64926492')) return null
  const payload = `0x${sig.slice(10)}` as `0x${string}`
  try {
    const [factory, factoryCalldata, innerSig] = decodeAbiParameters(
      [
        { type: 'address' },
        { type: 'bytes' },
        { type: 'bytes' },
      ],
      payload
    )
    return { factory, factoryCalldata, innerSig: innerSig as `0x${string}` }
  } catch (e: any) {
    console.warn('[AGW Verify] 6492 unwrap failed:', e?.message)
    return null
  }
}

export async function POST(request: NextRequest) {
  try {
    // Skip database operations during build
    if (!process.env.DATABASE_URL) {
      return NextResponse.json({
        success: false,
        error: 'Database not available during build'
      }, { status: 503 })
    }

    // Initialize client (lazy to avoid build-time errors)
    const publicClient = getPublicClient()
    const { CHAIN_ID } = getChainConfig()

    const body = await request.json()
    const { message, signature, walletAddress, chainId: clientChainId } = body || {}

    // Validate inputs
    if (!message || !signature || !walletAddress) {
      return NextResponse.json(
        { error: 'message, signature, and walletAddress are required' },
        { status: 400 }
      )
    }

    if (!isAddress(walletAddress)) {
      return NextResponse.json(
        { error: 'Invalid wallet address format' },
        { status: 400 }
      )
    }

    if (!isHex(signature)) {
      return NextResponse.json(
        { error: 'Signature must be 0x-hex' },
        { status: 400 }
      )
    }

    const addr = getAddress(walletAddress)
    const clientIp = request.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
                     request.headers.get('x-real-ip') ||
                     'unknown'

    console.log('[AGW Verify] start', {
      clientChainId,
      serverChainId: CHAIN_ID,
      addr: addr.slice(0, 10) + '…',
      sigLen: signature?.length,
    })

    // ===== CRITICAL: Parse and validate message structure =====
    let parsedMessage: any
    try {
      parsedMessage = JSON.parse(message)
    } catch (e) {
      await prisma.authAttempt.create({
        data: {
          walletAddress: addr,
          ipAddress: clientIp,
          userAgent: request.headers.get('user-agent') || 'unknown',
          success: false,
          failureReason: 'Invalid message JSON'
        }
      })
      return NextResponse.json(
        { error: 'Message must be valid JSON' },
        { status: 400 }
      )
    }

    const { nonce, issuedAt, domain } = parsedMessage

    if (!nonce || !issuedAt || !domain) {
      await prisma.authAttempt.create({
        data: {
          walletAddress: addr,
          ipAddress: clientIp,
          userAgent: request.headers.get('user-agent') || 'unknown',
          success: false,
          failureReason: 'Missing required message fields'
        }
      })
      return NextResponse.json(
        { error: 'Message must contain nonce, issuedAt, and domain' },
        { status: 400 }
      )
    }

    // ===== CRITICAL: Validate nonce exists and hasn't been used =====
    const nonceRecord = await prisma.authNonce.findUnique({
      where: { nonce }
    })

    if (!nonceRecord) {
      console.warn('[Auth] Invalid nonce attempted:', {
        walletAddress: addr.slice(0, 10) + '...',
        nonce: nonce.slice(0, 10) + '...'
      })
      await prisma.authAttempt.create({
        data: {
          walletAddress: addr,
          ipAddress: clientIp,
          userAgent: request.headers.get('user-agent') || 'unknown',
          success: false,
          failureReason: 'Invalid nonce'
        }
      })
      return NextResponse.json(
        { error: 'Invalid nonce. Please request a new nonce and try again.' },
        { status: 401 }
      )
    }

    // ===== CRITICAL: Check if nonce already used (replay attack prevention) =====
    if (nonceRecord.used) {
      console.warn('[Auth] ⚠️ Replay attack detected - nonce reuse:', {
        walletAddress: addr.slice(0, 10) + '...',
        nonce: nonce.slice(0, 10) + '...',
        originalUseTime: nonceRecord.usedAt
      })
      await prisma.authAttempt.create({
        data: {
          walletAddress: addr,
          ipAddress: clientIp,
          userAgent: request.headers.get('user-agent') || 'unknown',
          success: false,
          failureReason: 'Replay attack - nonce already used',
          metadata: JSON.stringify({ originalUseTime: nonceRecord.usedAt })
        }
      })
      return NextResponse.json(
        { error: 'This authentication request has already been used. Please request a new nonce.' },
        { status: 401 }
      )
    }

    // ===== CRITICAL: Check nonce expiration =====
    if (new Date() > nonceRecord.expiresAt) {
      console.warn('[Auth] Expired nonce attempted:', {
        walletAddress: addr.slice(0, 10) + '...',
        nonce: nonce.slice(0, 10) + '...',
        expiredAt: nonceRecord.expiresAt
      })
      await prisma.authAttempt.create({
        data: {
          walletAddress: addr,
          ipAddress: clientIp,
          userAgent: request.headers.get('user-agent') || 'unknown',
          success: false,
          failureReason: 'Expired nonce'
        }
      })
      return NextResponse.json(
        { error: 'Nonce expired. Please request a new nonce.' },
        { status: 401 }
      )
    }

    // ===== CRITICAL: Validate timestamp freshness =====
    const messageTime = new Date(issuedAt).getTime()
    const now = Date.now()
    const timeDiffMs = Math.abs(now - messageTime)
    const MAX_TIME_DIFF_MS = 10 * 60 * 1000 // 10 minutes

    if (timeDiffMs > MAX_TIME_DIFF_MS) {
      await prisma.authAttempt.create({
        data: {
          walletAddress: addr,
          ipAddress: clientIp,
          userAgent: request.headers.get('user-agent') || 'unknown',
          success: false,
          failureReason: 'Message timestamp too old or in future'
        }
      })
      return NextResponse.json(
        { error: 'Message timestamp too old or in future. Please try again.' },
        { status: 401 }
      )
    }

    // ===== CRITICAL: Validate domain matches =====
    const expectedDomain = request.headers.get('host') || new URL(request.url).hostname

    if (domain !== expectedDomain) {
      console.warn('[Auth] ⚠️ Domain mismatch attack:', {
        expected: expectedDomain,
        received: domain,
        walletAddress: addr.slice(0, 10) + '...'
      })
      await prisma.authAttempt.create({
        data: {
          walletAddress: addr,
          ipAddress: clientIp,
          userAgent: request.headers.get('user-agent') || 'unknown',
          success: false,
          failureReason: 'Domain mismatch',
          metadata: JSON.stringify({ expected: expectedDomain, received: domain })
        }
      })
      return NextResponse.json(
        { error: 'Invalid domain in message' },
        { status: 401 }
      )
    }

    // ===== Chain validation - make required =====
    if (!clientChainId) {
      return NextResponse.json(
        { error: 'Chain ID is required' },
        { status: 400 }
      )
    }

    if (Number(clientChainId) !== CHAIN_ID) {
      return NextResponse.json(
        { error: `Chain mismatch: expected ${CHAIN_ID}` },
        { status: 400 }
      )
    }

    // 1) Check if contract code exists at address
    const code = await publicClient.getBytecode({ address: addr })
    const hasCode = !!code && code !== '0x'
    console.log('[AGW Verify] bytecode check:', { hasCode })

    // 2) Detect & unwrap EIP-6492 if present
    const unwrapped = tryUnwrap6492(signature as `0x${string}`)
    if (unwrapped) {
      console.log('[AGW Verify] 6492 unwrapped:', { innerSigLen: unwrapped.innerSig.length })
    }

    if (!hasCode && !unwrapped) {
      return NextResponse.json(
        { error: 'Smart wallet not deployed on this chain and no EIP-6492 wrapper detected' },
        { status: 401 }
      )
    }

    // 3) Compute both digest variants
    const dataBytes = toBytes(message)
    const digest191 = hashMessage(message)
    const digestRaw = keccak256(dataBytes)

    console.log('[AGW Verify] digests computed:', {
      digest191: digest191.slice(0, 12) + '…',
      digestRaw: digestRaw.slice(0, 12) + '…',
    })

    // Helper function for successful login
    const successLogin = async (addr: `0x${string}`) => {
      try {
        // ===== CRITICAL: Mark nonce as used atomically =====
        await prisma.authNonce.update({
          where: { nonce },
          data: {
            used: true,
            usedAt: new Date(),
            walletAddress: addr
          }
        })

        // ===== CRITICAL: Use atomic upsert to prevent race conditions =====
        const user = await prisma.user.upsert({
          where: { walletAddress: addr },
          update: {
            lastSeen: new Date(),
            isOnline: true
          },
          create: {
            walletAddress: addr,
            username: `user_${addr.slice(-6)}`,
            displayName: `Penguin ${addr.slice(-4)}`,
            profile: {
              create: {
                isPrivate: false,
                showActivity: true,
                showTips: true,
                allowDirectMessages: true,
                theme: 'dark',
                profileVerified: false
              }
            }
          },
          include: {
            profile: true
          }
        })

        // Log successful authentication
        await prisma.authAttempt.create({
          data: {
            walletAddress: addr,
            ipAddress: clientIp,
            userAgent: request.headers.get('user-agent') || 'unknown',
            success: true,
            metadata: JSON.stringify({
              userId: user.id,
              chainId: clientChainId
            })
          }
        })

        console.log('[AGW Verify] ✅ Auth success', { addr })

        // Create secure HTTP-only session cookie
        const response = NextResponse.json({
          success: true,
          content: 'Wallet authentication successful',
          user: {
            id: user.id,
            walletAddress: user.walletAddress,
            username: user.username,
            displayName: user.displayName,
            isAdmin: user.isAdmin
          }
        })

        // Set secure HTTP-only cookie (cannot be accessed/modified by JavaScript)
        response.cookies.set('pengubook-session', JSON.stringify({
          walletAddress: addr,
          userId: user.id,
          timestamp: Date.now()
        }), {
          httpOnly: true,      // Cannot be accessed by JavaScript
          secure: process.env.NODE_ENV === 'production', // HTTPS only in production
          sameSite: 'lax',     // CSRF protection
          maxAge: 60 * 60 * 24, // 24 hours
          path: '/'
        })

        return response
      } catch (error: any) {
        // Handle edge cases like concurrent upsert
        console.error('[Auth] Error in successLogin:', error)

        // If upsert fails, try to fetch existing user
        if (error.code === 'P2002') {
          const existingUser = await prisma.user.findUnique({
            where: { walletAddress: addr }
          })
          if (existingUser) {
            return NextResponse.json({
              success: true,
              user: {
                id: existingUser.id,
                walletAddress: existingUser.walletAddress,
                username: existingUser.username,
                displayName: existingUser.displayName,
                isAdmin: existingUser.isAdmin
              }
            })
          }
        }
        throw error
      }
    }

    // 4) Choose signature to verify: unwrapped inner sig if 6492, otherwise original
    const sigToVerify = unwrapped ? unwrapped.innerSig : (signature as `0x${string}`)

    // Security: Timeout for contract calls to prevent hanging
    const CALL_TIMEOUT_MS = 5000 // 5 second timeout

    // Helper to race contract call with timeout
    const callWithTimeout = async (promise: Promise<any>) => {
      return Promise.race([
        promise,
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Contract call timeout')), CALL_TIMEOUT_MS)
        )
      ])
    }

    // 5) Try ERC-1271 (bytes32, bytes) with EIP-191 digest
    try {
      const magicA = await callWithTimeout(
        publicClient.readContract({
          address: addr,
          abi: EIP1271_BYTES32_ABI,
          functionName: 'isValidSignature',
          args: [digest191, sigToVerify]
        })
      ) as `0x${string}`
      if (magicA === MAGIC_BYTES32) {
        console.log('[AGW Verify] ✅ Success: 1271(bytes32,EIP191)')
        return await successLogin(addr)
      }
    } catch (e: any) {
      console.warn('[AGW Verify] ERC-1271 bytes32/EIP-191 failed:', e.message?.slice(0, 100))
    }

    // 6) Try ERC-1271 (bytes32, bytes) with raw keccak digest
    try {
      const magicB = await callWithTimeout(
        publicClient.readContract({
          address: addr,
          abi: EIP1271_BYTES32_ABI,
          functionName: 'isValidSignature',
          args: [digestRaw, sigToVerify]
        })
      ) as `0x${string}`
      if (magicB === MAGIC_BYTES32) {
        console.log('[AGW Verify] ✅ Success: 1271(bytes32,RAW)')
        return await successLogin(addr)
      }
    } catch (e: any) {
      console.warn('[AGW Verify] ERC-1271 bytes32/RAW failed:', e.message?.slice(0, 100))
    }

    // 7) Try ERC-1271 (bytes, bytes) with raw message bytes
    try {
      const magicC = await callWithTimeout(
        publicClient.readContract({
          address: addr,
          abi: EIP1271_BYTES_ABI,
          functionName: 'isValidSignature',
          args: [dataBytes as any, sigToVerify]
        })
      ) as `0x${string}`
      if (magicC === MAGIC_BYTES) {
        console.log('[AGW Verify] ✅ Success: 1271(bytes,RAW)')
        return await successLogin(addr)
      }
    } catch (e: any) {
      console.warn('[AGW Verify] ERC-1271 bytes/RAW failed:', e.message?.slice(0, 100))
    }

    // 8) All variants failed - log the attempt
    console.error('[AGW Verify] ❌ All variants failed', {
      chainId: CHAIN_ID,
      addr,
      is6492: !!unwrapped,
    })

    await prisma.authAttempt.create({
      data: {
        walletAddress: addr,
        ipAddress: clientIp,
        userAgent: request.headers.get('user-agent') || 'unknown',
        success: false,
        failureReason: 'Invalid signature - all ERC-1271 variants failed'
      }
    })

    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
  } catch (e: any) {
    console.error('[AGW Verify] fatal', e?.message || e)
    return NextResponse.json({ error: e?.message || 'Authentication failed' }, { status: 500 })
  }
}
