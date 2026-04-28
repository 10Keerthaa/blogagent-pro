import { ImageResponse } from 'next/og';
import React from 'react';
import { ASSETS } from '@/lib/constants';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { iconStripBase64, logoUrl: passedLogoUrl, data, fontBold, fontReg } = body;

    // Use the pre-embedded ASSETS.logo — 100% reliable in all server environments
    const logoData = ASSETS.logo ? `data:image/png;base64,${ASSETS.logo}` : (passedLogoUrl || null);

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
          height: '1200px',
          width: '800px',
          display: 'flex',
          flexDirection: 'column',
          backgroundColor: '#1A0B2E',
          position: 'relative',
          padding: '60px',
          color: 'white'
        }}>


          {/* Header Section */}
          <div style={{ display: 'flex', flexDirection: 'column', marginBottom: '20px', position: 'relative' }}>
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
            marginBottom: '25px',
            backgroundColor: 'rgba(255, 255, 255, 0.12)',
            backdropFilter: 'blur(15px)',
            borderRadius: '20px',
            border: '1px solid rgba(255, 255, 255, 0.15)',
            height: '220px',
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
                  top: '10px',
                  left: '30px',
                  width: '620px', // 680px glass box - 30px left - 30px right = 620px (all 6 icons fully visible)
                  height: '160px',
                  objectFit: 'cover'
                }}
              />
            )}

            {/* Labels placed precisely below icons */}
            <div style={{
              display: 'flex',
              width: '620px', 
              position: 'absolute',
              bottom: '15px',
              left: '30px' 
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
                  letterSpacing: '1.2px'
                }}>
                  {pillar}
                </span>
              ))}
            </div>
          </div>

          {/* Main Content Grid (4-5 Blocks) */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '20px', alignContent: 'flex-start' }}>
            {data.blocks.map((block: any, i: number) => (
              <div key={i} style={{ 
                width: '330px', 
                backgroundColor: 'rgba(255, 255, 255, 0.05)',
                padding: '15px 20px',
                borderRadius: '12px',
                borderLeft: '4px solid #B794F4',
                display: 'flex',
                flexDirection: 'column',
                minHeight: '120px'
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

          {/* Elite Summary Glass Box */}
          <div style={{
            display: 'flex',
            width: '100%',
            height: 'auto',
            minHeight: '80px',
            backgroundColor: 'rgba(255, 255, 255, 0.08)',
            backdropFilter: 'blur(10px)',
            borderRadius: '15px',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            marginTop: '25px', // Exact match to icon-to-block spacing
            padding: '15px 30px',
            alignItems: 'center',
            justifyContent: 'center',
            position: 'relative'
          }}>
             <p style={{ 
               fontSize: '14px', 
               color: '#FFFFFF', 
               fontFamily: 'EliteReg', 
               textAlign: 'center', 
               margin: 0, 
               lineHeight: 1.5,
               fontStyle: 'italic',
               opacity: 0.9
             }}>
               "{data.footer_summary}"
             </p>
          </div>

          {/* 10xDS Brand Logo - Absolutely pinned to bottom-right */}
          {logoData && (
            <img
              src={logoData}
              alt="10xDS Logo"
              style={{
                position: 'absolute',
                bottom: '30px',
                right: '60px',
                height: '36px',
                width: 'auto',
                opacity: 1
              }}
            />
          )}
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
