import { ImageResponse } from 'next/og';
import React from 'react';

export const runtime = 'edge';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { iconStripBase64, logoBase64, data, fontBold, fontReg } = body;

    // Convert base64 fonts to ArrayBuffers for Edge compatibility
    const fontBoldArray = fontBold ? Uint8Array.from(atob(fontBold), c => c.charCodeAt(0)) : null;
    const fontRegArray = fontReg ? Uint8Array.from(atob(fontReg), c => c.charCodeAt(0)) : null;

    const fonts: any[] = [];
    if (fontBoldArray) {
      fonts.push({ 
        name: 'EliteBold', 
        data: fontBoldArray.buffer, 
        style: 'normal', 
        weight: 900 
      });
    }
    if (fontRegArray) {
      fonts.push({ 
        name: 'EliteReg', 
        data: fontRegArray.buffer, 
        style: 'normal', 
        weight: 400 
      });
    }

    return new ImageResponse(
      (
        <div style={{
          width: '800px',
          height: '1000px',
          backgroundColor: '#1A0B2E',
          display: 'flex',
          flexDirection: 'column',
          position: 'relative',
          overflow: 'hidden',
          color: 'white'
        }}>
          {/* 1. Title + Subtitle */}
          <h1 style={{
            position: 'absolute',
            top: '50px',
            left: '40px',
            fontSize: '42px',
            fontFamily: 'EliteBold',
            color: '#FFD700',
            textTransform: 'uppercase',
            margin: 0,
            lineHeight: 1.1
          }}>
            {data.title}
          </h1>
          <p style={{
            position: 'absolute',
            top: '105px',
            left: '40px',
            fontSize: '20px',
            fontFamily: 'EliteReg',
            color: '#FFFFFF',
            margin: 0,
            opacity: 0.9
          }}>
            {data.subtitle}
          </p>

          {/* 2. Glass Icon Box - Expanded to 180px for symmetry */}
          <div style={{
            position: 'absolute',
            top: '145px',
            left: '40px',
            width: '720px',
            height: '180px',
            backgroundColor: 'rgba(255, 255, 255, 0.05)',
            border: '1px solid rgba(255, 255, 255, 0.15)',
            borderRadius: '16px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            overflow: 'hidden'
          }}>
            {iconStripBase64 && (
              <img
                src={`data:image/png;base64,${iconStripBase64}`}
                style={{
                  width: '620px',
                  height: '110px',
                  objectFit: 'contain'
                }}
              />
            )}
          </div>

          {/* 3. Technical Cards Grid - Shifted for balance */}
          <div style={{ display: 'flex', flexWrap: 'wrap', position: 'absolute', top: '355px', left: '40px', width: '720px' }}>
            {data.blocks.slice(0, 4).map((block: any, idx: number) => {
              const isRightCol = idx % 2 !== 0;
              const isRow2 = idx >= 2;
              return (
                <div key={idx} style={{
                  position: 'absolute',
                  top: isRow2 ? '220px' : '0px', 
                  left: isRightCol ? '376px' : '0px', 
                  width: '344px',
                  height: '200px',
                  backgroundColor: 'rgba(255, 255, 255, 0.03)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  borderRadius: '12px',
                  padding: '22px 20px',
                  display: 'flex',
                  flexDirection: 'column'
                }}>
                  <span style={{
                    fontSize: '16px',
                    fontFamily: 'EliteBold',
                    color: '#A855F7',
                    textTransform: 'uppercase',
                    marginBottom: '15px'
                  }}>
                    {block.title}
                  </span>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {block.items.slice(0, 3).map((item: string, i: number) => (
                      <div key={i} style={{ display: 'flex', fontSize: '13px', color: '#E2E8F0', fontFamily: 'EliteReg', lineHeight: 1.4 }}>
                        <span style={{ marginRight: '8px' }}>•</span>
                        <span style={{ flex: 1 }}>{item}</span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>

          {/* 4. 10xDS Brand Logo - Bottom Right (Fixed 50px gap) */}
          {logoBase64 && (
            <img 
              src={`data:image/png;base64,${logoBase64}`}
              alt="10xDS Logo"
              style={{
                position: 'absolute',
                top: '914px', 
                left: '640px',
                height: '36px',
                width: '120px',
                objectFit: 'contain',
                opacity: 0.8
              }}
            />
          )}
        </div>
      ),
      {
        width: 800,
        height: 1000,
        fonts: fonts
      }
    );
  } catch (e: any) {
    return new Response(`Failed to generate overlay: ${e.message}`, { status: 500 });
  }
}
