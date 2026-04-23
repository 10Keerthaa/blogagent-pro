import { NextResponse } from "next/server";
import { uploadToGCS } from '@/lib/gcs';
import { getGoogleAuth } from '@/lib/googleAuth';
import sharp from 'sharp';
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
    let visualPrompt = '';
    let parsedData: any = {};
    try {
      const url = `https://us-central1-aiplatform.googleapis.com/v1/projects/${projectId}/locations/us-central1/publishers/google/models/gemini-2.5-pro:streamGenerateContent`;

      const aiPrompt = N && N >= 5
        ? `Analyze this blog post and act as an Elite Visual Art Director to design an 'Isometric Roadmap' infographic.
           STRICT RULE: You may use full formal business phrases for milestones (e.g., "Implement Data Ingestion Protocols").
           Output ONLY a JSON object with: 
           "mode": "ROADMAP",
           "count": ${N},
           "milestones": string[] (Array of exactly ${N} formal technical phrases)
           Blog: ${content.substring(0, 3500)}`
        : `Analyze this blog post and act as an Elite Visual Art Director to design a 'Master Technical Dashboard'.
           STRICT CONSTRAINTS:
           - EXACTLY 4 Quadrants. You must NOT output more or less than 4 quadrants.
           - STRICTLY FORBIDDEN: Do not add a 5th node or bottom section.
           - Max 3 bullet points per quadrant.
           - PUNCHY PROFESSIONAL TONE: Use formal enterprise terminology, but keep it concise. Bullet points MUST be between 3 and 7 words MAXIMUM (e.g., 'Optimize resources with automated workload balancing'). NO long essays.
           
           Output ONLY a JSON object with: 
           "mode": "DASHBOARD",
           "central_theme": string,
           "quadrants": [{"title": string, "points": string[]}]
           Blog: ${content.substring(0, 3500)}`;

      const resp = await client.request({
        url,
        method: 'POST',
        data: {
          contents: [{ role: "user", parts: [{ text: aiPrompt }] }],
          generationConfig: { temperature: 0.2, topP: 0.9, topK: 40 }
        }
      });

      const data = resp.data as any;
      let rawText = '';
      if (Array.isArray(data)) {
        rawText = data.map((chunk: any) => (chunk.candidates && chunk.candidates[0] && chunk.candidates[0].content.parts[0].text) || '').join('');
      } else if (data.candidates) {
        rawText = data.candidates[0].content.parts[0].text;
      }

      try {
        const jsonMatch = rawText.match(/\{[\s\S]*\}/);
        parsedData = JSON.parse(jsonMatch ? jsonMatch[0] : rawText);

        // --- TASK 1.5: ELITE SPELLING SANITY CHECK & CONDENSATION ---
        try {
          const sanityUrl = `https://us-central1-aiplatform.googleapis.com/v1/projects/${projectId}/locations/us-central1/publishers/google/models/gemini-2.5-pro:streamGenerateContent`;
          const sanityPrompt = `Review this Infographic JSON for absolute technical accuracy, perfect spelling, and Elite Professional style.
          STRICT RULES:
          1. PROOFREAD EVERYTHING: Ensure impeccable grammar and spelling.
          2. BRANDING: Ensure terms like 'Document AI', 'OCR', 'No-Code Orchestration', and 'Hyperautomation' are correctly cased.
          3. PUNCHY FORMALITY: Use Formal Enterprise Business Terminology. However, you MUST strictly condense each bullet point to a maximum of 3 to 7 words. Do not allow massive paragraphs.
          4. NO HALLUCINATIONS: Do not add any text not present in the original data or related to the blog content.
          5. EXCLUDE SYSTEM TERMS: Never use words like 'MODE', 'DASHBOARD', 'MASTER', or 'QUADRANT' in the output JSON values.
          
          JSON: ${JSON.stringify(parsedData)}`;

          const sResp = await client.request({
            url: sanityUrl,
            method: 'POST',
            data: {
              contents: [{ role: "user", parts: [{ text: sanityPrompt }] }],
              generationConfig: { temperature: 0.1, topP: 0.95 }
            }
          });

          const sData = sResp.data as any;
          let sRawText = '';
          if (Array.isArray(sData)) {
            sRawText = sData.map(chunk => (chunk.candidates && chunk.candidates[0] && chunk.candidates[0].content.parts[0].text) || '').join('');
          } else if (sData.candidates) {
            sRawText = sData.candidates[0].content.parts[0].text;
          }
          const sJsonMatch = sRawText.match(/\{[\s\S]*\}/);
          if (sJsonMatch) {
            parsedData = JSON.parse(sJsonMatch[0]);
          }
        } catch (sanityError) {
          console.error("Spelling Sanity Check Failed (using original):", sanityError);
        }
        // --- END SANITY CHECK ---

        if (parsedData.mode === 'ROADMAP') {
          const milestones = (parsedData.milestones || []).join(', ');
          visualPrompt = `Roadmap with ${parsedData.count} steps: ${milestones}`;
        } else {
          const central = parsedData.central_theme || prompt;
          const quadrants = (parsedData.quadrants || []).slice(0, 4).map((q: any) => `${q.title}: ${q.points.join(', ')}`).join('. ');
          visualPrompt = `Central Core: ${central}. Quadrants: ${quadrants}`;
        }
      } catch (e) {
        visualPrompt = `Central Core: ${prompt}. Fallback.`;
      }
    } catch (designerError: any) {
      console.error("Vertex AI Designer Error:", designerError);
      visualPrompt = `Central Core: ${prompt}. Elite Gradient.`;
    }

    // TASK 2: Restored High-Fidelity Generation via Gemini 2.5 Flash Image
    let infographicUrl = '';
    try {
      const geminiImageUrl = `https://us-central1-aiplatform.googleapis.com/v1/projects/${projectId}/locations/us-central1/publishers/google/models/gemini-2.5-flash-image:generateContent`;

      // Clean visualPrompt of trailing semi-colons to prevent ghost nodes
      const cleanedPrompt = visualPrompt.replace(/[;,. ]+$/, '');

      const response = await client.request({
        url: geminiImageUrl,
        method: 'POST',
        data: {
          contents: [
            {
              role: 'user',
              parts: [
                {
                  text: (() => {
                    const isRoadmap = visualPrompt.startsWith('Roadmap with');

                    if (isRoadmap) {
                      const countMatch = visualPrompt.match(/Roadmap with (\d+) steps:/);
                      const N = countMatch ? countMatch[1] : '8';
                      const steps = visualPrompt.replace(/Roadmap with \d+ steps:/, '').trim();

                      return `ISOMETRIC 3D TECHNICAL ROADMAP. 
Layout: An elegant S-Curve winding pathway through a digital space.
Containers: Render exactly ${N} distinct technical pods or glass bubbles along the path. 

STRICT ELITE MINIMALIST CONSTRAINTS:
- ABSOLUTE BLANK CANVAS RULE: You are STRICTLY FORBIDDEN from drawing a single letter, word, or piece of text anywhere in the image. Do NOT attempt to write the step names. The 3D glass pods MUST be completely empty inside.
- CLEANLINESS: DO NOT draw any random lines, cursors, or weird UI artifacts.

STYLE: High-fidelity 3D vector. 
PALETTE RULES (STRICT - NO EXCEPTIONS):
- Background: Pure deep BLACK (#000000). No gradients on the base layer.
- Path/Spine: A glowing deep violet (#4B0082) or rich purple (#7B2FBE) ribbon winding as an S-curve.
- Pods/Bubbles: Use GLASS or FROSTED effect in WHITE (#FFFFFF) with a purple (#9D4EDD) glow border. Alternate between pure white glass and deep purple (#3A0CA3) solid pods for visual rhythm.
- Connecting Lines: Glowing purple-to-violet gradient (#7B2FBE to #C77DFF).
- Accent Glows: Soft purple light halos around each pod node.
Portrait 4:5 (800x1000).`;
                    } else {
                      return `An abstract 3D geometric glass sculpture floating in deep space, featuring a central glowing core connected to exactly 4 large, completely blank transparent glass panels (quadrants) arranged around it.
CRITICAL DESIGN RULE: The 4 glass panels MUST be completely blank and empty. Do not draw any UI elements, boxes, text, or labels inside them. In or near each blank pane, include a single glowing neon abstract icon in a DIFFERENT vibrant color (e.g., Cyan, Emerald Green, Magenta, Amber) representing these concepts: ${visualPrompt.substring(0, 1000)}.

STRICT ELITE CONSTRAINTS:
- ABSOLUTE BLANK CANVAS RULE: You are STRICTLY FORBIDDEN from drawing a single letter, word, number, or piece of text anywhere in the image. This is an abstract art piece, NOT an infographic. The central core AND the 4 glass panels MUST be 100% completely empty of any text, labels, or UI mockups.
- EXACTLY 4 PANELS: You must ONLY draw exactly 4 glass panes around the core. You are STRICTLY FORBIDDEN from adding a 5th pane at the bottom.
- CLEANLINESS: DO NOT draw any vertical lines, cursors, or weird UI artifacts.

ART STYLE: Premium 3D glassmorphism, transparent glossy panels floating in a completely empty, pure dark studio void. Glowing fiber-optic connections linking the core to the 4 empty panes. Ultra-high resolution, ray-traced lighting, photorealistic cinematic rendering. The background MUST be a solid, minimalist, dark elegant color with NO stars, NO galaxies, NO textures, and NO extra background elements.`;
                    }
                  })()
                }
              ]
            }
          ],
          generationConfig: {
            responseModalities: ['TEXT', 'IMAGE'],
            imageConfig: {
              aspect_ratio: "4:5"
            }
          }
        }
      });

      const data = response.data as any;
      const candidates = data?.candidates || [];
      const parts = candidates[0]?.content?.parts || [];
      const imagePart = parts.find((p: any) => p.inlineData?.mimeType?.startsWith('image/'));

      if (imagePart?.inlineData?.data) {
        const base64Data = imagePart.inlineData.data;
        const rawBuffer = Buffer.from(base64Data, 'base64');

        // --- PHASE 4: PROGRAMMATIC OG TEXT OVERLAY ---
        // Resize blank background to standard 800x1000
        const bgBuffer = await sharp(rawBuffer)
          .resize(800, 1000, { fit: 'cover' })
          .jpeg({ quality: 90 }) // JPEG for smaller payload to edge route
          .toBuffer();

        const bgBase64 = bgBuffer.toString('base64');
        
        // Prepare Logo
        const logoPath = path.join(process.cwd(), 'public', '10xDS.png');
        let logoBase64 = '';
        if (fs.existsSync(logoPath)) {
          const logoBuffer = fs.readFileSync(logoPath);
          const TARGET_LOGO_HEIGHT = 75;
          const logoProcessor = sharp(logoBuffer);
          const alphaMask = await logoProcessor.clone().greyscale().negate().linear(1.5, -40).toBuffer();
          const resizedLogo = await sharp(logoBuffer)
            .joinChannel(alphaMask)
            .resize({ height: TARGET_LOGO_HEIGHT })
            .png()
            .toBuffer();
          logoBase64 = resizedLogo.toString('base64');
        }

        // Prepare Font: Read bundled TTF from next/dist (guaranteed to exist, guaranteed to be valid TTF)
        let fontBoldBase64 = '';
        let fontRegBase64 = '';
        try {
          const ttfPath = path.join(process.cwd(), 'node_modules', 'next', 'dist', 'compiled', '@vercel', 'og', 'noto-sans-v27-latin-regular.ttf');
          if (fs.existsSync(ttfPath)) {
            const ttfBuf = fs.readFileSync(ttfPath);
            fontBoldBase64 = ttfBuf.toString('base64');
            fontRegBase64 = fontBoldBase64; // Use same file for both weights
          }
        } catch (fontErr) {
          console.warn('Font read failed, using Edge default:', fontErr);
        }

        const origin = process.env.NEXT_PUBLIC_APP_URL || new URL(req.url).origin;
        const ogOverlayUrl = new URL(`${origin}/api/infographic-overlay`);

        const overlayRes = await fetch(ogOverlayUrl.toString(), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            bgImageBase64: bgBase64,
            parsed: parsedData,
            mode: parsedData.mode || 'DASHBOARD',
            logoBase64: logoBase64,
            fontBoldBase64: fontBoldBase64,
            fontRegBase64: fontRegBase64
          })
        });

        if (!overlayRes.ok) {
           console.error("Overlay Failed:", await overlayRes.text());
           throw new Error("Overlay route failed to composite text.");
        }

        const buffer = Buffer.from(await overlayRes.arrayBuffer());
        // --- END PROGRAMMATIC OVERLAY ---

        const slug = prompt.toLowerCase().split(' ').join('-').replace(/[^\w-]/g, '');
        const fileName = `${slug}-infographic-${Date.now()}.png`;

        console.log("Uploading Infographic to GCS...");
        infographicUrl = await uploadToGCS(buffer, fileName, 'image/png');
        console.log("GCS Upload Success:", infographicUrl);
      } else {
        throw new Error("Invalid response from Gemini Flash Image");
      }
    } catch (vertexError: any) {
      // THE SMOKE SIGNAL: This will tell you EXACTLY why the image failed in your logs
      console.error("DETAILED ARTIST ERROR:", {
        message: vertexError?.message,
        status: vertexError?.response?.status,
        data: vertexError?.response?.data
      });

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
