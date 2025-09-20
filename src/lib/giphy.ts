/**
 * GIPHY API integration for GIF search and trending
 * This is a mock implementation - replace with actual GIPHY API key in production
 */

interface GiphyGif {
  id: string
  title: string
  url: string
  images: {
    fixed_height: {
      url: string
      width: string
      height: string
    }
    fixed_width_small: {
      url: string
      width: string
      height: string
    }
    original: {
      url: string
      width: string
      height: string
    }
  }
}

interface GiphyResponse {
  data: GiphyGif[]
  pagination: {
    total_count: number
    count: number
    offset: number
  }
}

export class GiphyService {
  private static readonly API_KEY = process.env.NEXT_PUBLIC_GIPHY_API_KEY || 'demo_api_key'
  private static readonly BASE_URL = 'https://api.giphy.com/v1/gifs'

  /**
   * Search for GIFs
   */
  static async search(query: string, limit = 25, offset = 0): Promise<GiphyResponse> {
    try {
      const url = new URL(`${this.BASE_URL}/search`)
      url.searchParams.set('api_key', this.API_KEY)
      url.searchParams.set('q', query)
      url.searchParams.set('limit', limit.toString())
      url.searchParams.set('offset', offset.toString())
      url.searchParams.set('rating', 'pg-13')
      url.searchParams.set('lang', 'en')

      const response = await fetch(url.toString())

      if (!response.ok) {
        throw new Error(`GIPHY API error: ${response.status}`)
      }

      return await response.json()
    } catch (error) {
      console.error('Error searching GIFs:', error)

      // Return mock data for demo purposes
      return this.getMockGifs(query, limit)
    }
  }

  /**
   * Get trending GIFs
   */
  static async trending(limit = 25, offset = 0): Promise<GiphyResponse> {
    try {
      const url = new URL(`${this.BASE_URL}/trending`)
      url.searchParams.set('api_key', this.API_KEY)
      url.searchParams.set('limit', limit.toString())
      url.searchParams.set('offset', offset.toString())
      url.searchParams.set('rating', 'pg-13')

      const response = await fetch(url.toString())

      if (!response.ok) {
        throw new Error(`GIPHY API error: ${response.status}`)
      }

      return await response.json()
    } catch (error) {
      console.error('Error fetching trending GIFs:', error)

      // Return mock data for demo purposes
      return this.getMockGifs('trending', limit)
    }
  }

  /**
   * Get GIF by ID
   */
  static async getById(id: string): Promise<GiphyGif | null> {
    try {
      const url = new URL(`${this.BASE_URL}/${id}`)
      url.searchParams.set('api_key', this.API_KEY)

      const response = await fetch(url.toString())

      if (!response.ok) {
        throw new Error(`GIPHY API error: ${response.status}`)
      }

      const data = await response.json()
      return data.data
    } catch (error) {
      console.error('Error fetching GIF by ID:', error)
      return null
    }
  }

  /**
   * Generate mock GIF data for development/demo
   */
  private static getMockGifs(query: string, limit: number): GiphyResponse {
    const mockGifs: GiphyGif[] = []

    const categories = [
      { emoji: '😂', name: 'funny' },
      { emoji: '🎉', name: 'celebration' },
      { emoji: '❤️', name: 'love' },
      { emoji: '👋', name: 'wave' },
      { emoji: '🔥', name: 'fire' },
      { emoji: '💯', name: 'perfect' },
      { emoji: '🚀', name: 'rocket' },
      { emoji: '🎭', name: 'theater' },
      { emoji: '🌟', name: 'star' },
      { emoji: '⚡', name: 'lightning' }
    ]

    for (let i = 0; i < Math.min(limit, 20); i++) {
      const category = categories[i % categories.length]
      const mockGif: GiphyGif = {
        id: `mock_${query}_${i}`,
        title: `${category.name} GIF ${i + 1}`,
        url: `https://giphy.com/gifs/mock-${i}`,
        images: {
          fixed_height: {
            url: `https://via.placeholder.com/300x200/667eea/ffffff?text=${encodeURIComponent(category.emoji)}`,
            width: '300',
            height: '200'
          },
          fixed_width_small: {
            url: `https://via.placeholder.com/200x133/667eea/ffffff?text=${encodeURIComponent(category.emoji)}`,
            width: '200',
            height: '133'
          },
          original: {
            url: `https://via.placeholder.com/400x300/667eea/ffffff?text=${encodeURIComponent(category.emoji)}`,
            width: '400',
            height: '300'
          }
        }
      }
      mockGifs.push(mockGif)
    }

    return {
      data: mockGifs,
      pagination: {
        total_count: 1000,
        count: mockGifs.length,
        offset: 0
      }
    }
  }

  /**
   * Get popular search terms
   */
  static getPopularSearches(): string[] {
    return [
      'happy',
      'excited',
      'love',
      'funny',
      'celebration',
      'dance',
      'thumbs up',
      'wave',
      'heart',
      'fire',
      'mind blown',
      'clapping',
      'yes',
      'no',
      'confused',
      'thinking',
      'sleeping',
      'working',
      'eating',
      'coffee'
    ]
  }

  /**
   * Format GIF URL for display
   */
  static getDisplayUrl(gif: GiphyGif, size: 'small' | 'medium' | 'large' = 'medium'): string {
    switch (size) {
      case 'small':
        return gif.images.fixed_width_small.url
      case 'large':
        return gif.images.original.url
      default:
        return gif.images.fixed_height.url
    }
  }
}