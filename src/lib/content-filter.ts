interface MutedPhrase {
  id: string
  phrase: string
  isRegex: boolean
  muteType: 'HIDE' | 'WARN'
  scope: 'ALL' | 'POSTS' | 'COMMENTS'
  expiresAt: Date | null
}

interface ContentItem {
  content: string
  type: 'post' | 'comment'
}

interface FilterResult {
  shouldHide: boolean
  shouldWarn: boolean
  matchedPhrases: string[]
}

export function filterContent(
  contentItem: ContentItem,
  mutedPhrases: MutedPhrase[]
): FilterResult {
  const result: FilterResult = {
    shouldHide: false,
    shouldWarn: false,
    matchedPhrases: []
  }

  if (!contentItem.content || mutedPhrases.length === 0) {
    return result
  }

  const now = new Date()
  const relevantPhrases = mutedPhrases.filter(phrase => {
    // Check if phrase is expired
    if (phrase.expiresAt && phrase.expiresAt <= now) {
      return false
    }

    // Check if phrase applies to this content type
    if (phrase.scope === 'POSTS' && contentItem.type !== 'post') {
      return false
    }
    if (phrase.scope === 'COMMENTS' && contentItem.type !== 'comment') {
      return false
    }

    return true
  })

  for (const phrase of relevantPhrases) {
    let isMatch = false

    try {
      if (phrase.isRegex) {
        // Use regex matching (case-insensitive)
        const regex = new RegExp(phrase.phrase, 'i')
        isMatch = regex.test(contentItem.content)
      } else {
        // Simple case-insensitive substring matching
        isMatch = contentItem.content.toLowerCase().includes(phrase.phrase.toLowerCase())
      }
    } catch (error) {
      // If regex is invalid, skip this phrase
      console.warn('Invalid regex pattern in muted phrase:', phrase.phrase, error)
      continue
    }

    if (isMatch) {
      result.matchedPhrases.push(phrase.phrase)

      if (phrase.muteType === 'HIDE') {
        result.shouldHide = true
        // If any phrase says hide, we hide (strongest action)
        break
      } else if (phrase.muteType === 'WARN') {
        result.shouldWarn = true
        // Continue checking for HIDE phrases
      }
    }
  }

  return result
}

export function getContentFilterSummary(matchedPhrases: string[]): string {
  if (matchedPhrases.length === 0) {
    return ''
  }

  if (matchedPhrases.length === 1) {
    return `Content filtered due to muted phrase: "${matchedPhrases[0]}"`
  }

  return `Content filtered due to ${matchedPhrases.length} muted phrases`
}