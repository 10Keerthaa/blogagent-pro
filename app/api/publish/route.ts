import { NextResponse } from "next/server";
import { ASSETS } from '@/lib/constants';
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

      // Removed HTML injection for the featured image because the WordPress 
      // theme natively displays the sideloaded featured_media as a hero banner.
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
        const blogTagBase64 = ASSETS.blogTag;
        const logoBase64 = ASSETS.logo;

        const titleParts = title.split(':');
        const mainTitle = titleParts[0] + (title.includes(':') ? ':' : '');
        const subtitle = titleParts.length > 1 ? titleParts.slice(1).join(':').trim() : '';

        const ogUrl = new URL(`${origin}/api/banner`);

        // Prepare Font: Fetch TTF from public folder for the banner
        let fontBoldBase64 = '';
        let fontRegBase64 = '';
        try {
          const fontRes = await fetch(`${origin}/fonts/Inter-Bold.ttf`);
          if (fontRes.ok) {
            fontBoldBase64 = Buffer.from(await fontRes.arrayBuffer()).toString('base64');
          }
          const fontRegRes = await fetch(`${origin}/fonts/Inter-Regular.ttf`);
          if (fontRegRes.ok) {
            fontRegBase64 = Buffer.from(await fontRegRes.arrayBuffer()).toString('base64');
          }
        } catch (fontErr) {
          console.warn('Font HTTP fetch failed:', fontErr);
        }

        const imgRes = await fetch(ogUrl.toString(), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: title,
            bgUrl: imageUrl,
            logoBase64: logoBase64,
            tagBase64: blogTagBase64,
            fontBoldBase64: fontBoldBase64,
            fontRegBase64: fontRegBase64
          })
        });

        if (imgRes.ok) {
          const imgBuffer = await imgRes.arrayBuffer();

          const filename = `featured-${Date.now()}.png`;
          const formData = new FormData();
          const blob = new Blob([new Uint8Array(imgBuffer)], { type: 'image/png' });
          formData.append('file', blob, filename);

          const mediaResponse = await fetch(`${wpUrl}/wp-json/wp/v2/media`, {
            method: 'POST',
            headers: {
              'Authorization': authHeader,
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
              'Accept': 'application/json, text/plain, */*'
            },
            body: formData
          });

          if (mediaResponse.ok) {
            const mediaData = await mediaResponse.json();
            featuredMediaId = mediaData.id;
            console.log(`✅ Media Composited & Sideloaded: ID ${featuredMediaId}`);
          } else {
             const mediaErr = await mediaResponse.text();
             console.error("❌ WordPress Media Upload Failed:", mediaErr.substring(0, 500));
          }
        } else {
          console.error("❌ Vercel OG Banner Generation Failed:", await imgRes.text());
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
