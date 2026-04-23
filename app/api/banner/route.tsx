import { ImageResponse } from 'next/og';

export const runtime = 'edge';

export async function POST(request: Request) {
  try {
    const { title = 'Blog Title', bgUrl = '', logoBase64 = '', tagBase64 = '', fontBoldBase64 = '' } = await request.json();

    const titleParts = title.split(':');
    const mainTitle = titleParts[0] + (title.includes(':') ? ':' : '');
    const subtitle = titleParts.length > 1 ? titleParts.slice(1).join(':').trim() : '';

    const fontData = fontBoldBase64 ? Buffer.from(fontBoldBase64, 'base64') : null;

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
              {tagBase64 && <img src={`data:image/png;base64,${tagBase64}`} style={{ height: '40px', width: 'auto' }} />}
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
                  fontFamily: 'NotoSans',
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
                    fontFamily: 'NotoSans',
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
              {logoBase64 && <img src={`data:image/png;base64,${logoBase64}`} style={{ height: '56px', width: 'auto' }} />}
            </div>
          </div>
        </div>
      ),
      {
        width: 1200,
        height: 630,
        fonts: fontData ? [
          { name: 'NotoSans', data: fontData, style: 'normal', weight: 700 }
        ] : undefined
      }
    );
  } catch (e: any) {
    return new Response(`Failed to generate image: ${e.message}`, { status: 500 });
  }
}
