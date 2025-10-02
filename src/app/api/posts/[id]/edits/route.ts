import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id: postId } = params

    

    // Check if post exists
    const post = await prisma.post.findUnique({
      where: { id: postId },
      select: { id: true, authorId: true }
    })

    if (!post) {
      return NextResponse.json(
        { error: 'Post not found' },
        { status: 404 }
      )
    }

    // Get edit history
    const edits = await prisma.postEdit.findMany({
      where: { postId },
      include: {
        editor: {
          select: {
            id: true,
            username: true,
            displayName: true,
            avatar: true,
            isAdmin: true
          }
        }
      },
      orderBy: {
        editedAt: 'desc'
      }
    })


    const formattedEdits = edits.map(edit => ({
      id: edit.id,
      previousContent: edit.previousContent,
      newContent: edit.newContent,
      editedAt: edit.editedAt,
      editor: edit.editor
    }))

    return NextResponse.json({
      success: true,
      edits: formattedEdits
    })

  } catch (error: any) {
    console.error('[Post Edits] GET error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch edit history', details: error.message },
      { status: 500 }
    )
  }
}