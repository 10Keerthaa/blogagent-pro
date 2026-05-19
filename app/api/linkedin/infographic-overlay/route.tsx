import { ImageResponse } from 'next/og';
import React from 'react';

export const runtime = 'edge';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { iconStripBase64, logoBase64, data, fontBold, fontReg } = body;

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

    const nodeCount = data.nodeCount || 4;
    const layoutType = data.layoutType || 'standard';

    // --- TEMPLATE 1: TIMELINE ALTERNATING LAYOUT (N=5 to 7) ---
    if (nodeCount === 5 || nodeCount === 6 || nodeCount === 7 || layoutType === 'timeline') {
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
          <div style={{
            width: '800px',
            height: '1000px',
            backgroundColor: '#1A0B2E',
            display: 'flex',
            flexDirection: 'column',
            position: 'relative',
            overflow: 'hidden',
            padding: '40px 50px',
            color: 'white'
          }}>
            {/* Header */}
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              width: '700px',
              gap: '6px',
              marginBottom: '15px',
              textAlign: 'center',
              alignItems: 'center'
            }}>
              <h1 style={{
                fontSize: '36px',
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
                fontSize: '18px',
                fontFamily: 'EliteReg',
                color: '#FFFFFF',
                margin: 0,
                opacity: 0.9,
                display: 'flex'
              }}>
                {data.subtitle}
              </p>
            </div>

            {/* Separator / Executive Summary Box */}
            <div style={{
              width: '700px',
              backgroundColor: 'rgba(255, 255, 255, 0.05)',
              borderTop: '1px solid rgba(255, 255, 255, 0.1)',
              borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
              padding: '10px 20px',
              marginBottom: '20px',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center'
            }}>
              <p style={{
                fontSize: '12px',
                fontFamily: 'EliteReg',
                color: '#FFFFFF',
                margin: 0,
                textAlign: 'center',
                lineHeight: 1.4,
                opacity: 0.85
              }}>
                "{data.executiveSummary || 'A strategic step-by-step roadmap to transition operations to a fully automated model.'}"
              </p>
            </div>

            {/* Timeline Wrapper */}
            <div style={{
              width: '700px',
              height: '640px',
              position: 'relative',
              display: 'flex',
              flexDirection: 'column',
              gap: gapSize
            }}>
              {/* Central vertical golden timeline axis line */}
              <div style={{
                position: 'absolute',
                left: '349px',
                top: '10px',
                width: '2px',
                height: axisHeight,
                backgroundColor: '#FFD700',
                opacity: 0.6
              }} />

              {/* Rows Alternating */}
              {data.blocks.slice(0, nodeCount).map((block: any, idx: number) => {
                const stepNum = idx + 1;
                const isLeft = idx % 2 === 0;

                return (
                  <div key={idx} style={{
                    display: 'flex',
                    width: '700px',
                    height: rowHeight,
                    position: 'relative',
                    alignItems: 'center'
                  }}>
                    {/* Circle badge in absolute center */}
                    <div style={{
                      position: 'absolute',
                      left: badgeLeft,
                      width: badgeSize,
                      height: badgeSize,
                      borderRadius: '50%',
                      backgroundColor: '#1A0B2E',
                      border: '2px solid #FFD700',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      zIndex: 10
                    }}>
                      <span style={{
                        fontSize: badgeFontSize,
                        fontFamily: 'EliteBold',
                        color: '#FFD700'
                      }}>
                        {stepNum}
                      </span>
                    </div>

                    {/* Left Block Content (if even) or Label Content (if odd) */}
                    <div style={{
                      width: '290px',
                      display: 'flex',
                      flexDirection: 'column',
                      boxSizing: 'border-box'
                    }}>
                      {isLeft ? (
                        <div style={{
                          width: '290px',
                          backgroundColor: 'rgba(255, 255, 255, 0.04)',
                          borderRight: '3px solid #FFD700',
                          borderTop: '1px solid rgba(255, 255, 255, 0.08)',
                          borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
                          borderLeft: '1px solid rgba(255, 255, 255, 0.08)',
                          borderRadius: '8px',
                          padding: '8px 12px',
                          display: 'flex',
                          flexDirection: 'column',
                          boxSizing: 'border-box'
                        }}>
                          <span style={{
                            fontSize: titleSize,
                            fontFamily: 'EliteBold',
                            color: '#FFD700',
                            textTransform: 'uppercase',
                            marginBottom: '4px',
                            display: 'flex',
                            justifyContent: 'flex-end',
                            textAlign: 'right'
                          }}>
                            {block.title}
                          </span>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                            {block.items.slice(0, 2).map((item: string, i: number) => (
                              <div key={i} style={{ display: 'flex', fontSize: textSize, color: '#FFFFFF', fontFamily: 'EliteReg', opacity: 0.9, justifyContent: 'flex-end', textAlign: 'right' }}>
                                <span style={{ marginRight: '6px' }}>{item}</span>
                                <span style={{ color: '#2DD4BF' }}>•</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      ) : (
                        <div style={{
                          width: '290px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'flex-end'
                        }}>
                          <span style={{
                            fontSize: '14px',
                            fontFamily: 'EliteBold',
                            color: '#B794F4',
                            textTransform: 'uppercase',
                            textAlign: 'right',
                            display: 'flex'
                          }}>
                            {data.pillars[idx] || 'Pillar'}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Spacer for central timeline axis (120px to accommodate robust spacing) */}
                    <div style={{ width: '120px' }} />

                    {/* Right Block Content (if odd) or Label Content (if even) */}
                    <div style={{
                      width: '290px',
                      display: 'flex',
                      flexDirection: 'column',
                      boxSizing: 'border-box'
                    }}>
                      {!isLeft ? (
                        <div style={{
                          width: '290px',
                          backgroundColor: 'rgba(255, 255, 255, 0.04)',
                          borderLeft: '3px solid #FFD700',
                          borderTop: '1px solid rgba(255, 255, 255, 0.08)',
                          borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
                          borderRight: '1px solid rgba(255, 255, 255, 0.08)',
                          borderRadius: '8px',
                          padding: '8px 12px',
                          display: 'flex',
                          flexDirection: 'column',
                          boxSizing: 'border-box'
                        }}>
                          <span style={{
                            fontSize: titleSize,
                            fontFamily: 'EliteBold',
                            color: '#FFD700',
                            textTransform: 'uppercase',
                            marginBottom: '4px',
                            display: 'flex',
                            textAlign: 'left'
                          }}>
                            {block.title}
                          </span>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                            {block.items.slice(0, 2).map((item: string, i: number) => (
                              <div key={i} style={{ display: 'flex', fontSize: textSize, color: '#FFFFFF', fontFamily: 'EliteReg', opacity: 0.9, textAlign: 'left' }}>
                                <span style={{ marginRight: '6px', color: '#2DD4BF' }}>•</span>
                                <span style={{ flex: 1 }}>{item}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      ) : (
                        <div style={{
                          width: '290px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'flex-start'
                        }}>
                          <span style={{
                            fontSize: '14px',
                            fontFamily: 'EliteBold',
                            color: '#B794F4',
                            textTransform: 'uppercase',
                            textAlign: 'left',
                            display: 'flex'
                          }}>
                            {data.pillars[idx] || 'Pillar'}
                          </span>
                        </div>
                      )}
                    </div>

                  </div>
                );
              })}
            </div>
          </div>
        ),
        {
          width: 800,
          height: 1000,
          fonts: fonts
        }
      );
    }

    // --- TEMPLATE 2: TWO-COLUMN GRID LAYOUT (N=8) ---
    if (nodeCount === 8 || layoutType === 'grid') {
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
            padding: '40px 45px',
            color: 'white'
          }}>
            {/* Header */}
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              width: '710px',
              gap: '4px',
              marginBottom: '15px',
              textAlign: 'center',
              alignItems: 'center'
            }}>
              <h1 style={{
                fontSize: '32px',
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
                fontSize: '16px',
                fontFamily: 'EliteReg',
                color: '#FFFFFF',
                margin: 0,
                opacity: 0.9,
                display: 'flex'
              }}>
                {data.subtitle}
              </p>
            </div>

            {/* upper block (Left: Summary, Right: Pillars 2x4) */}
            <div style={{
              display: 'flex',
              width: '710px',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '20px',
              gap: '20px'
            }}>
              {/* Executive Summary */}
              <div style={{
                width: '320px',
                borderLeft: '4px solid #2DD4BF',
                backgroundColor: 'rgba(255, 255, 255, 0.04)',
                padding: '12px 15px',
                borderRadius: '0 8px 8px 0',
                display: 'flex'
              }}>
                <p style={{
                  fontSize: '11px',
                  fontFamily: 'EliteReg',
                  lineHeight: 1.4,
                  margin: 0,
                  opacity: 0.9
                }}>
                  {data.executiveSummary || 'A comprehensive, multi-pillar architecture designed for scale.'}
                </p>
              </div>

              {/* 2x4 Pillars Icons Row */}
              <div style={{
                width: '350px',
                display: 'flex',
                flexWrap: 'wrap',
                gap: '8px 12px'
              }}>
                {data.pillars.slice(0, 8).map((pillar: string, idx: number) => (
                  <div key={idx} style={{
                    width: '75px',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: 'rgba(255, 255, 255, 0.08)',
                    borderRadius: '8px',
                    padding: '6px 4px',
                    border: '1px solid rgba(255, 255, 255, 0.1)'
                  }}>
                    <span style={{
                      fontSize: '9px',
                      fontFamily: 'EliteBold',
                      color: '#FFD700',
                      textTransform: 'uppercase',
                      textAlign: 'center',
                      lineHeight: 1.1
                    }}>
                      {pillar}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* 2x4 Cards Grid */}
            <div style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: '12px 15px',
              width: '710px',
              height: '620px'
            }}>
              {data.blocks.slice(0, 8).map((block: any, idx: number) => (
                <div key={idx} style={{
                  width: '347px',
                  height: '135px',
                  backgroundColor: 'rgba(255, 255, 255, 0.05)',
                  borderLeft: '4px solid #2DD4BF',
                  borderRadius: '10px',
                  padding: '10px 15px',
                  display: 'flex',
                  flexDirection: 'column',
                  overflow: 'hidden'
                }}>
                  <span style={{
                    fontSize: '13px',
                    fontFamily: 'EliteBold',
                    color: '#FFD700',
                    textTransform: 'uppercase',
                    marginBottom: '6px',
                    display: 'flex'
                  }}>
                    {block.title}
                  </span>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                    {block.items.slice(0, 2).map((item: string, i: number) => (
                      <div key={i} style={{ display: 'flex', fontSize: '11px', color: '#FFFFFF', fontFamily: 'EliteReg', opacity: 0.9 }}>
                        <span style={{ marginRight: '6px', color: '#2DD4BF' }}>•</span>
                        <span style={{ flex: 1 }}>{item}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>

          </div>
        ),
        {
          width: 800,
          height: 1000,
          fonts: fonts
        }
      );
    }

    // --- TEMPLATE 3: STANDARD STACKED LAYOUT (N=5) ---
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
          padding: '40px 50px',
          color: 'white'
        }}>
          {/* Header */}
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            width: '700px',
            gap: '6px',
            marginBottom: '15px'
          }}>
            <h1 style={{
              fontSize: '36px',
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
              fontSize: '18px',
              fontFamily: 'EliteReg',
              color: '#FFFFFF',
              margin: 0,
              opacity: 0.9,
              display: 'flex'
            }}>
              {data.subtitle}
            </p>
          </div>

          {/* Glass Icon Strip Box */}
          <div style={{
            width: '700px',
            height: '130px',
            backgroundColor: 'rgba(255, 255, 255, 0.12)',
            border: '1px solid rgba(255, 255, 255, 0.15)',
            borderRadius: '16px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            position: 'relative',
            overflow: 'hidden',
            marginBottom: '20px'
          }}>
            {iconStripBase64 && (
              <img
                src={`data:image/png;base64,${iconStripBase64}`}
                style={{
                  position: 'absolute',
                  top: '5px',
                  left: '15px',
                  width: '670px',
                  height: '100px',
                  objectFit: 'cover'
                }}
              />
            )}

            {/* Pillar Labels (20% width to perfectly center under the 5 glass spheres) */}
            <div style={{
              display: 'flex',
              width: '670px',
              position: 'absolute',
              bottom: '8px',
              left: '15px'
            }}>
              {data.pillars.slice(0, 5).map((pillar: string, i: number) => (
                <span key={i} style={{
                  width: '20%',
                  fontSize: '9px',
                  color: '#FFFFFF',
                  textTransform: 'uppercase',
                  textAlign: 'center',
                  fontFamily: 'EliteBold',
                  fontWeight: 900,
                  letterSpacing: '1px',
                  display: 'flex',
                  justifyContent: 'center'
                }}>
                  {pillar}
                </span>
              ))}
            </div>
          </div>

          {/* Vertical Stacked Cards (Exactly 5 Cards, beautifully scaled) */}
          <div style={{ 
            display: 'flex', 
            flexDirection: 'column',
            gap: '10px',
            width: '700px',
            height: '630px'
          }}>
            {data.blocks.slice(0, 5).map((block: any, idx: number) => (
              <div key={idx} style={{
                width: '700px',
                backgroundColor: 'rgba(255, 255, 255, 0.05)',
                borderLeft: '4px solid #2DD4BF',
                borderRadius: '10px',
                padding: '10px 20px',
                display: 'flex',
                flexDirection: 'column',
                minHeight: '115px'
              }}>
                <span style={{
                  fontSize: '15px',
                  fontFamily: 'EliteBold',
                  color: '#FFD700',
                  textTransform: 'uppercase',
                  marginBottom: '6px',
                  display: 'flex'
                }}>
                  {block.title}
                </span>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                  {block.items.slice(0, 2).map((item: string, i: number) => (
                    <div key={i} style={{ display: 'flex', fontSize: '11px', color: '#FFFFFF', fontFamily: 'EliteReg', opacity: 0.9 }}>
                      <span style={{ marginRight: '6px', color: '#2DD4BF' }}>•</span>
                      <span style={{ flex: 1 }}>{item}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
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
