export function getYouTubeVideoId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/v\/([a-zA-Z0-9_-]{11})/
  ]

  for (const pattern of patterns) {
    const match = url.match(pattern)
    if (match) {
      return match[1]
    }
  }

  return null
}

export function isYouTubeUrl(url: string): boolean {
  return getYouTubeVideoId(url) !== null
}

export function getYouTubeEmbedUrl(url: string): string | null {
  const videoId = getYouTubeVideoId(url)
  if (!videoId) return null
  return `https://www.youtube.com/embed/${videoId}`
}

export function isImageUrl(url: string): boolean {
  const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg']
  const urlLower = url.toLowerCase()
  return imageExtensions.some(ext => urlLower.includes(ext))
}

export function isVideoUrl(url: string): boolean {
  const videoExtensions = ['.mp4', '.webm', '.ogg', '.mov', '.avi']
  const urlLower = url.toLowerCase()
  return videoExtensions.some(ext => urlLower.includes(ext))
}

export function getGiphyId(url: string): string | null {
  const patterns = [
    /giphy\.com\/gifs\/.*-([a-zA-Z0-9]+)$/,
    /giphy\.com\/gifs\/([a-zA-Z0-9]+)$/,
    /media\.giphy\.com\/media\/([a-zA-Z0-9]+)/,
    /gph\.is\/([a-zA-Z0-9]+)$/
  ]

  for (const pattern of patterns) {
    const match = url.match(pattern)
    if (match) {
      return match[1]
    }
  }

  return null
}

export function isGiphyUrl(url: string): boolean {
  return getGiphyId(url) !== null
}

export function getGiphyEmbedUrl(url: string): string | null {
  const giphyId = getGiphyId(url)
  if (!giphyId) return null
  return `https://giphy.com/embed/${giphyId}`
}

export function detectMediaType(url: string): 'youtube' | 'giphy' | 'image' | 'video' | 'link' {
  if (isYouTubeUrl(url)) return 'youtube'
  if (isGiphyUrl(url)) return 'giphy'
  if (isImageUrl(url)) return 'image'
  if (isVideoUrl(url)) return 'video'
  return 'link'
}