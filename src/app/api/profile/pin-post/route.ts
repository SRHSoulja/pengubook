import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withAuth } from '@/lib/auth-middleware'

export const dynamic = 'force-dynamic'

// Pin or unpin a post to user's profile
export const POST = withAuth(async (request: NextRequest, user: any) => {
  try {
    const body = await request.json()
    const { postId } = body

    if (!postId) {
      return NextResponse.json(
        { error: 'Post ID is required' },
        { status: 400 }
      )
    }

    // Verify the post exists and belongs to the user
    const post = await prisma.post.findUnique({
      where: { id: postId }
    })

    if (!post) {
      return NextResponse.json(
        { error: 'Post not found' },
        { status: 404 }
      )
    }

    if (post.authorId !== user.id) {
      return NextResponse.json(
        { error: 'You can only pin your own posts' },
        { status: 403 }
      )
    }

    // Get or create user profile
    let profile = await prisma.profile.findUnique({
      where: { userId: user.id }
    })

    if (!profile) {
      profile = await prisma.profile.create({
        data: { userId: user.id }
      })
    }

    // Toggle pin: if already pinned, unpin it; otherwise pin it
    const newPinnedPostId = profile.pinnedPostId === postId ? null : postId

    const updatedProfile = await prisma.profile.update({
      where: { userId: user.id },
      data: { pinnedPostId: newPinnedPostId }
    })

    return NextResponse.json({
      success: true,
      isPinned: newPinnedPostId !== null,
      pinnedPostId: newPinnedPostId
    })
  } catch (error) {
    console.error('Error pinning post:', error)
    return NextResponse.json(
      { error: 'Failed to pin post' },
      { status: 500 }
    )
  }
})
