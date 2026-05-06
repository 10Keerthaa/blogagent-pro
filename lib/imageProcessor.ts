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
export async function generateHeroBanner(imageBuffer: Buffer, title: string, platform: string = 'framer'): Promise<Buffer> {
  try {
    const isWordPress = platform === 'wordpress';
    const width = isWordPress ? 960 : 1376;
    const height = isWordPress ? 720 : 768;

    // Enforce platform-specific dimensions and apply signature brand purple overlay
    const resizedImage = await sharp(imageBuffer)
      .resize(width, height, {
        fit: 'cover',
        position: 'center',
        kernel: 'cubic'
      })
      .toBuffer();

    const escapedTitle = escapeXml(title.toUpperCase());
    
    // Apply ONLY the purple brand gradient tint (no SVG text - server has no system fonts).
    // Title text is properly rendered by the /api/banner route with embedded custom fonts.
    const overlay = Buffer.from(
      `<svg width="${width}" height="${height}">
        <defs>
          <linearGradient id="grad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" style="stop-color:#8B5CF6;stop-opacity:0.4" />
            <stop offset="100%" style="stop-color:#4C1D95;stop-opacity:0.5" />
          </linearGradient>
        </defs>
        <rect width="100%" height="100%" fill="url(#grad)" />
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
