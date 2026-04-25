import { NextResponse } from "next/server";
import { uploadToGCS } from '@/lib/gcs';
import { getGoogleAuth } from '@/lib/googleAuth';
import sharp from 'sharp';
import { FONTS } from '@/lib/constants';

export const maxDuration = 300; 

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const prompt = body.prompt || body.title;
    const content = body.content;

    if (!prompt || !content) {
      return NextResponse.json({ error: "Prompt and Content are required" }, { status: 400 });
    }

    // AUTHENTICATION: Authenticate with Vertex AI
    const auth = await getGoogleAuth(['https://www.googleapis.com/auth/cloud-platform']);
    const client = await auth.getClient();
    const projectId = await auth.getProjectId();

    // --- PHASE 1: SEMANTIC ANALYSIS (GEMINI 2.5 PRO) ---
    // Extracting the "Master Technical Grid" structure based on content
    const analysisUrl = `https://us-central1-aiplatform.googleapis.com/v1/projects/${projectId}/locations/us-central1/publishers/google/models/gemini-2.5-pro:streamGenerateContent`;
    
    const analysisPrompt = `
      Analyze this blog post and act as an Elite Visual Designer for a high-end technical infographic.
      Topic: ${prompt}
      Blog: ${content.substring(0, 4000)}

      STRICT OUTPUT: ONLY a JSON object with this structure:
      {
        "title": "GOLDEN YELLOW MAIN TITLE (MAX 40 CHARS)",
        "subtitle": "White Sub-headline explaining efficiency/safety",
        "pillars": ["6 technical icons labels, max 15 chars each"],
        "blocks": [
          { "title": "Category Title", "items": ["Key Point 1", "Key Point 2"] }
        ],
        "footer_summary": "Pithy conclusion phrase"
      }
      RULES:
      1. Pillars must be exactly 6.
      2. Blocks must be exactly 4-5.
      3. Items per block must be exactly 2-3.
      4. Use extremely formal enterprise terminology.
      5. SPELLING MUST BE PERFECT.
      6. DATA SOURCE RULE: Only analyze the core technical body of the post. IGNORE the Conclusion and FAQ sections entirely as they are repetitive summary information. Focus only on the unique technical insights.
    `;

    const analysisResp = await client.request({
      url: analysisUrl,
      method: 'POST',
      data: {
        contents: [{ role: "user", parts: [{ text: analysisPrompt }] }],
        generationConfig: { temperature: 0.1, topP: 0.95 }
      }
    });

    const analysisData = analysisResp.data as any;
    let rawText = '';
    if (Array.isArray(analysisData)) {
      rawText = analysisData.map(chunk => chunk.candidates?.[0]?.content?.parts?.[0]?.text || '').join('');
    } else {
      rawText = analysisData.candidates?.[0]?.content?.parts?.[0]?.text || '';
    }

    const jsonMatch = rawText.match(/\{[\s\S]*\}/);
    const parsedData = JSON.parse(jsonMatch ? jsonMatch[0] : rawText);

    // --- PHASE 2: VISUAL GENERATION (GEMINI 2.5 FLASH IMAGE) ---
    // Generating the "Clean Base" background
    const imageUrl = `https://us-central1-aiplatform.googleapis.com/v1/projects/${projectId}/locations/us-central1/publishers/google/models/gemini-2.5-flash-image:generateContent`;
    
    const visualPrompt = `
      ULTRA-HIGH RESOLUTION MONOCHROMATIC PURPLE TECHNICAL INFOGRAPHIC BACKGROUND.
      THEME: 100% Flat, Solid Deep Electric Purple Canvas (#1A0B2E).
      STRICT BACKGROUND RULE: DISABLE ALL 3D LIGHTING, SHADOWS, AND GRADIENTS ON THE BACKGROUND CANVAS. 
      The entire background MUST be one consistent, solid color from edge to edge.
      LAYOUT: A clean horizontal row of icons in the upper third.
      ELEMENTS:
      - 6 circular Glassmorphism nodes arranged in a perfect horizontal row (Center Y-coordinate: 260px).
      - INSIDE NODES: Draw 6 distinct, high-contrast white 3D technical icons based on: ${parsedData.pillars.join(', ')}.
      - CONTENT AREA: Leave the middle and bottom sections mostly empty for the text overlay.
      STRICT CONSTRAINTS:
      - BLANK TEXT RULE: You are FORBIDDEN from drawing any letters, numbers, or words.
      - FLATNESS RULE: The background must be as flat as a digital wallpaper, no depth on the canvas itself.
      - STYLE: Premium 3D Glassmorphism for ICONS ONLY. 8k cinematic rendering.
    `;

    const imageResp = await client.request({
      url: imageUrl,
      method: 'POST',
      data: {
        contents: [{ role: 'user', parts: [{ text: visualPrompt }] }],
        generationConfig: {
          responseModalities: ['TEXT', 'IMAGE'],
          imageConfig: { aspect_ratio: "4:5" }
        }
      }
    });

    const imgCandidates = (imageResp.data as any)?.candidates || [];
    const imgPart = imgCandidates[0]?.content?.parts?.find((p: any) => p.inlineData?.mimeType?.startsWith('image/'));

    if (!imgPart?.inlineData?.data) {
      throw new Error("Failed to generate image base");
    }

    const base64Image = imgPart.inlineData.data;
    const baseBuffer = Buffer.from(base64Image, 'base64');

    // --- NEW: PIXEL-PERFECT RESIZING ---
    // Force the AI image to be exactly 800x1000 to ensure icon-to-box alignment
    const resizedBuffer = await sharp(baseBuffer)
      .resize(800, 1000, { fit: 'fill' })
      .toBuffer();
    
    const resizedBase64 = resizedBuffer.toString('base64');

    // --- PHASE 3: COMPOSITE ENGINE (SHARP) ---
    // Overlaying the "Pro-Approved" text with 100% spelling accuracy
    
    const origin = process.env.NEXT_PUBLIC_APP_URL || new URL(req.url).origin;
    const overlayUrl = new URL(`${origin}/api/framer/infographic-overlay`);

    // Fetch the 10xDS logo for branding
    let logoBase64 = '';
    try {
      const fs = require('fs');
      const path = require('path');
      const logoPath = path.join(process.cwd(), 'public', '10xDS.png');
      logoBase64 = fs.readFileSync(logoPath, { encoding: 'base64' });
    } catch (err) {
      console.error("Failed to load logo for infographic:", err);
    }

    const compositeResp = await fetch(overlayUrl.toString(), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        bgImageBase64: resizedBase64,
        logoBase64: logoBase64,
        data: parsedData,
        fontBold: FONTS.bold,
        fontReg: FONTS.regular
      })
    });

    if (!compositeResp.ok) {
      throw new Error("Composite engine failed: " + await compositeResp.text());
    }

    const finalBuffer = Buffer.from(await compositeResp.arrayBuffer());
    
    // UPLOAD TO GCS
    const slug = prompt.toLowerCase().split(' ').join('-').replace(/[^\w-]/g, '');
    const fileName = `framer-infographic-${slug}-${Date.now()}.png`;
    const gcsUrl = await uploadToGCS(finalBuffer, fileName, 'image/png');

    return NextResponse.json({ imageUrl: gcsUrl });

  } catch (error: any) {
    console.error("Framer Infographic Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
