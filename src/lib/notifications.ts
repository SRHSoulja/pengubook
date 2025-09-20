import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

interface NotificationOptions {
  title: string
  message: string
  recipientUserId: string
  type?: 'tip' | 'follow' | 'friend_request' | 'mention' | 'general'
}

export async function sendDiscordNotification(options: NotificationOptions) {
  try {
    const user = await prisma.user.findUnique({
      where: { id: options.recipientUserId },
      include: { profile: true }
    })

    if (!user?.profile?.socialLinks) return false

    const socialLinks = JSON.parse(user.profile.socialLinks)
    const discordData = socialLinks.discord

    if (!discordData?.accessToken || !discordData?.id) return false

    // Check if token is expired
    if (new Date() > new Date(discordData.expiresAt)) {
      console.log('Discord token expired, needs refresh')
      return false
    }

    // Send DM via Discord API
    // Note: This requires the bot to share a server with the user or have prior DM history
    const dmChannelResponse = await fetch('https://discord.com/api/users/@me/channels', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${discordData.accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        recipient_id: discordData.id
      })
    })

    if (!dmChannelResponse.ok) {
      console.error('Failed to create Discord DM channel')
      return false
    }

    const dmChannel = await dmChannelResponse.json()

    // Send the message
    const messageResponse = await fetch(`https://discord.com/api/channels/${dmChannel.id}/messages`, {
      method: 'POST',
      headers: {
        'Authorization': `Bot ${process.env.DISCORD_BOT_TOKEN}`, // You'll need a bot token
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        embeds: [{
          title: options.title,
          description: options.message,
          color: 0x00AFF4, // PenguBook blue
          footer: {
            text: 'PenguBook',
            icon_url: 'https://your-domain.com/penguin-icon.png'
          }
        }]
      })
    })

    return messageResponse.ok
  } catch (error) {
    console.error('Discord notification error:', error)
    return false
  }
}

export async function sendTwitterNotification(options: NotificationOptions) {
  try {
    const user = await prisma.user.findUnique({
      where: { id: options.recipientUserId },
      include: { profile: true }
    })

    if (!user?.profile?.socialLinks) return false

    const socialLinks = JSON.parse(user.profile.socialLinks)
    const twitterData = socialLinks.twitter

    if (!twitterData?.accessToken || !twitterData?.id) return false

    // Check if token is expired
    if (new Date() > new Date(twitterData.expiresAt)) {
      console.log('Twitter token expired, needs refresh')
      return false
    }

    // For Twitter, we can't send DMs directly due to API restrictions
    // Instead, we could create a tweet mentioning the user (if they allow it)
    // or use Twitter's webhook/notification system

    // This is a placeholder - actual implementation depends on your notification strategy
    // You might want to use Twitter's Direct Message API if you have access
    console.log(`Would send Twitter notification to ${twitterData.username}: ${options.message}`)

    return true
  } catch (error) {
    console.error('Twitter notification error:', error)
    return false
  }
}

export async function sendNotifications(options: NotificationOptions) {
  const results = {
    discord: false,
    twitter: false
  }

  // Send notifications in parallel
  const [discordResult, twitterResult] = await Promise.allSettled([
    sendDiscordNotification(options),
    sendTwitterNotification(options)
  ])

  if (discordResult.status === 'fulfilled') {
    results.discord = discordResult.value
  }

  if (twitterResult.status === 'fulfilled') {
    results.twitter = twitterResult.value
  }

  return results
}

// Example usage in your tip/follow/friend request handlers:
export async function notifyUserOfTip(fromUserId: string, toUserId: string, amount: string, token: string) {
  const fromUser = await prisma.user.findUnique({ where: { id: fromUserId } })

  if (!fromUser) return

  return sendNotifications({
    title: '🎁 New Tip Received!',
    message: `${fromUser.displayName} sent you ${amount} ${token} on PenguBook!`,
    recipientUserId: toUserId,
    type: 'tip'
  })
}

export async function notifyUserOfFollow(fromUserId: string, toUserId: string) {
  const fromUser = await prisma.user.findUnique({ where: { id: fromUserId } })

  if (!fromUser) return

  return sendNotifications({
    title: '🐧 New Follower!',
    message: `${fromUser.displayName} started following you on PenguBook!`,
    recipientUserId: toUserId,
    type: 'follow'
  })
}

export async function notifyUserOfFriendRequest(fromUserId: string, toUserId: string) {
  const fromUser = await prisma.user.findUnique({ where: { id: fromUserId } })

  if (!fromUser) return

  return sendNotifications({
    title: '🤝 Friend Request!',
    message: `${fromUser.displayName} sent you a friend request on PenguBook!`,
    recipientUserId: toUserId,
    type: 'friend_request'
  })
}