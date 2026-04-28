import { NextResponse } from 'next/server';
import { ASSETS, FONTS } from '@/lib/constants';
import { db } from "@/lib/firebaseAdmin";
import sharp from "sharp";

export async function POST(req: Request) {
  try {
    const { id, title, content, metaDesc, imageUrl, infographicUrl, categories, platform } = await req.json();

    // ─────────────────────────────────────────────────────────────────────
    // FRAMER PUBLISHING BRANCH (runs only when platform === 'framer')
    // ─────────────────────────────────────────────────────────────────────
    if (platform === 'framer') {
      const framerApiKey = process.env.FRAMER_API_KEY;
      const framerProjectId = process.env.FRAMER_PROJECT_ID;

      if (!framerApiKey || !framerProjectId) {
        return NextResponse.json({
          error: "Framer credentials missing",
          details: "Please add FRAMER_API_KEY and FRAMER_PROJECT_ID to your Vercel environment variables."
        }, { status: 500 });
      }

      // Build slug from title
      const slug = title.toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .trim()
        .replace(/\s+/g, '-')
        .substring(0, 80);

      // Build full HTML content with infographic embedded at the bottom
      let framerContent = content || '';
      if (infographicUrl) {
        framerContent += `<hr style="margin: 40px 0;" />
        <div class="visual-summary-container" style="text-align: center; padding: 20px 0;">
          <h3 style="margin-bottom: 25px; color: #1e293b; font-family: sans-serif;">Visual Summary</h3>
          <img src="${infographicUrl}" alt="Infographic Overview" style="max-width: 100%; height: auto; border-radius: 8px; box-shadow: 0 10px 30px rgba(0,0,0,0.15);" />
        </div>`;
      }

      // Map Framer category ID or WP numeric ID → display name (as stored in Framer CMS "Category" field)
      const FRAMER_CATEGORY_MAP: Record<string | number, string> = {
        'framer-blog':     'Blog',
        'computer-vision': 'Computer Vision',
        'voice-ai':        'Voice AI',
        'general':         'General',
        'ai-assistant':    'AI Assistant',
        'idr':             'IDR',
        'case-studies':    'Case studies',
        'vision-ai':       'Vision AI',
        '10xclassify':     '10xClassify',
        // WordPress numeric ID support
        '1':               'Blog',
        '101':             'Computer Vision',
      };

      const nonLockedCat = (categories || []).find((c: string | number) => c !== 'framer-blog' && c !== 1);
      
      // Ensure categoryName is always a string for Framer SDK (typia assertion)
      const categoryName = nonLockedCat 
        ? (FRAMER_CATEGORY_MAP[nonLockedCat] || String(nonLockedCat)) 
        : 'Blog';

      // Connect to Framer via framer-api (WebSocket SDK)
      const { connect } = await import('framer-api');
      const framer = await connect(
        `https://framer.com/projects/${framerProjectId}`,
        framerApiKey
      );

      const collections = await framer.getCollections();
      const blogsCol = collections.find((c: any) => c.name === 'Blogs');

      if (!blogsCol) {
        await framer.disconnect();
        throw new Error('Blogs collection not found in Framer project');
      }

      // Add item using the exact field keys from the live Blogs collection
      const newItems: any[] = await (blogsCol as any).addItems([{
        slug,
        draft: false,
        fieldData: {
          "Blog Head":  { type: "string",        value: title },
          "Content":    { type: "formattedText", value: framerContent },
          "Category":   { type: "string",        value: categoryName },
          "Description":{ type: "string",        value: metaDesc || '' },
          "m8La9LqWO":  { type: "string",        value: imageUrl || '' },
          "H2Goeekmd":  { type: "string",        value: title },
          "g6sVmWkbx":  { type: "string",        value: metaDesc || '' },
        }
      }]);

      await framer.disconnect();

      const framerItemId = (newItems?.[0] as any)?.id || null;
      const framerItemUrl = `https://10xds.ai/blog/${slug}`;
      console.log(`✅ Framer CMS item created: ${framerItemId}`);

      // Update Firestore to mark as published
      if (id) {
          try {
              await db.collection('blog_posts').doc(id).update({
                  status: 'published',
                  framerUrl: framerItemUrl,
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
        url: framerItemUrl,
        id: framerItemId
      });
    }

    // ─────────────────────────────────────────────────────────────────────
    // WORDPRESS PUBLISHING BRANCH (unchanged — runs for all other requests)
    // ─────────────────────────────────────────────────────────────────────
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

        // Use Baked-in Fonts for the banner
        const fontBoldBase64 = FONTS.bold;
        const fontRegBase64 = FONTS.regular;

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
    console.error("Publish Error:", error.message);
    return NextResponse.json({
      error: "Publishing Failed",
      details: error.message || String(error)
    }, { status: 500 });
  }
}
