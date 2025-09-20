import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const code = searchParams.get('code')
    const state = searchParams.get('state')
    const error = searchParams.get('error')

    if (error) {
      return NextResponse.redirect('/settings?error=twitter_auth_cancelled')
    }

    if (!code || !state) {
      return NextResponse.redirect('/settings?error=twitter_auth_failed')
    }

    // Decode state to get wallet address and code verifier
    let walletAddress: string
    let codeVerifier: string
    try {
      const stateData = JSON.parse(Buffer.from(state, 'base64').toString())
      walletAddress = stateData.walletAddress
      codeVerifier = stateData.codeVerifier
    } catch (e) {
      return NextResponse.redirect('/settings?error=invalid_state')
    }

    // Exchange code for access token
    const twitterClientId = process.env.TWITTER_CLIENT_ID
    const twitterClientSecret = process.env.TWITTER_CLIENT_SECRET
    const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000'

    if (!twitterClientId || !twitterClientSecret) {
      return NextResponse.redirect('/settings?error=twitter_config_missing')
    }

    const tokenResponse = await fetch('https://api.twitter.com/2/oauth2/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${Buffer.from(`${twitterClientId}:${twitterClientSecret}`).toString('base64')}`,
      },
      body: new URLSearchParams({
        code,
        grant_type: 'authorization_code',
        client_id: twitterClientId,
        redirect_uri: `${baseUrl}/api/auth/twitter/callback`,
        code_verifier: codeVerifier,
      }),
    })

    if (!tokenResponse.ok) {
      console.error('Twitter token exchange failed:', await tokenResponse.text())
      return NextResponse.redirect('/settings?error=twitter_token_failed')
    }

    const tokenData = await tokenResponse.json()

    // Get user info from Twitter
    const userResponse = await fetch('https://api.twitter.com/2/users/me?user.fields=id,username,name,profile_image_url', {
      headers: {
        Authorization: `Bearer ${tokenData.access_token}`,
      },
    })

    if (!userResponse.ok) {
      console.error('Twitter user fetch failed:', await userResponse.text())
      return NextResponse.redirect('/settings?error=twitter_user_failed')
    }

    const { data: twitterUser } = await userResponse.json()

    // Update user with Twitter info
    try {
      await prisma.user.update({
        where: { walletAddress },
        data: {
          twitterId: twitterUser.id,
          twitterHandle: `@${twitterUser.username}`,
        },
      })

      // Store tokens securely for notifications
      const existingProfile = await prisma.profile.findFirst({ where: { user: { walletAddress } } })
      const existingSocialLinks = existingProfile?.socialLinks ? JSON.parse(existingProfile.socialLinks) : {}

      await prisma.user.update({
        where: { walletAddress },
        data: {
          profile: {
            upsert: {
              create: {
                socialLinks: JSON.stringify({
                  ...existingSocialLinks,
                  twitter: {
                    id: twitterUser.id,
                    username: twitterUser.username,
                    name: twitterUser.name,
                    profileImageUrl: twitterUser.profile_image_url,
                    accessToken: tokenData.access_token, // Consider encrypting this
                    refreshToken: tokenData.refresh_token,
                    expiresAt: new Date(Date.now() + tokenData.expires_in * 1000).toISOString(),
                  }
                })
              },
              update: {
                socialLinks: JSON.stringify({
                  ...existingSocialLinks,
                  twitter: {
                    id: twitterUser.id,
                    username: twitterUser.username,
                    name: twitterUser.name,
                    profileImageUrl: twitterUser.profile_image_url,
                    accessToken: tokenData.access_token, // Consider encrypting this
                    refreshToken: tokenData.refresh_token,
                    expiresAt: new Date(Date.now() + tokenData.expires_in * 1000).toISOString(),
                  }
                })
              }
            }
          }
        }
      })

      return NextResponse.redirect('/settings?success=twitter_connected')
    } catch (dbError) {
      console.error('Database update failed:', dbError)
      return NextResponse.redirect('/settings?error=twitter_db_failed')
    }
  } catch (error) {
    console.error('Twitter callback error:', error)
    return NextResponse.redirect('/settings?error=twitter_callback_failed')
  }
}