import { Metadata } from 'next'
import PostClient from './PostClient'

const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://pebloq.gmgnrepeat.com'

type Props = {
  params: { id: string }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  try {
    // Fetch post data for metadata
    const res = await fetch(`${baseUrl}/api/posts/${params.id}`, {
      cache: 'no-store',
    })

    if (!res.ok) {
      return {
        title: 'Post Not Found',
      }
    }

    const data = await res.json()
    const post = data.post

    // Truncate content for description
    const description = post.content?.slice(0, 155) || 'View this post on PeBloq'
    const title = `${post.author?.displayName || post.author?.username}'s Post`

    // Generate dynamic OG image URL
    const ogImageUrl = `${baseUrl}/api/og?type=post&title=${encodeURIComponent(
      title
    )}&description=${encodeURIComponent(description)}`

    return {
      title,
      description,
      openGraph: {
        title,
        description,
        type: 'article',
        publishedTime: post.createdAt,
        authors: [post.author?.displayName || post.author?.username],
        images: [
          {
            url: ogImageUrl,
            width: 1200,
            height: 630,
            alt: title,
          },
        ],
      },
      twitter: {
        card: 'summary_large_image',
        title,
        description,
        images: [ogImageUrl],
      },
    }
  } catch (error) {
    console.error('Error generating post metadata:', error)
    return {
      title: 'Post on PeBloq',
    }
  }
}

export default function PostPage({ params }: Props) {
  return <PostClient params={params} />
}
