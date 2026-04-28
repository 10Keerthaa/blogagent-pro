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
 * Resizes the image to a standard hero size.
 * Overlay logic is now handled in the frontend for pixel-perfect precision.
 */
export async function generateHeroBanner(imageBuffer: Buffer, title: string): Promise<Buffer> {
  try {
    const metadata = await sharp(imageBuffer).metadata();
    const width = metadata.width || 1024;

    // Enforce strictly 960x720 Elite dimensions and apply signature brand purple overlay
    const resizedImage = await sharp(imageBuffer)
      .resize(960, 720, {
        fit: 'cover',
        position: 'center',
        kernel: 'cubic'
      })
      .toBuffer();

    const escapedTitle = escapeXml(title.toUpperCase());
    
    // Create a professional SVG overlay with the brand tint and title text
    const overlay = Buffer.from(
      `<svg width="960" height="720">
        <defs>
          <linearGradient id="grad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" style="stop-color:#8B5CF6;stop-opacity:0.4" />
            <stop offset="100%" style="stop-color:#4C1D95;stop-opacity:0.5" />
          </linearGradient>
        </defs>
        <rect width="100%" height="100%" fill="url(#grad)" />
        <text 
          x="50%" 
          y="50%" 
          text-anchor="middle" 
          fill="white" 
          font-family="sans-serif" 
          font-size="42" 
          font-weight="bold"
          letter-spacing="1"
        >
          ${escapedTitle}
        </text>
      </svg>`
    );

    return await sharp(resizedImage)
      .composite([{ input: overlay, blend: 'over' }])
      .toBuffer();

  } catch (error) {
    console.error("Hero Banner processing failed:", error);
    return imageBuffer;
  }
}
