import { NextResponse } from "next/server";
import fs from 'fs/promises';
import path from 'path';

export async function POST(req: Request) {
  try {
    const { title, content, metaDesc, imageUrl, infographicUrl } = await req.json();

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

    /**
     * FIREWALL BYPASS STRATEGY: 
     * We use short GCS URLs instead of massive Base64 strings.
     * This keeps the payload lightweight and safe for Sucuri Firewall.
     */

    let finalContent = "";

    // 1. Embed Featured Image at the top with Overlays
    if (imageUrl) {
      const origin = new URL(req.url).origin;
      const blogTagUrl = `${origin}/Blog.png`;
      const logoUrl = `${origin}/10xDS.png`;

      // Split title for overlay formatting (same as preview)
      const titleParts = title.split(':');
      const mainTitle = titleParts[0];
      const subtitle = titleParts.length > 1 ? titleParts.slice(1).join(':') : '';

      finalContent += `
      <div class="featured-image-wrapper" style="position: relative; margin-bottom: 40px; overflow: hidden; border-radius: 0;">
        <img src="${imageUrl}" alt="${title}" style="width: 100%; height: auto; display: block; object-fit: cover; max-height: 580px;" />
        
        <!-- Purple Overlay Tint (#7E57C2) -->
        <div style="position: absolute; inset: 0; background-color: rgba(126, 87, 194, 0.45); z-index: 1; pointer-events: none;"></div>
        
        <!-- Overlays -->
        <div style="position: absolute; inset: 0; z-index: 2; pointer-events: none;">
          <!-- Blog Tag (Top-Left 40px) -->
          <img src="${blogTagUrl}" alt="Blog" style="position: absolute; top: 40px; left: 40px; height: 40px; width: auto;" />
          
          <!-- Title Group (40px Left, Below Blog Tag) -->
          <div style="position: absolute; top: 100px; left: 40px; color: #ffffff; max-width: 80%;">
             <h1 style="font-size: 56px; font-weight: bold; margin: 0; line-height: 1.1; text-shadow: 0 4px 20px rgba(0,0,0,0.4);">${mainTitle}</h1>
             ${subtitle ? `<p style="font-size: 44px; margin: 8px 0 0 0; line-height: 1.1; opacity: 0.9; text-shadow: 0 4px 15px rgba(0,0,0,0.3);">${subtitle}</p>` : ''}
          </div>
          
          <!-- Logo (Bottom-Right 40px) -->
          <img src="${logoUrl}" alt="10xDS" style="position: absolute; bottom: 40px; right: 40px; height: 56px; width: auto;" />
        </div>
      </div>
      `;
    }

    // 2. Add the main content
    finalContent += content;

    // 3. Embed Infographic at the bottom
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
      })
    });

    if (!postResponse.ok) {
      const errorData = await postResponse.text();
      console.error("WordPress Post Creation Failed:", errorData.substring(0, 500));
      throw new Error(`WordPress Post Creation Blocked: ${postResponse.status}`);
    }

    const postData = await postResponse.json();

    // RESTORED: Log the Publication for the History Tab
    try {
      const logsDir = path.resolve(process.cwd(), 'logs');
      const logFile = path.resolve(logsDir, 'publications.json');
      await fs.mkdir(logsDir, { recursive: true });
      let history = [];
      try {
        const fileContent = await fs.readFile(logFile, 'utf8');
        history = JSON.parse(fileContent);
      } catch (e) { }
      history.unshift({ title, url: postData.link, date: new Date().toISOString(), id: postData.id });
      await fs.writeFile(logFile, JSON.stringify(history.slice(0, 100), null, 2));
      console.log(`Publication logged successfully to ${logFile}. Total entries: ${history.length}`);
    } catch (logErr) {
      console.error("Failed to log publication:", logErr);
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
