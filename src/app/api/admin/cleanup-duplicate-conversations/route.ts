import { NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export async function POST() {
  try {
    // Get all conversations
    const allConversations = await prisma.conversation.findMany({
      include: {
        messages: true
      },
      orderBy: {
        createdAt: 'asc' // Keep oldest conversations
      }
    })

    // Group conversations by participants
    const conversationGroups = new Map<string, typeof allConversations>()

    for (const conversation of allConversations) {
      // Normalize participants order for consistent grouping
      const participants = JSON.parse(conversation.participants)
      const sortedParticipants = participants.sort()
      const key = JSON.stringify(sortedParticipants)

      if (!conversationGroups.has(key)) {
        conversationGroups.set(key, [])
      }
      conversationGroups.get(key)!.push(conversation)
    }

    let duplicatesRemoved = 0
    let messagesMoved = 0

    // Process each group to remove duplicates
    for (const [participantsKey, conversations] of Array.from(conversationGroups)) {
      if (conversations.length > 1) {
        // Find the conversation with messages or the oldest one
        const conversationWithMessages = conversations.find(c => c.messages.length > 0)
        const keepConversation = conversationWithMessages || conversations[0]

        // Conversations to remove (all except the one we're keeping)
        const toRemove = conversations.filter(c => c.id !== keepConversation.id)

        for (const duplicateConv of toRemove) {
          // Move any messages from duplicate to the kept conversation
          if (duplicateConv.messages.length > 0) {
            await prisma.message.updateMany({
              where: {
                conversationId: duplicateConv.id
              },
              data: {
                conversationId: keepConversation.id
              }
            })
            messagesMoved += duplicateConv.messages.length
          }

          // Delete the duplicate conversation
          await prisma.conversation.delete({
            where: { id: duplicateConv.id }
          })

          duplicatesRemoved++
        }

        // Update the kept conversation's lastMessage and lastMessageAt
        const lastMessage = await prisma.message.findFirst({
          where: {
            conversationId: keepConversation.id
          },
          orderBy: {
            createdAt: 'desc'
          }
        })

        if (lastMessage) {
          await prisma.conversation.update({
            where: { id: keepConversation.id },
            data: {
              lastMessage: lastMessage.content,
              lastMessageAt: lastMessage.createdAt
            }
          })
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: `Cleanup completed. Removed ${duplicatesRemoved} duplicate conversations, moved ${messagesMoved} messages.`,
      details: {
        duplicatesRemoved,
        messagesMoved,
        conversationGroupsProcessed: conversationGroups.size
      }
    })
  } catch (error) {
    console.error('Failed to cleanup duplicate conversations:', error)
    return NextResponse.json(
      { error: 'Failed to cleanup duplicate conversations' },
      { status: 500 }
    )
  }
}