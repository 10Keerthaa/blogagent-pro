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
          height: '1060px',
          backgroundColor: '#1A0B2E',
          display: 'flex',
          flexDirection: 'column',
          position: 'relative',
          overflow: 'hidden',
          color: 'white'
        }}>
          {/* 1. Header Section - Flex Flow to completely prevent title overlapping subtitle */}
          <div style={{
            position: 'absolute',
            top: '35px', // Shifted up slightly to give room for 2-line titles
            left: '40px',
            display: 'flex',
            flexDirection: 'column',
            width: '720px',
            gap: '8px'
          }}>
            <h1 style={{
              fontSize: '34px', // Shrunk slightly from 42px so it rarely wraps
              fontFamily: 'EliteBold',
              color: '#FFD700',
              textTransform: 'uppercase',
              margin: 0,
              lineHeight: 1.1,
              display: 'flex'
            }}>
              {data.title}
            </h1>
            <p style={{
              fontSize: '18px', // Scaled perfectly with the new title size
              fontFamily: 'EliteReg',
              color: '#FFFFFF',
              margin: 0,
              opacity: 0.9,
              display: 'flex'
            }}>
              {data.subtitle}
            </p>
          </div>

          {/* 2. Glass Icon Box - Matches AI Background to remove "Black Box" */}
          <div style={{
            position: 'absolute',
            top: '135px',
            left: '40px',
            width: '720px',
            height: '280px', // Increased from 240px to prevent bottom-clipping of icons
            backgroundColor: '#1A0B2E',
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
                  width: '720px', // Stretched to fill the entire width of the box
                  height: '180px',
                  objectFit: 'cover'
                }}
              />
            )}

            {/* Pillar Labels - Perfectly aligned under floating icons */}
            <div style={{
              display: 'flex',
              width: '620px',
              position: 'absolute',
              bottom: '20px' // Lifted for more breathing room
            }}>
              {data.pillars.map((pillar: string, i: number) => (
                <span key={i} style={{
                  flex: 1,
                  fontSize: '11px',
                  color: '#FFFFFF',
                  textTransform: 'uppercase',
                  textAlign: 'center',
                  fontFamily: 'EliteBold',
                  fontWeight: 900,
                  letterSpacing: '1.2px',
                  lineHeight: 1.3, // Added line height for clean 2-line wrapping
                  padding: '0 8px' // Padding prevents long words from touching
                }}>
                  {pillar}
                </span>
              ))}
            </div>
          </div>

          {/* 3. Technical Cards Grid - Matches Image 2 Spacing */}
          <div style={{ display: 'flex', flexWrap: 'wrap', position: 'absolute', top: '405px', left: '40px', width: '720px' }}>
            {data.blocks.slice(0, 4).map((block: any, idx: number) => {
              const isRightCol = idx % 2 !== 0;
              const isRow2 = idx >= 2;
              return (
                <div key={idx} style={{
                  position: 'absolute',
                  top: isRow2 ? '265px' : '0px',
                  left: isRightCol ? '376px' : '0px',
                  width: '344px',
                  height: '245px', // Restored to 245px as in Image 2
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
                    marginBottom: '12px'
                  }}>
                    {block.title}
                  </span>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {block.items.slice(0, 3).map((item: string, i: number) => (
                      <div key={i} style={{ display: 'flex', fontSize: '12px', color: '#E2E8F0', fontFamily: 'EliteReg', lineHeight: 1.4 }}>
                        <span style={{ marginRight: '8px' }}>•</span>
                        <span style={{ flex: 1 }}>{item}</span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>

          {/* 4. Executive Summary Box - Restored to Image 2 width */}
          <div style={{
            position: 'absolute',
            top: '940px',
            left: '40px',
            width: '720px',
            height: '75px',
            backgroundColor: 'rgba(139, 92, 246, 0.12)',
            border: '1px solid rgba(139, 92, 246, 0.25)',
            borderRadius: '16px',
            display: 'flex',
            alignItems: 'center',
            padding: '0 30px',
            overflow: 'hidden'
          }}>
            <p style={{
              fontSize: '13px',
              fontFamily: 'EliteReg',
              color: '#FFFFFF',
              margin: 0,
              lineHeight: 1.4,
              fontStyle: 'italic',
              opacity: 0.95
            }}>
              {data.executiveSummary || "Driving strategic value through autonomous integration and cognitive-first architectural standards."}
            </p>
          </div>

        </div>
      ),
      {
        width: 800,
        height: 1060,
        fonts: fonts
      }
    );
  } catch (e: any) {
    return new Response(`Failed to generate overlay: ${e.message}`, { status: 500 });
  }
}
