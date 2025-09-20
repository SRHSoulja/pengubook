import { NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export async function POST() {
  try {
    const messages = [
      {
        senderUsername: 'ice_queen_23',
        targetUsername: 'user_29FA02',
        content: 'Hey there! Hope you are enjoying PenguBook! The Arctic waters are perfect today. 🌊❄️'
      },
      {
        senderUsername: 'penguin_dev',
        targetUsername: 'user_29FA02',
        content: 'Welcome to the penguin colony! I heard you created an awesome community. Would love to check it out! 🐧💻'
      },
      {
        senderUsername: 'arctic_artist',
        targetUsername: 'user_29FA02',
        content: 'Your community looks amazing! I love the creative penguin vibes. Mind if I join? 🎨✨'
      }
    ]

    const sentMessages = []

    for (const msgData of messages) {
      // Get sender
      const sender = await prisma.user.findUnique({
        where: { username: msgData.senderUsername }
      })

      // Get target user
      const targetUser = await prisma.user.findUnique({
        where: { username: msgData.targetUsername }
      })

      if (!sender || !targetUser) {
        continue
      }

      // Create or find conversation
      const participantIds = [sender.id, targetUser.id].sort()

      let conversation = await prisma.conversation.findFirst({
        where: {
          participants: { equals: JSON.stringify(participantIds) }
        }
      })

      if (!conversation) {
        conversation = await prisma.conversation.create({
          data: {
            participants: JSON.stringify(participantIds)
          }
        })
      }

      // Create message
      const message = await prisma.message.create({
        data: {
          conversationId: conversation.id,
          senderId: sender.id,
          content: msgData.content,
          messageType: 'TEXT',
          mediaUrls: '[]'
        },
        include: {
          sender: {
            select: {
              id: true,
              username: true,
              displayName: true
            }
          }
        }
      })

      // Update conversation
      await prisma.conversation.update({
        where: { id: conversation.id },
        data: {
          lastMessage: msgData.content,
          lastMessageAt: new Date()
        }
      })

      sentMessages.push({
        from: sender.displayName,
        to: targetUser.displayName,
        content: msgData.content,
        conversationId: conversation.id
      })
    }

    return NextResponse.json({
      success: true,
      message: `Sent ${sentMessages.length} test messages`,
      messages: sentMessages
    })
  } catch (error) {
    console.error('Failed to send test messages:', error)
    return NextResponse.json(
      { error: 'Failed to send test messages' },
      { status: 500 }
    )
  }
}