import { Metadata } from 'next'
import CommunityClient from './CommunityClient'

const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://pebloq.gmgnrepeat.com'

type Props = {
  params: { id: string }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  try {
    // Fetch community data for metadata
    const res = await fetch(`${baseUrl}/api/communities/${params.id}`, {
      cache: 'no-store',
    })

    if (!res.ok) {
      return {
        title: 'Community Not Found',
      }
    }

    const data = await res.json()
    const community = data.community

    const title = community.displayName || community.name
    const description =
      community.description || `Join the ${title} community on PeBloq`

    // Generate dynamic OG image
    const ogImageUrl = `${baseUrl}/api/og?type=community&title=${encodeURIComponent(
      title
    )}&description=${encodeURIComponent(description)}`

    return {
      title,
      description,
      openGraph: {
        title,
        description,
        type: 'website',
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
    console.error('Error generating community metadata:', error)
    return {
      title: 'Community on PeBloq',
    }
  }
}

export default function CommunityPage({ params }: Props) {
  return <CommunityClient params={params} />
}
