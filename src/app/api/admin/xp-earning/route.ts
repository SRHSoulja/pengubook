import { NextRequest, NextResponse } from 'next/server'
import { promises as fs } from 'fs'
import path from 'path'
import { withAuth, withAdminAuth } from '@/lib/auth-middleware'

export const dynamic = 'force-dynamic'

const CONFIG_FILE_PATH = path.join(process.cwd(), 'data', 'xp-earning.json')

export interface XPEarningConfig {
  createPost: number
  createComment: number
  receiveReaction: number
  giveReaction: number
  postShared: number
  sharePost: number
  dailyLogin: number
  profileComplete: number
  receiveTip: number
  sendTip: number
}

const defaultConfig: XPEarningConfig = {
  createPost: 10,
  createComment: 5,
  receiveReaction: 2,
  giveReaction: 1,
  postShared: 5,
  sharePost: 3,
  dailyLogin: 10,
  profileComplete: 50,
  receiveTip: 20,
  sendTip: 5
}

async function ensureDataDirectory() {
  const dataDir = path.join(process.cwd(), 'data')
  try {
    await fs.access(dataDir)
  } catch {
    await fs.mkdir(dataDir, { recursive: true })
  }
}

async function readConfig(): Promise<XPEarningConfig> {
  try {
    await ensureDataDirectory()
    const data = await fs.readFile(CONFIG_FILE_PATH, 'utf-8')
    return JSON.parse(data)
  } catch (error) {
    // If file doesn't exist or can't be read, return default config
    return defaultConfig
  }
}

async function writeConfig(config: XPEarningConfig): Promise<void> {
  await ensureDataDirectory()
  await fs.writeFile(CONFIG_FILE_PATH, JSON.stringify(config, null, 2), 'utf-8')
}

// GET /api/admin/xp-earning - Get current XP earning configuration
// SECURITY: Requires authentication to prevent XP economy exploitation
export const GET = withAuth(async (request: NextRequest, user: any) => {
  try {
    const config = await readConfig()

    return NextResponse.json({
      success: true,
      config
    })
  } catch (error: any) {
    console.error('[XP Earning] GET error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch XP earning config', details: error.message },
      { status: 500 }
    )
  }
})

// POST /api/admin/xp-earning - Update XP earning configuration
// SECURITY: Requires admin privileges to modify game economy
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
    const requiredKeys: Array<keyof XPEarningConfig> = [
      'createPost', 'createComment', 'receiveReaction', 'giveReaction',
      'postShared', 'sharePost', 'dailyLogin', 'profileComplete',
      'receiveTip', 'sendTip'
    ]

    for (const key of requiredKeys) {
      if (!(key in config)) {
        return NextResponse.json(
          { success: false, error: `Missing required key: ${key}` },
          { status: 400 }
        )
      }

      // Validate that values are numbers
      if (typeof config[key] !== 'number' || config[key] < 0) {
        return NextResponse.json(
          { success: false, error: `Invalid value for ${key}: must be a non-negative number` },
          { status: 400 }
        )
      }
    }

    await writeConfig(config)

    // SECURITY: Log config changes for audit trail
    console.log('[XP Earning] Config updated by admin:', {
      adminId: user.id.slice(0, 8) + '...',
      adminWallet: user.walletAddress?.slice(0, 6) + '...' + user.walletAddress?.slice(-4),
      changes: Object.keys(config).length + ' XP values modified',
      timestamp: new Date().toISOString()
    })

    return NextResponse.json({
      success: true,
      message: 'XP earning configuration updated successfully'
    })
  } catch (error: any) {
    console.error('[XP Earning] POST error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to update XP earning config', details: error.message },
      { status: 500 }
    )
  }
})
