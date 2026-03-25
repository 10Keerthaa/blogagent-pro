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

    // Enforce exact 960x720 Elite dimensions with high-quality cubic interpolation
    return await sharp(imageBuffer)
      .resize(960, 720, {
        fit: 'cover',
        position: 'center',
        kernel: 'cubic'
      })
      .toBuffer();

  } catch (error) {
    console.error("Hero Banner processing failed:", error);
    return imageBuffer;
  }
}
