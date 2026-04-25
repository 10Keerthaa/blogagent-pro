import { ImageResponse } from 'next/og';
import React from 'react';

export const runtime = 'edge';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { bgImageBase64, data, fontBold, fontReg } = body;

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

    const bgSrc = `data:image/png;base64,${bgImageBase64}`;

    return new ImageResponse(
      (
        <div style={{
          height: '1000px',
          width: '800px',
          display: 'flex',
          flexDirection: 'column',
          backgroundColor: '#0A0118',
          position: 'relative',
          overflow: 'hidden',
          padding: '60px',
          color: 'white'
        }}>
          {/* Background Image */}
          <img 
            src={bgSrc} 
            alt="background"
            style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', objectFit: 'cover' }} 
          />

          {/* Header Section */}
          <div style={{ display: 'flex', flexDirection: 'column', marginBottom: '40px', position: 'relative' }}>
            <h1 style={{
              fontSize: '42px',
              fontFamily: 'EliteBold',
              color: '#FFD700',
              textTransform: 'uppercase',
              margin: '0 0 10px 0',
              lineHeight: 1.1,
              display: 'flex'
            }}>
              {data.title}
            </h1>
            <p style={{
              fontSize: '24px',
              fontFamily: 'EliteReg',
              color: '#FFFFFF',
              margin: 0,
              opacity: 0.9,
              display: 'flex'
            }}>
              {data.subtitle}
            </p>
          </div>

          {/* Pillar Icons Bar (6 Pillars) */}
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            width: '100%', 
            marginBottom: '40px',
            padding: '20px',
            backgroundColor: 'rgba(183, 148, 244, 0.1)',
            borderRadius: '12px',
            border: '1px solid rgba(183, 148, 244, 0.2)'
          }}>
            {data.pillars.map((pillar: string, i: number) => (
              <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100px' }}>
                <div style={{ width: '30px', height: '30px', backgroundColor: '#B794F4', borderRadius: '50%', marginBottom: '8px' }} />
                <span style={{ fontSize: '10px', color: '#FFF', textTransform: 'uppercase', textAlign: 'center', fontFamily: 'EliteBold', display: 'flex' }}>
                  {pillar}
                </span>
              </div>
            ))}
          </div>

          {/* Main Content Grid (4-5 Blocks) */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '20px', flex: 1 }}>
            {data.blocks.map((block: any, i: number) => (
              <div key={i} style={{ 
                width: '330px', 
                backgroundColor: 'rgba(26, 11, 46, 0.7)',
                padding: '20px',
                borderRadius: '12px',
                borderLeft: '4px solid #B794F4',
                display: 'flex',
                flexDirection: 'column'
              }}>
                <h3 style={{ fontSize: '18px', color: '#B794F4', margin: '0 0 12px 0', textTransform: 'uppercase', fontFamily: 'EliteBold', display: 'flex' }}>
                  {block.title}
                </h3>
                {block.items.map((item: string, j: number) => (
                  <p key={j} style={{ fontSize: '14px', color: '#FFF', margin: '4px 0', fontFamily: 'EliteReg', display: 'flex' }}>
                    • {item}
                  </p>
                ))}
              </div>
            ))}
          </div>

          {/* Footer Bar */}
          <div style={{ 
            marginTop: '40px',
            padding: '20px',
            borderTop: '2px solid rgba(255, 215, 0, 0.3)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center'
          }}>
            <span style={{ fontSize: '18px', color: '#FFD700', textTransform: 'uppercase', letterSpacing: '4px', fontFamily: 'EliteBold', display: 'flex' }}>
              {data.footer_summary}
            </span>
          </div>
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
