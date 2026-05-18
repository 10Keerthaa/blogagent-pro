import { ImageResponse } from 'next/og';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  try {
    const { title = 'Blog Title', bgUrl = '', logoBase64 = '', tagBase64 = '', fontBoldBase64 = '', fontRegBase64 = '', platform = 'framer' } = await request.json();

    const isWordPress = platform === 'wordpress';
    const isLinkedIn = platform === 'linkedin';
    const canvasWidth = isLinkedIn ? 1706 : isWordPress ? 960 : 1376;
    const canvasHeight = isLinkedIn ? 960 : isWordPress ? 720 : 768;

    const titleParts = title.split(':');
    const mainTitle = titleParts[0] + (title.includes(':') ? ':' : '');
    const subtitle = titleParts.length > 1 ? titleParts.slice(1).join(':').trim() : '';

    const fontData = fontBoldBase64 ? Buffer.from(fontBoldBase64, 'base64') : null;
    const fontRegData = fontRegBase64 ? Buffer.from(fontRegBase64, 'base64') : null;

    const logoBuf = logoBase64 ? Buffer.from(logoBase64, 'base64') : null;
    const logoArrayBuffer = logoBuf ? logoBuf.buffer.slice(logoBuf.byteOffset, logoBuf.byteOffset + logoBuf.byteLength) : null;

    const tagBuf = tagBase64 ? Buffer.from(tagBase64, 'base64') : null;
    const tagArrayBuffer = tagBuf ? tagBuf.buffer.slice(tagBuf.byteOffset, tagBuf.byteOffset + tagBuf.byteLength) : null;
    
    const fontsArr: any[] = [];
    if (fontData) fontsArr.push({ name: 'Inter', data: fontData, style: 'normal', weight: 700 });
    if (fontRegData) fontsArr.push({ name: 'Inter', data: fontRegData, style: 'normal', weight: 400 });

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

          {/* Layer 1: Blog Tag */}
          <div style={{ display: 'flex', position: 'absolute', top: '80px', left: '60px' }}>
            {tagArrayBuffer && <img src={tagArrayBuffer as any} width="80" height="40" style={{ objectFit: 'contain' }} />}
          </div>

          {/* Layer 2: Title Group — Left-aligned for WordPress, Centred for Framer */}
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              alignItems: isWordPress ? 'flex-start' : 'center',
              paddingLeft: isWordPress ? '60px' : '100px',
              paddingRight: isWordPress ? '60px' : '100px',
            }}
          >
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                width: isWordPress ? '75%' : '100%',
                alignItems: isWordPress ? 'flex-start' : 'center',
                textAlign: isWordPress ? 'left' : 'center',
              }}
            >
              <h1
                style={{
                  fontSize: isWordPress ? '52px' : '64px',
                  fontWeight: 700,
                  color: 'white',
                  lineHeight: 1.2,
                  margin: 0,
                  fontFamily: 'Inter',
                  textShadow: '0 4px 12px rgba(0,0,0,0.6)',
                }}
              >
                {mainTitle}
              </h1>
              {subtitle && (
                <p
                  style={{
                    fontSize: isWordPress ? '36px' : '48px',
                    fontWeight: 400,
                    color: 'white',
                    opacity: 0.9,
                    lineHeight: 1.3,
                    marginTop: '14px',
                    marginBottom: 0,
                    fontFamily: 'Inter',
                    textShadow: '0 2px 10px rgba(0,0,0,0.5)',
                  }}
                >
                  {subtitle}
                </p>
              )}
            </div>
          </div>

          {/* Layer 3: Logo */}
          <div
            style={{
              display: 'flex',
              position: 'absolute',
              bottom: '80px',
              right: '60px',
            }}
          >
            {logoArrayBuffer && <img src={logoArrayBuffer as any} width="140" height="60" style={{ objectFit: 'contain' }} />}
          </div>
        </div>
      ),
      {
        width: canvasWidth,
        height: canvasHeight,
        fonts: fontsArr.length > 0 ? fontsArr : undefined
      }
    );
  } catch (e: any) {
    return new Response(`Failed to generate image: ${e.message}`, { status: 500 });
  }
}
