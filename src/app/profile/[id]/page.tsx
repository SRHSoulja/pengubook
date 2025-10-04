import { Metadata } from 'next'
import ProfileClient from './ProfileClient'

const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://pebloq.gmgnrepeat.com'

type Props = {
  params: { id: string }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  try {
    // Fetch user profile data for metadata
    const res = await fetch(`${baseUrl}/api/users/${params.id}`, {
      cache: 'no-store',
    })

    if (!res.ok) {
      return {
        title: 'Profile Not Found',
      }
    }

    const data = await res.json()
    const user = data.user

    const title = `${user.displayName || user.username} (@${user.username})`
    const description = user.bio || `Level ${user.level} user on PeBloq`

    // Generate dynamic OG image with avatar
    const ogImageUrl = `${baseUrl}/api/og?type=profile&title=${encodeURIComponent(
      user.displayName || user.username
    )}&username=${encodeURIComponent(user.username)}&description=${encodeURIComponent(
      description
    )}&avatar=${encodeURIComponent(user.avatar || '')}`

    return {
      title,
      description,
      openGraph: {
        title,
        description,
        type: 'profile',
        username: user.username,
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
    console.error('Error generating profile metadata:', error)
    return {
      title: 'Profile on PeBloq',
    }
  }
}

export default function ProfilePage({ params }: Props) {
  return <ProfileClient params={params} />
}
