import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

/**
 * Bakes a semi-transparent purple overlay and white title text directly
 * into an image buffer to create a professional 'Hero Banner'.
 */
function escapeXml(unsafe: string): string {
  return unsafe.replace(/[<>&"']/g, (c) => {
    switch (c) {
      case '<': return '&lt;';
      case '>': return '&gt;';
      case '&': return '&amp;';
      case '"': return '&quot;';
      case "'": return '&apos;';
      default: return c;
    }
  });
}

/**
 * Bakes a semi-transparent purple overlay and white title text directly
 * into an image buffer to create a professional 'Hero Banner'.
 */
export async function generateHeroBanner(imageBuffer: Buffer, title: string): Promise<Buffer> {
  try {
    const metadata = await sharp(imageBuffer).metadata();
    const width = metadata.width || 1024;
    const height = metadata.height || 1024;

    // 1. Semi-transparent purple overlay SVG (matching app theme - vibrant violet)
    const overlaySvg = `
      <svg width="${width}" height="${height}">
        <rect x="0" y="0" width="${width}" height="${height}" fill="rgba(74, 35, 119, 0.70)" />
      </svg>
    `;

    // 2. Dynamic Title Splitting logic (Bold vs Regular)
    let firstPart = title;
    let secondPart = "";
    const splitChar = title.includes(':') ? ':' : (title.includes('-') ? '-' : null);

    if (splitChar) {
      const parts = title.split(splitChar);
      firstPart = parts[0] + splitChar;
      secondPart = parts.slice(1).join(splitChar).trim();
    }

    const escapedFirst = escapeXml(firstPart);
    const escapedSecond = escapeXml(secondPart);

    // 3. White Title Text SVG (Left-aligned with brand badge and logo)
    const maxCharsPerLine = 22; // Shorter lines for more 'Impact' as seen in mockup
    const words = title.split(' ');
    const lines: string[] = [];
    let currentLine = '';

    words.forEach(word => {
      if (currentLine && (currentLine + ' ' + word).length > maxCharsPerLine) {
        lines.push(currentLine.trim());
        currentLine = word;
      } else {
        currentLine += (currentLine ? ' ' : '') + word;
      }
    });
    if (currentLine) lines.push(currentLine.trim());

    const fontSize = Math.floor(width / 20); // Matches reference mockup proportions
    const lineHeight = fontSize * 1.2;
    const leftMargin = width * 0.08;
    const startY = height * 0.30;

    const textSvg = `
      <svg width="${width}" height="${height}">
        <style>
          .title { fill: white; font-family: 'Inter', 'Segoe UI', Roboto, sans-serif; text-anchor: start; }
          .bold { font-weight: 800; filter: drop-shadow(0px 2px 4px rgba(0,0,0,0.3)); }
          .regular { font-weight: 400; opacity: 0.95; }
          .badge-text { fill: white; font-family: 'Inter', sans-serif; font-weight: 800; font-size: ${fontSize * 0.35}px; text-anchor: middle; }
        </style>
        
        <!-- BLOG BADGE: matching the purple/white aesthetic of mockup -->
        <rect x="${leftMargin}" y="${startY - fontSize * 2.0}" width="${fontSize * 1.8}" height="${fontSize * 0.8}" fill="#6366f1" rx="4" ry="4" />
        <text x="${leftMargin + (fontSize * 0.9)}" y="${startY - fontSize * 2.0 + (fontSize * 0.55)}" class="badge-text" text-anchor="middle">Blog</text>

        <!-- MAIN TITLE -->
        ${lines.map((line, i) => {
      const y = startY + (i * lineHeight);
      return `<text x="${leftMargin}" y="${y}" class="title bold" font-size="${fontSize}px">${escapeXml(line)}</text>`;
    }).join('')}

        <!-- 10xDS LOGO: positioned in the corner without white background -->
      </svg>
    `;

    // 4. Load and Resize the 10xDS Logo
    let logoLayer = [];
    try {
      const logoPath = path.join(process.cwd(), 'public', '10xDS.png');
      const logoBuffer = await fs.promises.readFile(logoPath);
      const logoWidth = Math.floor(fontSize * 2.2);

      const resizedLogo = await sharp(logoBuffer)
        .resize({ width: logoWidth })
        .ensureAlpha()
        .png()
        .toBuffer();

      const logoMetadata = await sharp(resizedLogo).metadata();
      const logoHeight = logoMetadata.height || 0;

      logoLayer.push({
        input: resizedLogo,
        top: Math.round(height - logoHeight - (fontSize * 0.5)),
        left: Math.round(width - logoWidth - (fontSize * 0.5))
      });
    } catch (e) {
      console.warn("Logo processing failed:", e);
    }

    // 5. Composite the layers
    return await sharp(imageBuffer)
      .composite([
        { input: Buffer.from(overlaySvg), top: 0, left: 0 },
        { input: Buffer.from(textSvg), top: 0, left: 0 },
        ...logoLayer
      ])
      .toBuffer();

  } catch (error) {
    console.error("Hero Banner generation failed, falling back to original image:", error);
    return imageBuffer;
  }
}
