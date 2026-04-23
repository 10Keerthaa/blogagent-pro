import { ImageResponse } from 'next/og';

export const runtime = 'edge';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const title = searchParams.get('title') || 'Blog Title';
    const bgUrl = searchParams.get('bg') || '';
    const logoUrl = searchParams.get('logo') || '';
    const tagUrl = searchParams.get('tag') || '';

    const titleParts = title.split(':');
    const mainTitle = titleParts[0] + (title.includes(':') ? ':' : '');
    const subtitle = titleParts.length > 1 ? titleParts.slice(1).join(':').trim() : '';

    return new ImageResponse(
      (
        <div
          style={{
            display: 'flex',
            width: '100%',
            height: '100%',
            position: 'relative',
            backgroundColor: '#000',
            overflow: 'hidden',
          }}
        >
          {bgUrl && (
            <img
              src={bgUrl}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                objectFit: 'cover',
              }}
            />
          )}

          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              backgroundColor: 'rgba(126, 87, 194, 0.45)',
            }}
          />

          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              width: '100%',
              height: '100%',
              padding: '40px',
              position: 'relative',
            }}
          >
            <div style={{ display: 'flex', marginBottom: '20px' }}>
              {tagUrl && <img src={tagUrl} style={{ height: '40px', width: 'auto' }} />}
            </div>

            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                marginTop: '40px',
                width: '85%',
              }}
            >
              <h1
                style={{
                  fontSize: '56px',
                  fontWeight: 700,
                  color: 'white',
                  lineHeight: 1.2,
                  margin: 0,
                  fontFamily: 'sans-serif',
                  textShadow: '0 4px 10px rgba(0,0,0,0.5)',
                }}
              >
                {mainTitle}
              </h1>
              {subtitle && (
                <p
                  style={{
                    fontSize: '44px',
                    color: 'white',
                    opacity: 0.95,
                    lineHeight: 1.2,
                    marginTop: '15px',
                    fontFamily: 'sans-serif',
                    textShadow: '0 2px 8px rgba(0,0,0,0.4)',
                  }}
                >
                  {subtitle}
                </p>
              )}
            </div>

            <div
              style={{
                display: 'flex',
                position: 'absolute',
                bottom: '40px',
                right: '40px',
              }}
            >
              {logoUrl && <img src={logoUrl} style={{ height: '56px', width: 'auto' }} />}
            </div>
          </div>
        </div>
      ),
      {
        width: 1200,
        height: 630,
      }
    );
  } catch (e: any) {
    return new Response(`Failed to generate image: ${e.message}`, { status: 500 });
  }
}
