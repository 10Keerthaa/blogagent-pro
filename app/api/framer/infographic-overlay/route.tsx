import { ImageResponse } from 'next/og';
import React from 'react';

export const runtime = 'edge';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { iconStripBase64, logoUrl, data, fontBold, fontReg } = body;

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
          height: '1000px',
          width: '800px',
          display: 'flex',
          flexDirection: 'column',
          backgroundColor: '#1A0B2E',
          position: 'relative',
          overflow: 'hidden',
          padding: '60px',
          color: 'white'
        }}>


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

          {/* Pillar Icons Bar - UNIFIED GLASS BOX */}
          <div style={{ 
            display: 'flex', 
            justifyContent: 'center',
            alignItems: 'center',
            width: '100%', 
            marginBottom: '40px',
            backgroundColor: 'rgba(255, 255, 255, 0.12)',
            backdropFilter: 'blur(15px)',
            borderRadius: '20px',
            border: '1px solid rgba(255, 255, 255, 0.15)',
            height: '240px',
            position: 'relative',
            overflow: 'hidden'
          }}>
            {/* The AI Generated Icon Strip */}
            {iconStripBase64 && (
              <img 
                src={`data:image/png;base64,${iconStripBase64}`}
                alt="Icons"
                style={{
                  position: 'absolute',
                  top: '15px',
                  left: '20px',
                  width: '720px',
                  height: '160px', // Explicit px height required by Satori Edge runtime
                  objectFit: 'contain'
                }}
              />
            )}

            {/* Labels placed precisely below icons */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              width: '100%',
              padding: '0 30px',
              position: 'absolute',
              bottom: '25px'
            }}>
              {data.pillars.map((pillar: string, i: number) => (
                <span key={i} style={{ 
                  fontSize: '11px', 
                  color: '#FFFFFF', 
                  textTransform: 'uppercase', 
                  textAlign: 'center', 
                  fontFamily: 'EliteBold', 
                  fontWeight: 900,
                  letterSpacing: '1.2px',
                  width: '110px'
                }}>
                  {pillar}
                </span>
              ))}
            </div>
          </div>

          {/* Main Content Grid (4-5 Blocks) */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '20px', flex: 1, alignContent: 'flex-start' }}>
            {data.blocks.map((block: any, i: number) => (
              <div key={i} style={{ 
                width: '330px', 
                backgroundColor: 'rgba(255, 255, 255, 0.05)',
                padding: '20px',
                borderRadius: '12px',
                borderLeft: '4px solid #B794F4',
                display: 'flex',
                flexDirection: 'column',
                minHeight: '140px'
              }}>
                <h3 style={{ fontSize: '18px', color: '#B794F4', margin: '0 0 10px 0', textTransform: 'uppercase', fontFamily: 'EliteBold', display: 'flex' }}>
                  {block.title}
                </h3>
                {block.items.map((item: string, j: number) => (
                  <p key={j} style={{ fontSize: '13px', color: '#FFF', margin: '3px 0', fontFamily: 'EliteReg', display: 'flex', opacity: 0.9 }}>
                    • {item}
                  </p>
                ))}
              </div>
            ))}
          </div>

          {/* Footer Bar removed as per design requirements */}

          {/* 10xDS Brand Logo - Bottom Right */}
          {logoUrl && (
            <img 
              src={logoUrl}
              alt="10xDS Logo"
              style={{
                position: 'absolute',
                bottom: '30px',
                right: '40px',
                height: '40px',
                width: 'auto',
                opacity: 0.9
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
