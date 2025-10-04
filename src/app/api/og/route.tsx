import { ImageResponse } from '@vercel/og'
import { NextRequest } from 'next/server'

export const runtime = 'edge'

const PENGU_GREEN = '#00E177'
const PENGU_ORANGE = '#FFB92E'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)

    // Get parameters
    const title = searchParams.get('title') || 'PeBloq'
    const description = searchParams.get('description') || 'Web3 Social Platform'
    const type = searchParams.get('type') || 'default' // default, post, profile, community
    const username = searchParams.get('username')
    const avatar = searchParams.get('avatar')

    return new ImageResponse(
      (
        <div
          style={{
            height: '100%',
            width: '100%',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
            position: 'relative',
          }}
        >
          {/* Background Pattern */}
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundImage: `radial-gradient(circle at 25px 25px, ${PENGU_GREEN}15 2%, transparent 0%), radial-gradient(circle at 75px 75px, ${PENGU_ORANGE}10 2%, transparent 0%)`,
              backgroundSize: '100px 100px',
            }}
          />

          {/* Content Container */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '60px',
              zIndex: 1,
            }}
          >
            {/* Logo/Brand */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                marginBottom: '40px',
              }}
            >
              <div
                style={{
                  fontSize: '72px',
                  fontWeight: 'bold',
                  color: PENGU_GREEN,
                  marginRight: '20px',
                }}
              >
                PeBloq
              </div>
              {type !== 'default' && (
                <div
                  style={{
                    fontSize: '36px',
                    color: '#94a3b8',
                  }}
                >
                  {type === 'post' && '📝'}
                  {type === 'profile' && '👤'}
                  {type === 'community' && '🌐'}
                </div>
              )}
            </div>

            {/* Avatar for profile */}
            {type === 'profile' && avatar && (
              <div
                style={{
                  display: 'flex',
                  marginBottom: '30px',
                }}
              >
                <img
                  src={avatar}
                  width={120}
                  height={120}
                  style={{
                    borderRadius: '60px',
                    border: `4px solid ${PENGU_GREEN}`,
                  }}
                />
              </div>
            )}

            {/* Title */}
            <div
              style={{
                fontSize: '56px',
                fontWeight: 'bold',
                color: 'white',
                textAlign: 'center',
                maxWidth: '900px',
                marginBottom: '20px',
                lineHeight: 1.2,
              }}
            >
              {title}
            </div>

            {/* Username for profile */}
            {type === 'profile' && username && (
              <div
                style={{
                  fontSize: '32px',
                  color: PENGU_GREEN,
                  marginBottom: '20px',
                }}
              >
                @{username}
              </div>
            )}

            {/* Description */}
            <div
              style={{
                fontSize: '32px',
                color: '#cbd5e1',
                textAlign: 'center',
                maxWidth: '800px',
                lineHeight: 1.4,
              }}
            >
              {description}
            </div>
          </div>

          {/* Footer Badge */}
          <div
            style={{
              position: 'absolute',
              bottom: '40px',
              right: '40px',
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              padding: '16px 24px',
              background: 'rgba(0, 225, 119, 0.1)',
              borderRadius: '12px',
              border: `2px solid ${PENGU_GREEN}`,
            }}
          >
            <div style={{ color: PENGU_GREEN, fontSize: '24px' }}>⚡</div>
            <div style={{ color: 'white', fontSize: '20px', fontWeight: 600 }}>
              Powered by Abstract
            </div>
          </div>
        </div>
      ),
      {
        width: 1200,
        height: 630,
      }
    )
  } catch (e: any) {
    console.error('Error generating OG image:', e.message)
    return new Response(`Failed to generate image: ${e.message}`, {
      status: 500,
    })
  }
}
