import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withAuth } from '@/lib/auth-middleware'
import { logger, logAPI } from '@/lib/logger'

export const dynamic = 'force-dynamic'

// Delete a muted phrase
export const DELETE = withAuth(async (
  request: NextRequest,
  user: any,
  { params }: { params: { id: string } }
) => {
  try {
    const mutedPhraseId = params.id

    if (!mutedPhraseId) {
      return NextResponse.json(
        { error: 'Muted phrase ID is required' },
        { status: 400 }
      )
    }

    

    // Check if the muted phrase exists and belongs to the user
    const mutedPhrase = await prisma.mutedPhrase.findUnique({
      where: { id: mutedPhraseId },
      select: { id: true, userId: true, phrase: true }
    })

    if (!mutedPhrase) {
      return NextResponse.json(
        { error: 'Muted phrase not found' },
        { status: 404 }
      )
    }

    // Verify ownership
    if (mutedPhrase.userId !== user.id) {
      return NextResponse.json(
        { error: 'You can only delete your own muted phrases' },
        { status: 403 }
      )
    }

    // Delete the muted phrase
    await prisma.mutedPhrase.delete({
      where: { id: mutedPhraseId }
    })


    logger.info('Muted phrase deleted', {
      mutedPhraseId,
      userId: user.id,
      phraseLength: mutedPhrase.phrase.length
    }, 'MutedPhrases')

    return NextResponse.json({
      success: true,
      content: 'Muted phrase deleted successfully'
    })

  } catch (error: any) {
    logAPI.error('muted-phrases/delete', error)
    return NextResponse.json(
      { error: 'Failed to delete muted phrase', details: error.message },
      { status: 500 }
    )
  }
})