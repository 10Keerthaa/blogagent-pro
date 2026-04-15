import { NextResponse } from "next/server";
import { db } from "@/lib/firebaseAdmin";

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

      finalContent += `
      <div class="featured-image-wrapper" style="position: relative; margin-bottom: 40px; overflow: hidden; border-radius: 0;">
        <img src="${imageUrl}" alt="${title}" style="width: 100%; height: auto; display: block; object-fit: cover; max-height: 580px;" />
        <div style="position: absolute; inset: 0; background-color: rgba(126, 87, 194, 0.45); z-index: 1; pointer-events: none;"></div>
        <div style="position: absolute; inset: 0; z-index: 2; pointer-events: none;">
          <img src="${blogTagUrl}" alt="Blog" style="position: absolute; top: 40px; left: 40px; height: 40px; width: auto;" />
          <div style="position: absolute; top: 100px; left: 40px; color: #ffffff; max-width: 85%; font-family: sans-serif; line-height: 1.3;">
             <h1 style="font-size: 56px; font-weight: 700; margin: 0; padding: 0; line-height: 1.3; text-shadow: 0 4px 20px rgba(0,0,0,0.4);">${mainTitle}</h1>
             ${subtitle ? `<p style="font-size: 44px; font-weight: 400; margin: 0; padding: 0; line-height: 1.3; opacity: 0.95; text-shadow: 0 4px 15px rgba(0,0,0,0.3);">${subtitle}</p>` : ''}
          </div>
          <img src="${logoUrl}" alt="10xDS" style="position: absolute; bottom: 40px; right: 40px; height: 56px; width: auto;" />
        </div>
      </div>
      `;
    }

    finalContent += content;

    if (infographicUrl) {
      finalContent += `<hr style="margin: 40px 0;" />
      <div class="visual-summary-container" style="text-align: center; padding: 20px 0;">
        <h3 style="margin-bottom: 25px; color: #1e293b; font-family: sans-serif;">Visual Summary</h3>
        <img src="${infographicUrl}" alt="Infographic Overview" style="max-width: 100%; height: auto; border-radius: 8px; box-shadow: 0 10px 30px rgba(0,0,0,0.15);" />
      </div>`;
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
