import { ImageResponse } from 'next/og';

export const runtime = 'edge';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { bgImageBase64, parsed, mode, logoBase64 } = body;

    // Fetch fonts from our own project (bundled in /public/fonts) - avoids GitHub CDN blocks
    const host = request.headers.get('x-forwarded-host') || request.headers.get('host') || 'localhost:3000';
    const proto = request.headers.get('x-forwarded-proto') || 'http';
    const baseUrl = `${proto}://${host}`;

    const fontBoldRes = await fetch(`${baseUrl}/fonts/Inter-Bold.woff2`);
    const fontData = await fontBoldRes.arrayBuffer();

    const fontRegRes = await fetch(`${baseUrl}/fonts/Inter-Regular.woff2`);
    const fontRegData = await fontRegRes.arrayBuffer();

    const bgSrc = `data:image/jpeg;base64,${bgImageBase64}`;

    if (mode === 'DASHBOARD' || !mode || mode !== 'ROADMAP') {
      const central = parsed.central_theme || 'Dashboard';
      const quads = parsed.quadrants || [];
      const q1 = quads[0] || { title: '', points: [] };
      const q2 = quads[1] || { title: '', points: [] };
      const q3 = quads[2] || { title: '', points: [] };
      const q4 = quads[3] || { title: '', points: [] };

      return new ImageResponse(
        (
          <div style={{ display: 'flex', flexDirection: 'column', width: '100%', height: '100%', position: 'relative', backgroundColor: '#000' }}>
            <img src={bgSrc} style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
            
            {/* Absolute Logo Placement */}
            {logoBase64 && (
              <img 
                src={`data:image/png;base64,${logoBase64}`} 
                style={{ position: 'absolute', bottom: '60px', right: '60px', height: '75px', width: 'auto' }} 
              />
            )}

            <div style={{ display: 'flex', flexDirection: 'column', width: '100%', height: '100%', padding: '140px 60px' }}>
               
               {/* Top Row */}
               <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', height: '250px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', width: '310px' }}>
                    <h3 style={{ color: '#FFD700', fontSize: '26px', fontFamily: '"Inter"', marginBottom: '12px', textShadow: '0 4px 10px rgba(0,0,0,0.8)' }}>{q1.title}</h3>
                    {Array.isArray(q1.points) && q1.points.map((pt: string, i: number) => (
                      <p key={i} style={{ color: '#FFFFFF', fontSize: '20px', fontFamily: '"InterReg"', margin: '4px 0', textShadow: '0 2px 5px rgba(0,0,0,0.8)' }}>• {pt}</p>
                    ))}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', width: '310px', alignItems: 'flex-end', textAlign: 'right' }}>
                    <h3 style={{ color: '#FFD700', fontSize: '26px', fontFamily: '"Inter"', marginBottom: '12px', textShadow: '0 4px 10px rgba(0,0,0,0.8)' }}>{q2.title}</h3>
                    {Array.isArray(q2.points) && q2.points.map((pt: string, i: number) => (
                      <p key={i} style={{ color: '#FFFFFF', fontSize: '20px', fontFamily: '"InterReg"', margin: '4px 0', textShadow: '0 2px 5px rgba(0,0,0,0.8)' }}>{pt} •</p>
                    ))}
                  </div>
               </div>

               {/* Middle Row (Center Theme) */}
               <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', width: '100%', flex: 1 }}>
                  <h2 style={{ color: '#FFD700', fontSize: '30px', fontFamily: '"Inter"', textAlign: 'center', width: '280px', textShadow: '0 4px 15px rgba(0,0,0,0.9)' }}>{central}</h2>
               </div>

               {/* Bottom Row */}
               <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', height: '250px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', width: '310px' }}>
                    <h3 style={{ color: '#FFD700', fontSize: '26px', fontFamily: '"Inter"', marginBottom: '12px', textShadow: '0 4px 10px rgba(0,0,0,0.8)' }}>{q3.title}</h3>
                    {Array.isArray(q3.points) && q3.points.map((pt: string, i: number) => (
                      <p key={i} style={{ color: '#FFFFFF', fontSize: '20px', fontFamily: '"InterReg"', margin: '4px 0', textShadow: '0 2px 5px rgba(0,0,0,0.8)' }}>• {pt}</p>
                    ))}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', width: '310px', alignItems: 'flex-end', textAlign: 'right' }}>
                    <h3 style={{ color: '#FFD700', fontSize: '26px', fontFamily: '"Inter"', marginBottom: '12px', textShadow: '0 4px 10px rgba(0,0,0,0.8)' }}>{q4.title}</h3>
                    {Array.isArray(q4.points) && q4.points.map((pt: string, i: number) => (
                      <p key={i} style={{ color: '#FFFFFF', fontSize: '20px', fontFamily: '"InterReg"', margin: '4px 0', textShadow: '0 2px 5px rgba(0,0,0,0.8)' }}>{pt} •</p>
                    ))}
                  </div>
               </div>

            </div>
          </div>
        ),
        {
          width: 800,
          height: 1000,
          fonts: [
            { name: 'Inter', data: fontData, style: 'normal', weight: 700 },
            { name: 'InterReg', data: fontRegData, style: 'normal', weight: 400 },
          ],
        }
      );
    } else {
      // ROADMAP MODE Overlay
      const milestones = parsed.milestones || [];
      return new ImageResponse(
        (
          <div style={{ display: 'flex', width: '100%', height: '100%', position: 'relative', backgroundColor: '#000' }}>
            <img src={bgSrc} style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
            
            {/* Absolute Logo Placement */}
            {logoBase64 && (
              <img 
                src={`data:image/png;base64,${logoBase64}`} 
                style={{ position: 'absolute', bottom: '60px', right: '60px', height: '75px', width: 'auto' }} 
              />
            )}

            <div style={{ position: 'absolute', top: '60px', left: '0', width: '100%', display: 'flex', justifyContent: 'center' }}>
               <h2 style={{ color: '#FFD700', fontSize: '36px', fontFamily: '"Inter"', textShadow: '0 4px 10px rgba(0,0,0,0.8)' }}>ROADMAP</h2>
            </div>
            
            <div style={{ position: 'absolute', bottom: '150px', left: '0', width: '100%', display: 'flex', flexWrap: 'wrap', justifyContent: 'center', padding: '0 40px' }}>
              {Array.isArray(milestones) && milestones.map((m: string, i: number) => (
                <div key={i} style={{ backgroundColor: 'rgba(26, 11, 46, 0.85)', padding: '12px 20px', margin: '8px', borderRadius: '8px', border: '1px solid #7B2FBE', boxShadow: '0 4px 15px rgba(0,0,0,0.5)' }}>
                  <p style={{ color: '#FFF', fontSize: '18px', fontFamily: '"Inter"', margin: 0 }}>{i + 1}. {m}</p>
                </div>
              ))}
            </div>
          </div>
        ),
        {
          width: 800,
          height: 1000,
          fonts: [
            { name: 'Inter', data: fontData, style: 'normal', weight: 700 },
          ],
        }
      );
    }
  } catch (e: any) {
    return new Response(`Failed to generate overlay: ${e.message}`, { status: 500 });
  }
}
