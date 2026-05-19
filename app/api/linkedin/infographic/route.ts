import { NextResponse } from "next/server";
import { uploadToGCS } from '@/lib/gcs';
import { getGoogleAuth } from '@/lib/googleAuth';
import sharp from 'sharp';
import { ASSETS, FONTS } from '@/lib/constants';

export const maxDuration = 300; 

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const prompt = body.prompt || body.title;
    const content = body.content;

    if (!prompt || !content) {
      return NextResponse.json({ error: "Prompt and Content are required" }, { status: 400 });
    }

    // 1. Authenticate with Vertex AI
    const auth = await getGoogleAuth(['https://www.googleapis.com/auth/cloud-platform']);
    const client = await auth.getClient();
    const projectId = await auth.getProjectId();

    // 2. Task 1: Analysis Pass via Vertex AI Gemini 2.5 Pro
    let parsedData: any = {};
    try {
      const url = `https://us-central1-aiplatform.googleapis.com/v1/projects/${projectId}/locations/us-central1/publishers/google/models/gemini-2.5-pro:streamGenerateContent`;

      const aiPrompt = `
      Analyze this LinkedIn post and act as an Elite Visual Designer for a high-end B2B technical infographic.
      
      Topic: ${prompt}
      Blog: ${content.substring(0, 4000)}

      Determine the structure of the infographic strictly based on the presence of numbers in the Topic title "${prompt}":
      - RULE 1 (NO NUMBERS / STACKED): If the Topic title does not contain any numbers (e.g. no digits like 5, 8, and no written number words like "five", "eight", "six"), you MUST classify the layoutType as "standard" and set nodeCount to 4. Do NOT choose "timeline" or "grid" under any circumstances if there are no numbers in the Topic title.
      - RULE 2 (5 TO 7 / TIMELINE): If the Topic title contains a number from 5 to 7 (e.g. "5", "6", "7", "five", "six", "seven"), you MUST classify the layoutType as "timeline" and set nodeCount to that exact number (e.g., 5, 6, or 7).
      - RULE 3 (8 OR MORE / GRID): If the Topic title contains a number of 8 or more (e.g. "8", "10", "eight", "ten"), you MUST classify the layoutType as "grid" and set nodeCount to 8 (consolidating the content into the top 8 most high-impact pillars).

      Output ONLY a JSON object with:
      {
        "layoutType": "timeline" | "grid" | "standard",
        "nodeCount": 4 | 5 | 6 | 7 | 8,
        "title": "EXACT MAIN TITLE (The part before the colon from the blog title)",
        "subtitle": "EXACT SUBTITLE (The part after the colon from the blog title)",
        "pillars": ["Short technical pillar/step names (exactly matching nodeCount, 1-2 words each)"],
        "executiveSummary": "A concise, 1-sentence conclusion about the strategic value of the topic (max 25 words).",
        "blocks": [
          {
            "title": "Step/Pillar Name",
            "items": ["Exactly 2 high-authority technical bullet points"]
          }
        ] (Provide exactly nodeCount blocks)
      }

      DATA SOURCE RULE: Focus only on the unique technical insights found in this specific blog post.
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
      console.error("[LinkedIn Infographic] Analysis Phase Error:", designerError);
      parsedData = { 
        layoutType: 'standard',
        nodeCount: 4,
        title: prompt.split(':')[0], 
        subtitle: prompt.split(':')[1] || '', 
        pillars: ['Strategy', 'Execution', 'Scale', 'Governance'], 
        executiveSummary: "Driving strategic value through autonomous integration and enterprise-grade operational excellence.",
        blocks: [] 
      };
    }

    // 3. Task 2: 3D Technical Icon Generation (Imagen 3.0 via Gemini 2.5 Flash Image)
    let infographicUrl = '';
    try {
      const geminiImageUrl = `https://us-central1-aiplatform.googleapis.com/v1/projects/${projectId}/locations/us-central1/publishers/google/models/gemini-2.5-flash-image:generateContent`;

      const imagePrompt = `
      A horizontal strip of 5 premium 3D abstract geometric crystal structures for an enterprise technology blog. 
      STYLE: High-contrast gold and white 3D Glassmorphism, ray-traced lighting, holographic effects.
      ICONS: Draw 5 distinct, purely abstract 3D geometric shapes (e.g. faceted crystals, floating light-nodes, or prismatic shields) representing the energy of: ${parsedData.pillars.join(', ')}.
      LAYOUT: Draw 5 circular glass nodes in a single, perfectly straight horizontal row in the UPPER HALF of the canvas. 
      BACKGROUND: Solid deep purple background (#1A0B2E). 
      STRICT NO-TEXT RULE: DO NOT DRAW ANY LETTERS, WORDS, ALPHABETS, OR LABELS. NO LOGOS, NO CAPTIONS, NO TYPOGRAPHY. ZERO TEXT TOLERANCE.
      FOCUS: Draw ONLY abstract shapes. The image must be 100% free of any human-readable text or characters.
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
        const rawBuffer = Buffer.from(imagePart.inlineData.data, 'base64');
        const imageMetadata = await sharp(rawBuffer).metadata();
        const imgWidth = imageMetadata.width || 1024;
        const imgHeight = imageMetadata.height || 768;

        // Clean crop to eliminate raw edge pixels/noise
        const croppedBuffer = await sharp(rawBuffer)
          .extract({ 
            left: 0, 
            top: Math.round(imgHeight * 0.05), 
            width: imgWidth, 
            height: Math.round(imgHeight * 0.70)
          })
          .png()
          .toBuffer();

        const stripBase64 = croppedBuffer.toString('base64');
        const origin = process.env.NEXT_PUBLIC_APP_URL || new URL(req.url).origin;
        
        const logoBase64 = ASSETS.logo; 
        const fontBold = FONTS.bold;
        const fontReg = FONTS.regular;

        const ogOverlayUrl = new URL(`${origin}/api/linkedin/infographic-overlay`);

        // 4. Task 3: Render Custom HTML/CSS Layout to Image Response
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
           console.error("[LinkedIn Infographic] Overlay Failed:", await overlayRes.text());
           throw new Error("Overlay route failed to composite text.");
        }

        let buffer = Buffer.from(await overlayRes.arrayBuffer());

        // 5. Stamping 10xDS logo dynamically at bottom-center via Sharp (Width: 800px, stamp centered)
        try {
          if (ASSETS.logo) {
            const logoBuffer = Buffer.from(ASSETS.logo, 'base64');
            const logoResized = await sharp(logoBuffer).resize({ height: 32 }).png().toBuffer();
            const logoMeta = await sharp(logoResized).metadata();
            const logoW = logoMeta.width || 120;
            buffer = await sharp(buffer)
              .composite([{ input: logoResized, left: Math.round((800 - logoW) / 2), top: 935 }])
              .png()
              .toBuffer() as Buffer<ArrayBuffer>;
          }
        } catch (logoErr) {
          console.warn("[LinkedIn Infographic] Logo composite skipped:", logoErr);
        }

        const slug = prompt.toLowerCase().split(' ').join('-').replace(/[^\w-]/g, '');
        const fileName = `${slug}-linkedin-infographic-${Date.now()}.png`;

        console.log("[LinkedIn Infographic] Uploading to GCS...");
        infographicUrl = await uploadToGCS(buffer, fileName, 'image/png');
        console.log("[LinkedIn Infographic] GCS Upload Success:", infographicUrl);
      } else {
        throw new Error("Invalid response from Gemini Flash Image");
      }
    } catch (vertexError: any) {
      console.error("[LinkedIn Infographic] GENERATION ERROR:", vertexError);
      infographicUrl = `/10xds-placeholder.png`;
    }

    return NextResponse.json({ imageUrl: infographicUrl });

  } catch (error: any) {
    console.error("[LinkedIn Infographic] Infographic API Error:", error);
    return NextResponse.json({
      error: "Failed to generate infographic",
      details: error.message || String(error)
    }, { status: 500 });
  }
}
