import { NextResponse } from "next/server";
import { uploadToGCS } from '@/lib/gcs';
import { getGoogleAuth } from '@/lib/googleAuth';
import sharp from 'sharp';
import { ASSETS, FONTS } from '@/lib/constants';
import fs from 'fs';
import path from 'path';


export const maxDuration = 300; // Extended for complex 10-node renders + two sequential AI calls + GCS upload

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const prompt = body.prompt || body.title;
    const content = body.content;
    const refinement = body.refinement; // New: User-provided visual feedback

    if (!prompt || !content) {
      return NextResponse.json({ error: "Prompt and Content are required" }, { status: 400 });
    }

    // AUTHENTICATION: Authenticate with Vertex AI
    const auth = await getGoogleAuth(['https://www.googleapis.com/auth/cloud-platform']);

    const client = await auth.getClient();
    const projectId = await auth.getProjectId();

    // DETECTION PHASE: Extract numerical constraint N from prompt
    const numMatch = prompt.match(/(\d+)/);
    const N = numMatch ? parseInt(numMatch[1], 10) : null;

    // TASK 1: Analysis Pass via Vertex AI Gemini 2.5 Pro
    let parsedData: any = {};
    try {
      const url = `https://us-central1-aiplatform.googleapis.com/v1/projects/${projectId}/locations/us-central1/publishers/google/models/gemini-2.5-pro:streamGenerateContent`;

      const aiPrompt = `
      Analyze this blog post and act as an Elite Visual Designer for a high-end technical infographic.
      
      Topic: ${prompt}
      Blog: ${content.substring(0, 4000)}

      Output ONLY a JSON object with:
      {
        "title": "EXACT MAIN TITLE (The part before the colon from the blog title)",
        "subtitle": "EXACT SUBTITLE (The part after the colon from the blog title)",
        "pillars": ["Exactly 4 short technical category names (1-2 words each)"],
        "executiveSummary": "A concise, 1-sentence conclusion about the strategic value of the topic (max 25 words).",
        "blocks": [
          {
            "title": "Category Name",
            "items": ["Exactly 3 high-authority technical bullet points"]
          }
        ] (Provide exactly 4 blocks)
      }

      DATA SOURCE RULE: Focus only on the unique technical insights found in this specific blog post. Only analyze the core technical body of the post.
      `;

      const resp = await client.request({
        url,
        method: 'POST',
        data: {
          contents: [{ role: "user", parts: [{ text: aiPrompt }] }],
          generationConfig: { temperature: 0.1, response_mime_type: "application/json" }
        }
      });

      const data = resp.data as any;
      let rawText = '';
      if (Array.isArray(data)) {
        rawText = data.map((chunk: any) => (chunk.candidates && chunk.candidates[0] && chunk.candidates[0].content.parts[0].text) || '').join('');
      } else if (data.candidates) {
        rawText = data.candidates[0].content.parts[0].text;
      }
      
      const jsonMatch = rawText.match(/\{[\s\S]*\}/);
      parsedData = JSON.parse(jsonMatch ? jsonMatch[0] : rawText);
    } catch (designerError: any) {
      console.error("Analysis Phase Error:", designerError);
      parsedData = { title: prompt.split(':')[0], subtitle: prompt.split(':')[1] || '', pillars: ['Strategy', 'Execution', 'Scale', 'Governance', 'Optimization'], blocks: [] };
    }

    // TASK 2: 3D Technical Icon Generation (Imagen 3.0 via Gemini 2.5 Flash Image)
    let infographicUrl = '';
    try {
      const geminiImageUrl = `https://us-central1-aiplatform.googleapis.com/v1/projects/${projectId}/locations/us-central1/publishers/google/models/gemini-2.5-flash-image:generateContent`;

      const imagePrompt = `
      A horizontal strip of 4 premium 3D technical icons for an enterprise infographic.
      ICONS TO DRAW: ${parsedData.pillars.join(', ')}.
      STYLE: High-contrast white 3D Glassmorphism, ray-traced lighting, holographic effects.
      LAYOUT: Draw 4 circular glass nodes in a single, perfectly straight horizontal row.
      BACKGROUND: Solid deep purple background (#1A0B2E). 
      STRICT CONSTRAINTS:
      - BLANK TEXT RULE: You are FORBIDDEN from drawing any letters, numbers, or words.
      - FOCUS RULE: Draw ONLY the icons. No other design elements on the canvas.
      `;

      const response = await client.request({
        url: geminiImageUrl,
        method: 'POST',
        data: {
          contents: [{ role: 'user', parts: [{ text: imagePrompt }] }],
          generationConfig: { responseModalities: ['IMAGE'], imageConfig: { aspect_ratio: "4:3" } }
        }
      });

      const data = response.data as any;
      const candidates = data?.candidates || [];
      const parts = candidates[0]?.content?.parts || [];
      const imagePart = parts.find((p: any) => p.inlineData?.mimeType?.startsWith('image/'));

      if (imagePart?.inlineData?.data) {
        // --- PHASE 4: PROGRAMMATIC OG TEXT OVERLAY ---
        const rawBuffer = Buffer.from(imagePart.inlineData.data, 'base64');
        const imageMetadata = await sharp(rawBuffer).metadata();
        const imgWidth = imageMetadata.width || 1024;
        const imgHeight = imageMetadata.height || 768;

        // Slicer: Extract the center "Safe Zone" (80%) of the image.
        // This evenly shaves 10% off the top and 10% off the bottom to delete ghost text 
        // without risking cutting the circular icons in half.
        const croppedBuffer = await sharp(rawBuffer)
          .extract({ 
            left: 0, 
            top: Math.round(imgHeight * 0.10), 
            width: imgWidth, 
            height: Math.round(imgHeight * 0.80) 
          })
          .png()
          .toBuffer();

        const stripBase64 = croppedBuffer.toString('base64');
        const origin = process.env.NEXT_PUBLIC_APP_URL || new URL(req.url).origin;
        
        // Pass Logo directly as base64 to avoid GCS delays/failures
        const logoBase64 = ASSETS.logo; 


        const fontBold = FONTS.bold;
        const fontReg = FONTS.regular;

        const ogOverlayUrl = new URL(`${origin}/api/infographic-overlay`);

        const overlayRes = await fetch(ogOverlayUrl.toString(), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            iconStripBase64: stripBase64,
            logoBase64: logoBase64,
            data: parsedData,
            fontBold,
            fontReg
          })
        });

        if (!overlayRes.ok) {
           console.error("Overlay Failed:", await overlayRes.text());
           throw new Error("Overlay route failed to composite text.");
        }

        let buffer = Buffer.from(await overlayRes.arrayBuffer());
        // --- END PROGRAMMATIC OVERLAY ---

        // LOGO COMPOSITE: Stamp 10xDS logo at bottom-right via Sharp (100% reliable)
        try {
          if (ASSETS.logo) {
            const logoBuffer = Buffer.from(ASSETS.logo, 'base64');
            const logoResized = await sharp(logoBuffer).resize({ height: 36 }).png().toBuffer();
            const logoMeta = await sharp(logoResized).metadata();
            const logoW = logoMeta.width || 120;
            buffer = await sharp(buffer)
              .composite([{ input: logoResized, left: 800 - 60 - logoW, top: 1060 - 30 - 36 }])
              .png()
              .toBuffer() as Buffer<ArrayBuffer>;
          }
        } catch (logoErr) {
          console.warn("Logo composite skipped:", logoErr);
        }

        const slug = prompt.toLowerCase().split(' ').join('-').replace(/[^\w-]/g, '');
        const fileName = `${slug}-infographic-${Date.now()}.png`;

        console.log("Uploading Infographic to GCS...");
        infographicUrl = await uploadToGCS(buffer, fileName, 'image/png');
        console.log("GCS Upload Success:", infographicUrl);
      } else {
        throw new Error("Invalid response from Gemini Flash Image");
      }
    } catch (vertexError: any) {
      console.error("DETAILED ARTIST ERROR:", vertexError);
      infographicUrl = `/10xds-placeholder.png`;
    }

    return NextResponse.json({ imageUrl: infographicUrl });


  } catch (error: any) {
    console.error("Infographic API Error:", error);
    return NextResponse.json({
      error: "Failed to generate infographic",
      details: error.message || String(error)
    }, { status: 500 });
  }
}
