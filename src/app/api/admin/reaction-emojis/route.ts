import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth-middleware'
import fs from 'fs/promises'
import path from 'path'

export const dynamic = 'force-dynamic'

const CONFIG_FILE = path.join(process.cwd(), 'data', 'reaction-emojis.json')

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

const defaultEmojis: ReactionEmojiConfig = {
  HAPPY: '😀',
  LAUGH: '😂',
  LOVE: '😍',
  SHOCK: '😮',
  CRY: '😢',
  ANGER: '😡',
  THUMBS_UP: '👍',
  THUMBS_DOWN: '👎'
}

// Ensure data directory exists
async function ensureDataDir() {
  const dataDir = path.join(process.cwd(), 'data')
  try {
    await fs.access(dataDir)
  } catch {
    await fs.mkdir(dataDir, { recursive: true })
  }
}

// GET - Fetch reaction emoji config
export const GET = withAuth(async (request: NextRequest, user: any) => {
  try {
    // Only admins can access
    if (!user?.isAdmin) {
      return NextResponse.json(
        { success: false, error: 'Admin access required' },
        { status: 403 }
      )
    }

    await ensureDataDir()

    try {
      const data = await fs.readFile(CONFIG_FILE, 'utf-8')
      const config = JSON.parse(data)
      return NextResponse.json({
        success: true,
        config
      })
    } catch (error) {
      // File doesn't exist, return defaults
      return NextResponse.json({
        success: true,
        config: defaultEmojis
      })
    }
  } catch (error) {
    console.error('Error fetching reaction emoji config:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch config' },
      { status: 500 }
    )
  }
})

// POST - Update reaction emoji config
export const POST = withAuth(async (request: NextRequest, user: any) => {
  try {
    // Only admins can update
    if (!user?.isAdmin) {
      return NextResponse.json(
        { success: false, error: 'Admin access required' },
        { status: 403 }
      )
    }

    const { config } = await request.json()

    // Validate config has all required keys
    const requiredKeys: (keyof ReactionEmojiConfig)[] = [
      'HAPPY', 'LAUGH', 'LOVE', 'SHOCK', 'CRY', 'ANGER', 'THUMBS_UP', 'THUMBS_DOWN'
    ]

    for (const key of requiredKeys) {
      if (!config[key] || typeof config[key] !== 'string') {
        return NextResponse.json(
          { success: false, error: `Missing or invalid emoji for ${key}` },
          { status: 400 }
        )
      }
    }

    await ensureDataDir()
    await fs.writeFile(CONFIG_FILE, JSON.stringify(config, null, 2), 'utf-8')

    return NextResponse.json({
      success: true,
      message: 'Reaction emoji config updated successfully'
    })
  } catch (error) {
    console.error('Error updating reaction emoji config:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to update config' },
      { status: 500 }
    )
  }
})
