import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const walletAddress = searchParams.get('wallet')

    if (!walletAddress) {
      return NextResponse.json({ error: 'Wallet address required' }, { status: 400 })
    }

    const discordClientId = process.env.DISCORD_CLIENT_ID
    const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000'

    if (!discordClientId) {
      return NextResponse.json({ error: 'Discord OAuth not configured' }, { status: 500 })
    }

    // Store wallet address in session/state for callback
    const state = Buffer.from(JSON.stringify({ walletAddress })).toString('base64')

    const discordAuthUrl = new URL('https://discord.com/api/oauth2/authorize')
    discordAuthUrl.searchParams.set('client_id', discordClientId)
    discordAuthUrl.searchParams.set('redirect_uri', `${baseUrl}/api/auth/discord/callback`)
    discordAuthUrl.searchParams.set('response_type', 'code')
    discordAuthUrl.searchParams.set('scope', 'identify')
    discordAuthUrl.searchParams.set('state', state)

    return NextResponse.redirect(discordAuthUrl.toString())
  } catch (error) {
    console.error('Discord OAuth error:', error)
    return NextResponse.json({ error: 'OAuth initialization failed' }, { status: 500 })
  }
}