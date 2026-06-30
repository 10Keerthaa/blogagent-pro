import { ImageResponse } from 'next/og';
import React from 'react';
import { ASSETS } from '@/lib/constants';

export const runtime = 'edge';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { iconStripBase64, logoUrl: passedLogoUrl, data, fontBold, fontReg } = body;

    const logoData = ASSETS.logo ? `data:image/png;base64,${ASSETS.logo}` : (passedLogoUrl || null);

    const fontBoldArray = fontBold ? Uint8Array.from(atob(fontBold), c => c.charCodeAt(0)) : null;
    const fontRegArray = fontReg ? Uint8Array.from(atob(fontReg), c => c.charCodeAt(0)) : null;

    const fonts: any[] = [];
    if (fontBoldArray) {
      fonts.push({ name: 'EliteBold', data: fontBoldArray.buffer, style: 'normal', weight: 900 });
    }
    if (fontRegArray) {
      fonts.push({ name: 'EliteReg', data: fontRegArray.buffer, style: 'normal', weight: 400 });
    }

    const nodeCount = data.nodeCount || 4;
    const layoutType = data.layoutType || 'standard';

    const titleMatch = data.title ? data.title.match(/\b(5|6|7|8)\b/) : null;
    const titleNumber = titleMatch ? parseInt(titleMatch[1], 10) : null;

    // --- TEMPLATE 1: TIMELINE ALTERNATING LAYOUT (N=5 to 7) ---
    if (titleNumber === 5 || titleNumber === 6 || titleNumber === 7 || layoutType === 'timeline') {
      const rowHeight = nodeCount === 7 ? '82px' : nodeCount === 6 ? '95px' : '110px';
      const axisHeight = nodeCount === 7 ? '590px' : nodeCount === 6 ? '610px' : '620px';
      const badgeSize = nodeCount === 7 ? '32px' : nodeCount === 6 ? '36px' : '40px';
      const badgeLeft = nodeCount === 7 ? '334px' : nodeCount === 6 ? '332px' : '330px';
      const badgeFontSize = nodeCount === 7 ? '14px' : nodeCount === 6 ? '16px' : '18px';
      const gapSize = nodeCount === 7 ? '4px' : nodeCount === 6 ? '8px' : '12px';
      const textSize = nodeCount === 7 ? '10px' : '11px';
      const titleSize = nodeCount === 7 ? '13px' : '15px';

      return new ImageResponse(
        (
          <div style={{ width: '800px', height: '1200px', backgroundColor: '#1A0B2E', display: 'flex', flexDirection: 'column', position: 'relative', overflow: 'hidden', padding: '40px 50px', color: 'white' }}>
            {/* Header */}
            <div style={{ display: 'flex', flexDirection: 'column', width: '700px', gap: '6px', marginBottom: '15px', textAlign: 'center', alignItems: 'center' }}>
              <h1 style={{ fontSize: '36px', fontFamily: 'EliteBold', color: '#FFD700', textTransform: 'uppercase', margin: 0, lineHeight: 1.1, display: 'flex' }}>
                {data.title}
              </h1>
              <p style={{ fontSize: '18px', fontFamily: 'EliteReg', color: '#FFFFFF', margin: 0, opacity: 0.9, display: 'flex' }}>
                {data.subtitle}
              </p>
            </div>

            {/* Separator / Executive Summary Box */}
            <div style={{ width: '700px', backgroundColor: 'rgba(255, 255, 255, 0.05)', borderTop: '1px solid rgba(255, 255, 255, 0.1)', borderBottom: '1px solid rgba(255, 255, 255, 0.1)', padding: '10px 20px', marginBottom: '20px', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
              <p style={{ fontSize: '12px', fontFamily: 'EliteReg', color: '#FFFFFF', margin: 0, textAlign: 'center', lineHeight: 1.4, opacity: 0.85 }}>
                "{data.executiveSummary || 'A strategic step-by-step roadmap to transition operations to a fully automated model.'}"
              </p>
            </div>

            {/* Timeline Wrapper */}
            <div style={{ width: '700px', height: '640px', position: 'relative', display: 'flex', flexDirection: 'column', gap: gapSize, marginTop: '25px' }}>
              <div style={{ position: 'absolute', left: '349px', top: '10px', width: '2px', height: axisHeight, backgroundColor: '#FFD700', opacity: 0.6 }} />

              {data.blocks.slice(0, nodeCount).map((block: any, idx: number) => {
                const stepNum = idx + 1;
                const isLeft = idx % 2 === 0;

                return (
                  <div key={idx} style={{ display: 'flex', width: '700px', height: rowHeight, position: 'relative', alignItems: 'center' }}>
                    <div style={{ position: 'absolute', left: badgeLeft, width: badgeSize, height: badgeSize, borderRadius: '50%', backgroundColor: '#1A0B2E', border: '2px solid #FFD700', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10 }}>
                      <span style={{ fontSize: badgeFontSize, fontFamily: 'EliteBold', color: '#FFD700' }}>{stepNum}</span>
                    </div>

                    <div style={{ width: '290px', display: 'flex', flexDirection: 'column', boxSizing: 'border-box' }}>
                      {isLeft ? (
                        <div style={{ width: '290px', backgroundColor: 'rgba(255, 255, 255, 0.04)', borderRight: '3px solid #FFD700', borderTop: '1px solid rgba(255, 255, 255, 0.08)', borderBottom: '1px solid rgba(255, 255, 255, 0.08)', borderLeft: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '8px', padding: '8px 12px', display: 'flex', flexDirection: 'column', boxSizing: 'border-box' }}>
                          <span style={{ fontSize: titleSize, fontFamily: 'EliteBold', color: '#FFD700', textTransform: 'uppercase', marginBottom: '4px', display: 'flex', textAlign: 'left' }}>{block.title}</span>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                            {block.items.slice(0, 2).map((item: string, i: number) => (
                              <div key={i} style={{ display: 'flex', fontSize: textSize, color: '#FFFFFF', fontFamily: 'EliteReg', opacity: 0.9, textAlign: 'left' }}><span style={{ marginRight: '6px', color: '#2DD4BF' }}>•</span><span style={{ flex: 1 }}>{item}</span></div>
                            ))}
                          </div>
                        </div>
                      ) : <div style={{ width: '290px' }} />}
                    </div>

                    <div style={{ width: '120px' }} />

                    <div style={{ width: '290px', display: 'flex', flexDirection: 'column', boxSizing: 'border-box' }}>
                      {!isLeft ? (
                        <div style={{ width: '290px', backgroundColor: 'rgba(255, 255, 255, 0.04)', borderLeft: '3px solid #FFD700', borderTop: '1px solid rgba(255, 255, 255, 0.08)', borderBottom: '1px solid rgba(255, 255, 255, 0.08)', borderRight: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '8px', padding: '8px 12px', display: 'flex', flexDirection: 'column', boxSizing: 'border-box' }}>
                          <span style={{ fontSize: titleSize, fontFamily: 'EliteBold', color: '#FFD700', textTransform: 'uppercase', marginBottom: '4px', display: 'flex', textAlign: 'left' }}>{block.title}</span>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                            {block.items.slice(0, 2).map((item: string, i: number) => (
                              <div key={i} style={{ display: 'flex', fontSize: textSize, color: '#FFFFFF', fontFamily: 'EliteReg', opacity: 0.9, textAlign: 'left' }}><span style={{ marginRight: '6px', color: '#2DD4BF' }}>•</span><span style={{ flex: 1 }}>{item}</span></div>
                            ))}
                          </div>
                        </div>
                      ) : <div style={{ width: '290px' }} />}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Logo at Right Bottom */}
            {logoData && (
              <div style={{ position: 'absolute', bottom: '25px', right: '35px', display: 'flex' }}>
                <img src={logoData} alt="10xDS Logo" style={{ height: '28px', width: 'auto', opacity: 0.9 }} />
              </div>
            )}
          </div>
        ),
        { width: 800, height: 1200, fonts: fonts }
      );
    }

    // --- TEMPLATE 2: TWO-COLUMN GRID LAYOUT (N=8) ---
    if (titleNumber === 8 || layoutType === 'grid') {
      return new ImageResponse(
        (
          <div style={{ width: '800px', height: '1200px', backgroundColor: '#1A0B2E', display: 'flex', flexDirection: 'column', position: 'relative', overflow: 'hidden', padding: '40px 45px', color: 'white' }}>
            <div style={{ display: 'flex', flexDirection: 'column', width: '710px', gap: '4px', marginBottom: '15px', textAlign: 'center', alignItems: 'center' }}>
              <h1 style={{ fontSize: '32px', fontFamily: 'EliteBold', color: '#FFD700', textTransform: 'uppercase', margin: 0, lineHeight: 1.1, display: 'flex' }}>{data.title}</h1>
              <p style={{ fontSize: '16px', fontFamily: 'EliteReg', color: '#FFFFFF', margin: 0, opacity: 0.9, display: 'flex' }}>{data.subtitle}</p>
            </div>

            <div style={{ display: 'flex', width: '710px', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', gap: '20px' }}>
              <div style={{ width: '320px', borderLeft: '4px solid #2DD4BF', backgroundColor: 'rgba(255, 255, 255, 0.04)', padding: '12px 15px', borderRadius: '0 8px 8px 0', display: 'flex' }}>
                <p style={{ fontSize: '11px', fontFamily: 'EliteReg', lineHeight: 1.4, margin: 0, opacity: 0.9 }}>{data.executiveSummary || 'A comprehensive, multi-pillar architecture designed for scale.'}</p>
              </div>

              <div style={{ width: '350px', display: 'flex', flexWrap: 'wrap', gap: '8px 12px' }}>
                {data.pillars.slice(0, 8).map((pillar: string, idx: number) => (
                  <div key={idx} style={{ width: '75px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255, 255, 255, 0.08)', borderRadius: '8px', padding: '6px 4px', border: '1px solid rgba(255, 255, 255, 0.1)' }}>
                    <span style={{ fontSize: '9px', fontFamily: 'EliteBold', color: '#FFD700', textTransform: 'uppercase', textAlign: 'center', lineHeight: 1.1 }}>{pillar}</span>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px 15px', width: '710px', flex: 1, alignContent: 'space-between', paddingBottom: '20px' }}>
              {data.blocks.slice(0, 8).map((block: any, idx: number) => (
                <div key={idx} style={{ width: '347px', height: '135px', backgroundColor: 'rgba(255, 255, 255, 0.05)', borderLeft: '4px solid #2DD4BF', borderRadius: '10px', padding: '10px 15px', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                  <span style={{ fontSize: '13px', fontFamily: 'EliteBold', color: '#FFD700', textTransform: 'uppercase', marginBottom: '6px', display: 'flex' }}>{block.title}</span>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                    {block.items.slice(0, 2).map((item: string, i: number) => (
                      <div key={i} style={{ display: 'flex', fontSize: '11px', color: '#FFFFFF', fontFamily: 'EliteReg', opacity: 0.9 }}><span style={{ marginRight: '6px', color: '#2DD4BF' }}>•</span><span style={{ flex: 1 }}>{item}</span></div>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {/* Logo at Right Bottom */}
            {logoData && (
              <div style={{ position: 'absolute', bottom: '25px', right: '35px', display: 'flex' }}>
                <img src={logoData} alt="10xDS Logo" style={{ height: '28px', width: 'auto', opacity: 0.9 }} />
              </div>
            )}
          </div>
        ),
        { width: 800, height: 1200, fonts: fonts }
      );
    }

    // --- TEMPLATE 3: STANDARD STACKED LAYOUT (N=5) ---
    return new ImageResponse(
      (
        <div style={{ width: '800px', height: '1200px', backgroundColor: '#1A0B2E', display: 'flex', flexDirection: 'column', position: 'relative', overflow: 'hidden', padding: '40px 50px', color: 'white' }}>
          <div style={{ display: 'flex', flexDirection: 'column', width: '700px', gap: '6px', marginBottom: '15px' }}>
            <h1 style={{ fontSize: '36px', fontFamily: 'EliteBold', color: '#FFD700', textTransform: 'uppercase', margin: 0, lineHeight: 1.1, display: 'flex' }}>{data.title}</h1>
            <p style={{ fontSize: '18px', fontFamily: 'EliteReg', color: '#FFFFFF', margin: 0, opacity: 0.9, display: 'flex' }}>{data.subtitle}</p>
          </div>

          <div style={{ width: '700px', height: '220px', backgroundColor: 'rgba(255, 255, 255, 0.12)', border: '1px solid rgba(255, 255, 255, 0.15)', borderRadius: '16px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', position: 'relative', overflow: 'hidden', marginBottom: '20px' }}>
            {iconStripBase64 && (
              <img src={`data:image/png;base64,${iconStripBase64}`} style={{ position: 'absolute', top: '10px', left: '15px', width: '670px', height: '175px', objectFit: 'cover', objectPosition: 'center 15%' }} />
            )}
            <div style={{ display: 'flex', width: '670px', position: 'absolute', bottom: '8px', left: '15px' }}>
              {data.pillars.slice(0, 5).map((pillar: string, i: number) => (
                <span key={i} style={{ width: '20%', fontSize: '9px', color: '#FFFFFF', textTransform: 'uppercase', textAlign: 'center', fontFamily: 'EliteBold', fontWeight: 900, letterSpacing: '1px', display: 'flex', justifyContent: 'center' }}>{pillar}</span>
              ))}
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', width: '700px', height: 'auto' }}>
            {data.blocks.slice(0, 5).map((block: any, idx: number) => (
              <div key={idx} style={{ width: '700px', backgroundColor: 'rgba(255, 255, 255, 0.05)', borderLeft: '4px solid #2DD4BF', borderRadius: '10px', padding: '8px 20px', display: 'flex', flexDirection: 'column', minHeight: '115px' }}>
                <span style={{ fontSize: '15px', fontFamily: 'EliteBold', color: '#FFD700', textTransform: 'uppercase', marginBottom: '6px', display: 'flex' }}>{block.title}</span>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                  {block.items.slice(0, 2).map((item: string, i: number) => (
                    <div key={i} style={{ display: 'flex', fontSize: '11px', color: '#FFFFFF', fontFamily: 'EliteReg', opacity: 0.9 }}><span style={{ marginRight: '6px', color: '#2DD4BF' }}>•</span><span style={{ flex: 1 }}>{item}</span></div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Logo at Right Bottom */}
          {logoData && (
            <div style={{ position: 'absolute', bottom: '25px', right: '35px', display: 'flex' }}>
              <img src={logoData} alt="10xDS Logo" style={{ height: '28px', width: 'auto', opacity: 0.9 }} />
            </div>
          )}
        </div>
      ),
      { width: 800, height: 1200, fonts: fonts }
    );
  } catch (e: any) {
    return new Response(`Failed to generate overlay: ${e.message}`, { status: 500 });
  }
}
