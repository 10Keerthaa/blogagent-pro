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
          height: '1200px',
          backgroundColor: '#1A0B2E',
          display: 'flex',
          flexDirection: 'column',
          position: 'relative',
          overflow: 'hidden',
          padding: '60px',
          color: 'white'
        }}>
          {/* 1. Header Section */}
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            width: '680px',
            gap: '10px',
            marginBottom: '20px'
          }}>
            <h1 style={{
              fontSize: '42px',
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

          {/* 2. Glass Icon Box */}
          <div style={{
            width: '680px',
            height: '220px',
            backgroundColor: 'rgba(255, 255, 255, 0.12)',
            border: '1px solid rgba(255, 255, 255, 0.15)',
            borderRadius: '20px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            position: 'relative',
            overflow: 'hidden',
            marginBottom: '25px'
          }}>
            {iconStripBase64 && (
              <img
                src={`data:image/png;base64,${iconStripBase64}`}
                style={{
                  position: 'absolute',
                  top: '10px',
                  left: '30px',
                  width: '620px',
                  height: '180px',
                  objectFit: 'cover'
                }}
              />
            )}

            {/* Pillar Labels */}
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

          {/* 3. Technical Cards Grid */}
          <div style={{ 
            display: 'flex', 
            flexWrap: 'wrap', 
            gap: '20px',
            width: '680px'
          }}>
            {data.blocks.slice(0, 4).map((block: any, idx: number) => (
              <div key={idx} style={{
                width: '330px',
                backgroundColor: 'rgba(255, 255, 255, 0.05)',
                borderLeft: '4px solid #B794F4',
                borderRadius: '12px',
                padding: '15px 20px',
                display: 'flex',
                flexDirection: 'column',
                minHeight: '130px'
              }}>
                <span style={{
                  fontSize: '18px',
                  fontFamily: 'EliteBold',
                  color: '#B794F4',
                  textTransform: 'uppercase',
                  marginBottom: '10px',
                  display: 'flex'
                }}>
                  {block.title}
                </span>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {block.items.slice(0, 3).map((item: string, i: number) => (
                    <div key={i} style={{ display: 'flex', fontSize: '13px', color: '#FFFFFF', fontFamily: 'EliteReg', opacity: 0.9 }}>
                      <span style={{ marginRight: '8px' }}>•</span>
                      <span style={{ flex: 1 }}>{item}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* 4. Executive Summary Box */}
          <div style={{
            width: '680px',
            height: 'auto',
            minHeight: '80px',
            backgroundColor: 'rgba(255, 255, 255, 0.08)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '15px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '15px 30px',
            marginTop: '25px',
            position: 'relative'
          }}>
            <p style={{
              fontSize: '14px',
              fontFamily: 'EliteReg',
              color: '#FFFFFF',
              margin: 0,
              lineHeight: 1.5,
              fontStyle: 'italic',
              textAlign: 'center',
              opacity: 0.9
            }}>
              "{data.executiveSummary || data.footer_summary || "Driving strategic value through autonomous integration and cognitive-first architectural standards."}"
            </p>
          </div>

        </div>
      ),
      {
        width: 800,
        height: 1200,
        fonts: fonts
      }
    );
  } catch (e: any) {
    return new Response(`Failed to generate overlay: ${e.message}`, { status: 500 });
  }
}
