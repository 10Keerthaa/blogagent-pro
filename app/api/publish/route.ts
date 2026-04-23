import { NextResponse } from "next/server";
import { db } from "@/lib/firebaseAdmin";
import sharp from "sharp";

export async function POST(req: Request) {
  try {
    const { id, title, content, metaDesc, imageUrl, infographicUrl, categories } = await req.json();

    let wpUrl = process.env.WORDPRESS_URL || '';
    if (wpUrl.endsWith('/')) wpUrl = wpUrl.slice(0, -1);

    const wpUser = process.env.WORDPRESS_USER;
    const wpPassword = process.env.WORDPRESS_APP_PASSWORD;

    if (!wpUrl || !wpUser || !wpPassword) {
      return NextResponse.json({
        error: "WordPress credentials missing",
        details: "Please add WORDPRESS_URL, WORDPRESS_USER, and WORDPRESS_APP_PASSWORD to your .env.local"
      }, { status: 500 });
    }

    const authHeader = 'Basic ' + Buffer.from(`${wpUser}:${wpPassword}`).toString('base64');
    const stealthHeaders = {
      'Authorization': authHeader,
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
      'Accept': 'application/json, text/plain, */*',
      'Accept-Language': 'en-US,en;q=0.9',
    };

    let finalContent = "";

    // 1. Embed Featured Image at the top with Overlays
    if (imageUrl) {
      const origin = new URL(req.url).origin;
      const blogTagUrl = `${origin}/Blog.png`;
      const logoUrl = `${origin}/10xDS.png`;

      const titleParts = title.split(':');
      const mainTitle = titleParts[0] + (title.includes(':') ? ':' : '');
      const subtitle = titleParts.length > 1 ? titleParts.slice(1).join(':').trim() : '';

      // Removed HTML injection for the featured image to allow WordPress themes 
      // to natively handle the thumbnail display.
    }

    finalContent += content;

    if (infographicUrl) {
      finalContent += `<hr style="margin: 40px 0;" />
      <div class="visual-summary-container" style="text-align: center; padding: 20px 0;">
        <h3 style="margin-bottom: 25px; color: #1e293b; font-family: sans-serif;">Visual Summary</h3>
        <img src="${infographicUrl}" alt="Infographic Overview" style="max-width: 100%; height: auto; border-radius: 8px; box-shadow: 0 10px 30px rgba(0,0,0,0.15);" />
      </div>`;
    }

    // Step 2: Burn text and overlays into the image, then sideload to WordPress
    let featuredMediaId = null;
    if (imageUrl) {
      try {
        console.log("Compositing and Sideloading Featured Image to WordPress...");
        const origin = new URL(req.url).origin;
        const blogTagUrl = `${origin}/Blog.png`;
        const logoUrl = `${origin}/10xDS.png`;

        const titleParts = title.split(':');
        const mainTitle = titleParts[0] + (title.includes(':') ? ':' : '');
        const subtitle = titleParts.length > 1 ? titleParts.slice(1).join(':').trim() : '';

        const escapeXml = (unsafe: string) => unsafe.replace(/[<>&"']/g, (c) => {
          switch (c) {
            case '<': return '&lt;'; case '>': return '&gt;';
            case '&': return '&amp;'; case '"': return '&quot;';
            case "'": return '&apos;'; default: return c;
          }
        });

        const wrapText = (text: string, maxChars: number) => {
          const words = text.split(' ');
          const lines = [];
          let currentLine = '';
          for (const word of words) {
            if ((currentLine + word).length > maxChars) {
              lines.push(currentLine.trim());
              currentLine = word + ' ';
            } else {
              currentLine += word + ' ';
            }
          }
          if (currentLine) lines.push(currentLine.trim());
          return lines;
        };

        const imgRes = await fetch(imageUrl);
        const blogTagRes = await fetch(blogTagUrl);
        const logoRes = await fetch(logoUrl);

        if (imgRes.ok && blogTagRes.ok && logoRes.ok) {
          const imgBuffer = Buffer.from(await imgRes.arrayBuffer());
          const blogTagBuffer = Buffer.from(await blogTagRes.arrayBuffer());
          const logoBuffer = Buffer.from(await logoRes.arrayBuffer());

          const targetWidth = 1200;
          const targetHeight = 630;

          const resizedBase = await sharp(imgBuffer)
            .resize(targetWidth, targetHeight, { fit: 'cover' })
            .toBuffer();

          const resizedBlogTag = await sharp(blogTagBuffer).resize({ height: 40 }).toBuffer();
          const resizedLogo = await sharp(logoBuffer).resize({ height: 56 }).toBuffer();
          
          const logoMeta = await sharp(resizedLogo).metadata();
          const logoWidth = logoMeta.width || 180;

          const titleLines = wrapText(mainTitle, 35);
          const subtitleLines = subtitle ? wrapText(subtitle, 45) : [];

          let svgText = `<svg width="${targetWidth}" height="${targetHeight}">`;
          svgText += `<rect width="100%" height="100%" fill="rgba(126, 87, 194, 0.45)" />`;
          
          let currentY = 160;
          for (const line of titleLines) {
            svgText += `<text x="50" y="${currentY}" font-family="sans-serif" font-size="56" font-weight="bold" fill="#ffffff" filter="drop-shadow(0px 4px 10px rgba(0,0,0,0.5))">${escapeXml(line)}</text>`;
            currentY += 65;
          }
          currentY += 15;
          for (const line of subtitleLines) {
            svgText += `<text x="50" y="${currentY}" font-family="sans-serif" font-size="44" fill="#ffffff" opacity="0.95" filter="drop-shadow(0px 2px 8px rgba(0,0,0,0.4))">${escapeXml(line)}</text>`;
            currentY += 55;
          }
          svgText += `</svg>`;

          const compositedImage = await sharp(resizedBase)
            .composite([
              { input: Buffer.from(svgText), top: 0, left: 0 },
              { input: resizedBlogTag, top: 40, left: 50 },
              { input: resizedLogo, top: targetHeight - 56 - 40, left: targetWidth - logoWidth - 40 }
            ])
            .png()
            .toBuffer();

          const filename = `featured-${Date.now()}.png`;
          const mediaResponse = await fetch(`${wpUrl}/wp-json/wp/v2/media`, {
            method: 'POST',
            headers: {
              'Authorization': authHeader,
              'Content-Type': 'image/png',
              'Content-Disposition': `attachment; filename="${filename}"`,
            },
            body: compositedImage as any
          });

          if (mediaResponse.ok) {
            const mediaData = await mediaResponse.json();
            featuredMediaId = mediaData.id;
            console.log(`✅ Media Composited & Sideloaded: ID ${featuredMediaId}`);
          } else {
             const mediaErr = await mediaResponse.text();
             console.error("❌ WordPress Media Upload Failed:", mediaErr.substring(0, 500));
          }
        }
      } catch (sideloadErr) {
        console.error("⚠️ Sideloading/Compositing failed (continuing without ID):", sideloadErr);
      }
    }

    // Step 3: Create the Post on WordPress
    const postResponse = await fetch(`${wpUrl}/wp-json/wp/v2/posts`, {
      method: 'POST',
      headers: {
        ...stealthHeaders,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        title: title,
        content: finalContent,
        excerpt: metaDesc,
        status: 'publish',
        featured_media: featuredMediaId, // 🔥 KEY FIX: Assign the sideloaded ID here
        rank_math_description: metaDesc,
        categories: categories || [253] // Default to Blog if missing
      })
    });

    if (!postResponse.ok) {
      const errorData = await postResponse.text();
      console.error("WordPress Post Creation Failed:", errorData.substring(0, 500));
      throw new Error(`WordPress Post Creation Blocked: ${postResponse.status}`);
    }

    const postData = await postResponse.json();

    // UPDATE FIRESTORE: Mark as published
    if (id) {
        try {
            await db.collection('blog_posts').doc(id).update({
                status: 'published',
                wpUrl: postData.link,
                last_edited_at: new Date().toISOString(),
                date: new Date().toISOString(),
                published_at: new Date().toISOString()
            });
            console.log(`✅ Firestore updated: Post ${id} marked as published.`);
        } catch (dbErr) {
            console.error("⚠️ Failed to update Firestore status after publish:", dbErr);
        }
    }

    return NextResponse.json({
      success: true,
      url: postData.link,
      id: postData.id
    });

  } catch (error: any) {
    console.error("WordPress Publish Error:", error.message);
    return NextResponse.json({
      error: "Publishing Failed",
      details: error.message || String(error)
    }, { status: 500 });
  }
}
