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
      return NextResponse.redirect('/settings?error=discord_auth_cancelled')
    }

    if (!code || !state) {
      return NextResponse.redirect('/settings?error=discord_auth_failed')
    }

    // Decode state to get wallet address
    let walletAddress: string
    try {
      const stateData = JSON.parse(Buffer.from(state, 'base64').toString())
      walletAddress = stateData.walletAddress
    } catch (e) {
      return NextResponse.redirect('/settings?error=invalid_state')
    }

    // Exchange code for access token
    const discordClientId = process.env.DISCORD_CLIENT_ID
    const discordClientSecret = process.env.DISCORD_CLIENT_SECRET
    const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000'

    if (!discordClientId || !discordClientSecret) {
      return NextResponse.redirect('/settings?error=discord_config_missing')
    }

    const tokenResponse = await fetch('https://discord.com/api/oauth2/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: discordClientId,
        client_secret: discordClientSecret,
        grant_type: 'authorization_code',
        code,
        redirect_uri: `${baseUrl}/api/auth/discord/callback`,
      }),
    })

    if (!tokenResponse.ok) {
      console.error('Discord token exchange failed:', await tokenResponse.text())
      return NextResponse.redirect('/settings?error=discord_token_failed')
    }

    const tokenData = await tokenResponse.json()

    // Get user info from Discord
    const userResponse = await fetch('https://discord.com/api/users/@me', {
      headers: {
        Authorization: `Bearer ${tokenData.access_token}`,
      },
    })

    if (!userResponse.ok) {
      console.error('Discord user fetch failed:', await userResponse.text())
      return NextResponse.redirect('/settings?error=discord_user_failed')
    }

    const discordUser = await userResponse.json()

    // Update user with Discord info
    try {
      await prisma.user.update({
        where: { walletAddress },
        data: {
          discordId: discordUser.id,
          discordName: `${discordUser.username}${discordUser.discriminator !== '0' ? `#${discordUser.discriminator}` : ''}`,
        },
      })

      // Store tokens securely (you might want to encrypt these)
      // For now, we'll just store the access token for notifications
      await prisma.user.update({
        where: { walletAddress },
        data: {
          profile: {
            upsert: {
              create: {
                socialLinks: JSON.stringify({
                  discord: {
                    id: discordUser.id,
                    username: discordUser.username,
                    accessToken: tokenData.access_token, // Consider encrypting this
                    refreshToken: tokenData.refresh_token,
                    expiresAt: new Date(Date.now() + tokenData.expires_in * 1000).toISOString(),
                  }
                })
              },
              update: {
                socialLinks: JSON.stringify({
                  ...JSON.parse((await prisma.profile.findFirst({ where: { user: { walletAddress } } }))?.socialLinks || '{}'),
                  discord: {
                    id: discordUser.id,
                    username: discordUser.username,
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

      return NextResponse.redirect('/settings?success=discord_connected')
    } catch (dbError) {
      console.error('Database update failed:', dbError)
      return NextResponse.redirect('/settings?error=discord_db_failed')
    }
  } catch (error) {
    console.error('Discord callback error:', error)
    return NextResponse.redirect('/settings?error=discord_callback_failed')
  }
}