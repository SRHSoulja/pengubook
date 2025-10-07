import { NextRequest, NextResponse } from 'next/server'
import { promises as fs } from 'fs'
import path from 'path'
import { withAuth, withAdminAuth } from '@/lib/auth-middleware'

export const dynamic = 'force-dynamic'

const CONFIG_FILE_PATH = path.join(process.cwd(), 'data', 'reaction-emojis.json')

interface ReactionEmojiConfig {
  HAPPY: string
  LAUGH: string
  LOVE: string
  SHOCK: string
  CRY: string
  ANGER: string
  THUMBS_UP: string
  THUMBS_DOWN: string
}

const defaultConfig: ReactionEmojiConfig = {
  HAPPY: '😀',
  LAUGH: '😂',
  LOVE: '😍',
  SHOCK: '😮',
  CRY: '😢',
  ANGER: '😡',
  THUMBS_UP: '👍',
  THUMBS_DOWN: '👎'
}

async function ensureDataDirectory() {
  const dataDir = path.join(process.cwd(), 'data')
  try {
    await fs.access(dataDir)
  } catch {
    await fs.mkdir(dataDir, { recursive: true })
  }
}

async function readConfig(): Promise<ReactionEmojiConfig> {
  try {
    await ensureDataDirectory()
    const data = await fs.readFile(CONFIG_FILE_PATH, 'utf-8')
    return JSON.parse(data)
  } catch (error) {
    // If file doesn't exist or can't be read, return default config
    return defaultConfig
  }
}

async function writeConfig(config: ReactionEmojiConfig): Promise<void> {
  await ensureDataDirectory()
  await fs.writeFile(CONFIG_FILE_PATH, JSON.stringify(config, null, 2), 'utf-8')
}

// GET /api/admin/reaction-emojis - Get current reaction emoji configuration
// SECURITY: Public access OK for transparency (low sensitivity)
export async function GET(request: NextRequest) {
  try {
    const config = await readConfig()

    return NextResponse.json({
      success: true,
      config
    })
  } catch (error: any) {
    console.error('[Reaction Emojis] GET error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch reaction emoji config', details: error.message },
      { status: 500 }
    )
  }
}

// POST /api/admin/reaction-emojis - Update reaction emoji configuration
// SECURITY: Requires admin privileges to modify reaction emojis
export const POST = withAdminAuth(async (request: NextRequest, user: any) => {
  try {
    const body = await request.json()
    const { config } = body

    if (!config) {
      return NextResponse.json(
        { success: false, error: 'Config is required' },
        { status: 400 }
      )
    }

    // Validate config structure
    const requiredKeys: Array<keyof ReactionEmojiConfig> = [
      'HAPPY', 'LAUGH', 'LOVE', 'SHOCK', 'CRY', 'ANGER', 'THUMBS_UP', 'THUMBS_DOWN'
    ]

    for (const key of requiredKeys) {
      if (!(key in config)) {
        return NextResponse.json(
          { success: false, error: `Missing required key: ${key}` },
          { status: 400 }
        )
      }
    }

    await writeConfig(config)

    // SECURITY: Log config changes for audit trail
    console.log('[Reaction Emojis] Config updated by admin:', {
      adminId: user.id.slice(0, 8) + '...',
      adminWallet: user.walletAddress?.slice(0, 6) + '...' + user.walletAddress?.slice(-4),
      changes: Object.keys(config).length + ' emojis modified',
      timestamp: new Date().toISOString()
    })

    return NextResponse.json({
      success: true,
      message: 'Reaction emoji configuration updated successfully'
    })
  } catch (error: any) {
    console.error('[Reaction Emojis] POST error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to update reaction emoji config', details: error.message },
      { status: 500 }
    )
  }
})
