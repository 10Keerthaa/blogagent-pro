import { NextResponse } from "next/server";
import { uploadToGCS } from '@/lib/gcs';
import { getGoogleAuth } from '@/lib/googleAuth';
import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
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
        "title": "EXACT MAIN TITLE (The part before the colon from the blog title)",
        "subtitle": "EXACT SUBTITLE (The part after the colon from the blog title)",
        "pillars": ["5 technical icons labels, max 15 chars each"],
        "blocks": [
          { "title": "Category Title", "items": ["Key Point 1", "Key Point 2"] }
        ],
        "footer_summary": "A concise exactly 2-sentence executive summary explaining the strategic business impact. (Maximum 25 words)."
      }
      RULES:
      1. TITLE SYNC: The 'title' and 'subtitle' MUST match the blog title provided in the topic (${prompt}). If the topic has a colon, split it into title and subtitle. If no colon, use the topic as title and create a professional executive subtitle.
      2. Blocks must be exactly 4-5.
      3. Items per block must be exactly 3.
      4. Use extremely formal enterprise terminology.
      5. ZERO TEXT ICON RULE: DO NOT draw any text, letters, or words INSIDE or BELOW the glass icons.
      6. SPELLING MUST BE PERFECT.
      7. DATA SOURCE RULE: Only analyze the core technical body of the post. IGNORE the Conclusion and FAQ sections entirely as they are repetitive summary information. Focus only on the unique technical insights.
      7. PILLAR COUNT: You MUST provide exactly 5 pillars.
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

    // --- PHASE 2: VISUAL GENERATION (ICONS ONLY) ---
    const imageUrl = `https://us-central1-aiplatform.googleapis.com/v1/projects/${projectId}/locations/us-central1/publishers/google/models/gemini-2.5-flash-image:generateContent`;
    
    const visualPrompt = `
      A high-fidelity horizontal strip of 5 minimalist 3D glass icons for an enterprise technology blog. 
      Topic: ${prompt}
      ICONS TO DRAW: ${parsedData.pillars.join(', ')}.
      Style: Translucent frosted glass, iridescent highlights, dark purple background, isometric 3D.
      STRICT RULE: THE ICONS MUST BE PURELY GRAPHICAL SYMBOLS. DO NOT DRAW ANY TEXT, LETTERS, ALPHABETS, OR LABELS **INSIDE**, ON, OR BELOW THE ICONS. ZERO TEXT TOLERANCE.
      LAYOUT: Draw 5 circular glass nodes in a single, perfectly straight horizontal row.
      BACKGROUND: Solid deep purple background (#1A0B2E). 
    `;

    const imageResp = await client.request({
      url: imageUrl,
      method: 'POST',
      data: {
        contents: [{ role: 'user', parts: [{ text: visualPrompt }] }],
        generationConfig: {
          responseModalities: ['IMAGE']
        }
      }
    });

    const imgCandidates = (imageResp.data as any)?.candidates || [];
    const imgPart = imgCandidates[0]?.content?.parts?.find((p: any) => p.inlineData?.mimeType?.startsWith('image/'));

    if (!imgPart?.inlineData?.data) {
      throw new Error("Failed to generate icons");
    }

    const iconStripBuffer = Buffer.from(imgPart.inlineData.data, 'base64');
    
    // --- SAFE ZONE EXTRACTION (80% Center Crop) ---
    // This removes AI-generated text from the bottom while keeping icons intact
    const processedIcons = await sharp(iconStripBuffer)
      .metadata()
      .then(async (metadata) => {
        if (!metadata.height || !metadata.width) return iconStripBuffer;
        return sharp(iconStripBuffer)
          .extract({ 
            left: 0, 
            top: Math.round(metadata.height * 0.1), 
            width: metadata.width, 
            height: Math.round(metadata.height * 0.76) // Calibrated crop: 10% top removal, 14% bottom removal
          })
          .toBuffer();
      });

    const iconStripBase64 = processedIcons.toString('base64');

    // --- PHASE 3: COMPOSITE ENGINE ---
    const origin = process.env.NEXT_PUBLIC_APP_URL || new URL(req.url).origin;
    const overlayUrl = new URL(`${origin}/api/framer/infographic-overlay`);

    // Use Base64 for logo to ensure rendering in Edge Runtime
    const logoPath = path.join(process.cwd(), 'public', '10xDS.png');
    let logoBase64 = '';
    try {
        logoBase64 = fs.readFileSync(logoPath).toString('base64');
    } catch (e) {
        console.warn("Logo read failed:", e);
    }
    const logoUrl = logoBase64 ? `data:image/png;base64,${logoBase64}` : `${origin}/10xDS.png`;

    const compositeResp = await fetch(overlayUrl.toString(), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        iconStripBase64: iconStripBase64,
        logoUrl: logoUrl,
        data: parsedData,
        fontBold: FONTS.bold,
        fontReg: FONTS.regular
      })
    });

    if (!compositeResp.ok) {
      throw new Error("Composite engine failed: " + await compositeResp.text());
    }

    let finalBuffer = Buffer.from(await compositeResp.arrayBuffer());

    // LOGO COMPOSITE: Stamp 10xDS logo at bottom-right via Sharp (100% reliable vs Satori CSS)
    try {
      if (ASSETS.logo) {
        const logoBuffer = Buffer.from(ASSETS.logo, 'base64');
        const logoResized = await sharp(logoBuffer).resize({ height: 36 }).png().toBuffer();
        const logoMeta = await sharp(logoResized).metadata();
        const logoW = logoMeta.width || 120;
        finalBuffer = await sharp(finalBuffer)
          .composite([{ input: logoResized, left: 800 - 60 - logoW, top: 1200 - 30 - 36 }])
          .png()
          .toBuffer() as Buffer<ArrayBuffer>;
      }
    } catch (logoErr) {
      console.warn("Logo composite skipped:", logoErr);
    }

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
