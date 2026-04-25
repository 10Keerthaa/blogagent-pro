import { NextResponse } from "next/server";
import sharp from 'sharp';

export async function POST(req: Request) {
  try {
    const { bgImageBase64, data, fontBold, fontReg } = await req.json();

    if (!bgImageBase64 || !data) {
      return NextResponse.json({ error: "Missing data" }, { status: 400 });
    }

    const width = 800;
    const height = 1000;

    // SVG Construction for "Zero-Error" Spelling
    const svg = `
      <svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <style>
            @font-face {
              font-family: 'EliteBold';
              src: url(data:font/woff2;base64,${fontBold});
            }
            @font-face {
              font-family: 'EliteReg';
              src: url(data:font/woff2;base64,${fontReg});
            }
            .title { fill: #FFD700; font-family: 'EliteBold', ui-sans-serif, system-ui, -apple-system, sans-serif; font-size: 38px; text-transform: uppercase; font-weight: 900; }
            .subtitle { fill: #FFFFFF; font-family: 'EliteReg', ui-sans-serif, system-ui, -apple-system, sans-serif; font-size: 22px; font-weight: 500; opacity: 0.9; }
            .pillar-text { fill: #FFFFFF; font-family: 'EliteBold', ui-sans-serif, system-ui, -apple-system, sans-serif; font-size: 11px; text-transform: uppercase; letter-spacing: 1px; text-anchor: middle; }
            .block-title { fill: #B794F4; font-family: 'EliteBold', ui-sans-serif, system-ui, -apple-system, sans-serif; font-size: 18px; text-transform: uppercase; }
            .block-item { fill: #FFFFFF; font-family: 'EliteReg', ui-sans-serif, system-ui, -apple-system, sans-serif; font-size: 14px; }
            .footer { fill: #FFFFFF; font-family: 'EliteBold', ui-sans-serif, system-ui, -apple-system, sans-serif; font-size: 16px; text-transform: uppercase; letter-spacing: 2px; opacity: 0.8; }
          </style>
        </defs>

        <!-- Tier 1: Header -->
        <text x="400" y="60" text-anchor="middle" class="title">${data.title}</text>
        <text x="400" y="100" text-anchor="middle" class="subtitle">${data.subtitle}</text>

        <!-- Tier 2: Icon Pillars labels -->
        ${(data.pillars || []).map((text: string, i: number) => {
          const x = 80 + (i * 128); // Evenly spaced 6 icons
          return `<text x="${x}" y="240" class="pillar-text">${text}</text>`;
        }).join('')}

        <!-- Tier 3: Data Grid (Dual Column) -->
        ${(data.blocks || []).map((block: any, i: number) => {
          const isLeft = i % 2 === 0;
          const x = isLeft ? 60 : 420;
          const y = 320 + (Math.floor(i / 2) * 220);
          
          return `
            <g transform="translate(${x}, ${y})">
              <text x="0" y="0" class="block-title">${block.title}</text>
              ${(block.items || []).map((item: string, j: number) => `
                <text x="0" y="${30 + (j * 25)}" class="block-item">• ${item}</text>
              `).join('')}
            </g>
          `;
        }).join('')}

        <!-- Tier 4: Footer -->
        <text x="400" y="960" text-anchor="middle" class="footer">${data.footer_summary}</text>
      </svg>
    `;

    const svgBuffer = Buffer.from(svg);
    const bgBuffer = Buffer.from(bgImageBase64, 'base64');

    const finalImage = await sharp(bgBuffer)
      .resize(width, height)
      .composite([{ input: svgBuffer, top: 0, left: 0 }])
      .png()
      .toBuffer();

    return new Response(new Uint8Array(finalImage), {
      headers: { 'Content-Type': 'image/png' }
    });

  } catch (error: any) {
    console.error("Overlay Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
