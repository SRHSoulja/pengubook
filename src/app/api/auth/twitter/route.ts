import { NextRequest, NextResponse } from 'next/server'
import { randomBytes } from 'crypto'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const walletAddress = searchParams.get('wallet')

    if (!walletAddress) {
      return NextResponse.json({ error: 'Wallet address required' }, { status: 400 })
    }

    const twitterClientId = process.env.TWITTER_CLIENT_ID
    const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000'

    if (!twitterClientId) {
      return NextResponse.json({ error: 'Twitter OAuth not configured' }, { status: 500 })
    }

    // Generate code verifier and challenge for PKCE (Twitter OAuth 2.0)
    const codeVerifier = randomBytes(32).toString('base64url')
    const codeChallenge = Buffer.from(
      await crypto.subtle.digest('SHA-256', new TextEncoder().encode(codeVerifier))
    ).toString('base64url')

    // Store wallet address and code verifier in session/state for callback
    const state = Buffer.from(JSON.stringify({
      walletAddress,
      codeVerifier
    })).toString('base64')

    const twitterAuthUrl = new URL('https://twitter.com/i/oauth2/authorize')
    twitterAuthUrl.searchParams.set('response_type', 'code')
    twitterAuthUrl.searchParams.set('client_id', twitterClientId)
    twitterAuthUrl.searchParams.set('redirect_uri', `${baseUrl}/api/auth/twitter/callback`)
    twitterAuthUrl.searchParams.set('scope', 'tweet.read users.read offline.access')
    twitterAuthUrl.searchParams.set('state', state)
    twitterAuthUrl.searchParams.set('code_challenge', codeChallenge)
    twitterAuthUrl.searchParams.set('code_challenge_method', 'S256')

    return NextResponse.redirect(twitterAuthUrl.toString())
  } catch (error) {
    console.error('Twitter OAuth error:', error)
    return NextResponse.json({ error: 'OAuth initialization failed' }, { status: 500 })
  }
}