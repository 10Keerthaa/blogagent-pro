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
    try {
      const url = `https://us-central1-aiplatform.googleapis.com/v1/projects/${projectId}/locations/us-central1/publishers/google/models/gemini-2.5-pro:streamGenerateContent`;

      const aiPrompt = N && N >= 5 
        ? `Analyze this blog post and extract EXACTLY ${N} milestones for an 'Isometric Roadmap' infographic.
           Output ONLY a JSON object with: 
           "mode": "ROADMAP",
           "count": ${N},
           "milestones": string[] (Array of exactly ${N} short technical headers)
           Blog: ${content.substring(0, 3500)}`
        : `Analyze this blog post and structure it for a 'Master Technical Dashboard'.
           STRICT CONSTRAINTS:
           - Max 4 Quadrants.
           - Max 3 bullet points per section.
           - Max 40 characters per bullet point.
           - Terminology: Use high-impact, single-word or short-phrase terminology (e.g., 'Scalability' instead of 'Ability to scale').
           
           Output ONLY a JSON object with: 
           "mode": "DASHBOARD",
           "central_theme": string,
           "quadrants": [{"title": string, "points": string[]}],
           "milestones": string[],
           "challenges": string[],
           "future": string[]
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
        rawText = data.map(chunk => (chunk.candidates && chunk.candidates[0] && chunk.candidates[0].content.parts[0].text) || '').join('');
      } else if (data.candidates) {
        rawText = data.candidates[0].content.parts[0].text;
      }

      try {
        const jsonMatch = rawText.match(/\{[\s\S]*\}/);
        let parsed = JSON.parse(jsonMatch ? jsonMatch[0] : rawText);
        
        // --- TASK 1.5: ELITE SPELLING SANITY CHECK & CONDENSATION ---
        try {
          const sanityUrl = `https://us-central1-aiplatform.googleapis.com/v1/projects/${projectId}/locations/us-central1/publishers/google/models/gemini-2.5-pro:streamGenerateContent`;
          const sanityPrompt = `Review this Infographic JSON for absolute technical accuracy, perfect spelling, and Elite Minimalist style.
          STRICT RULES:
          1. PROOFREAD EVERYTHING: Correct spelling of all technical headers and EVERY single bullet point word.
          2. BRANDING: Ensure terms like 'Document AI', 'OCR', 'No-Code Orchestration', and 'Hyperautomation' are correctly cased.
          3. HARD CONDENSATION: If any bullet point exceeds 40 characters, surgically condense it into a high-impact phrase. 
          4. NO HALLUCINATIONS: Do not add any text not present in the original data or related to the blog content.
          5. EXCLUDE SYSTEM TERMS: Never use words like 'MODE', 'DASHBOARD', 'MASTER', or 'QUADRANT' in the output JSON values.
          
          JSON: ${JSON.stringify(parsed)}`;

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
            parsed = JSON.parse(sJsonMatch[0]);
          }
        } catch (sanityError) {
          console.error("Spelling Sanity Check Failed (using original):", sanityError);
        }
        // --- END SANITY CHECK ---

        if (parsed.mode === 'ROADMAP') {
          const milestones = (parsed.milestones || []).join(' > ');
          visualPrompt = `MODE: ROADMAP | COUNT: ${parsed.count} | MILESTONES: ${milestones}`;
        } else {
          const central = parsed.central_theme || prompt;
          const quadrants = (parsed.quadrants || []).slice(0, 4).map((q: any) => `${q.title}: ${q.points.join(', ')}`).join(' | ');
          const milestones = (parsed.milestones || []).join(' > ');
          visualPrompt = `MODE: DASHBOARD | CENTRAL: ${central} | QUADRANTS: ${quadrants} | MILESTONES: ${milestones} | CHALLENGES: ${(parsed.challenges || []).join(', ')}`;
        }
      } catch (e) {
        visualPrompt = `MODE: DASHBOARD | CENTRAL: ${prompt}. Fallback.`;
      }
    } catch (designerError: any) {
      console.error("Vertex AI Designer Error:", designerError);
      visualPrompt = `MODE: DASHBOARD | CENTRAL: ${prompt}. Elite Gradient.`;
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
                    const modeMatch = visualPrompt.match(/MODE: (.*?) \|/);
                    const mode = modeMatch ? modeMatch[1] : 'DASHBOARD';

                    if (mode === 'ROADMAP') {
                        const countMatch = visualPrompt.match(/COUNT: (.*?) \|/);
                        const stepsMatch = visualPrompt.match(/MILESTONES: (.*)/);
                        const N = countMatch ? countMatch[1] : '8';
                        const steps = stepsMatch ? stepsMatch[1] : 'Phase 1 > Phase 2';

                        return `ISOMETRIC 3D TECHNICAL ROADMAP. 
Layout: An elegant S-Curve winding pathway through a digital space.
Containers: Render exactly ${N} distinct technical pods or glass bubbles along the path.
Content: Each pod must contain a unique technical label from these steps: ${steps}.

STRICT ELITE MINIMALIST CONSTRAINTS:
- PROMPT EXCLUSION: NEVER write the words "MODE", "ROADMAP", or "CONTAINER" in the image.
- LOGO BUFFER: Maintain a 150px EMPTY TRANSPARENT SPACE in the bottom-right corner. NO text or icons in that zone.
- VISUAL HIERARCHY: Bold, oversized Headers/Labels. Very small, refined secondary detail text.
- PERFECT SPELLING: Ensure technical vocabulary is flawless.

STYLE: High-fidelity 3D vector. 
PALETTE: Dark Navy background with vibrant neon-pastel nodes.
Portrait 4:5 (800x1000).`;
                    } else {
                        return `MASTER TECHNICAL DASHBOARD. 
Layout: Central hexagonal thematic core connected to four peripheral quadrants.
Data Highlights: ${visualPrompt.substring(0, 1000)}.

STRICT ELITE MINIMALIST CONSTRAINTS:
- PROMPT EXCLUSION: NEVER write the words "MODE", "DASHBOARD", "MASTER", or "QUADRANT" in the image.
- LOGO BUFFER: Maintain a 150px EMPTY TRANSPARENT SPACE in the bottom-right corner. NO text or icons in that zone.
- VISUAL HIERARCHY: Dominate with large Titles. Use significantly smaller, clean font for bullet points.
- PERFECT SPELLING: Core headers and all bullet points must be spelled perfectly. 

VIBRANT FULL-SPECTRUM VISUALS:
1. Quadrant Modules: Use vibrant colors (Sage, Rose, Cerulean, Amber).
2. Bottom Ribbon: Sequential milestone chevron steps.
3. Sidebar Icons: Challenges and Trend summaries.

STYLE: Flat 2.5D Vector Illustration. 
PALETTE: Dark Navy background ({r: 10, g: 25, b: 47}). 
Portrait 4:5 (800x1000).`;
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

        // --- POST-PROCESSING: Resize to 800x1000 and composite 10xDS logo ---
        const logoPath = path.join(process.cwd(), 'public', '10xDS.png');
        const logoBuffer = fs.readFileSync(logoPath);

        const TARGET_LOGO_HEIGHT = 75;
        const resizedLogo = await sharp(logoBuffer)
          .resize({ height: TARGET_LOGO_HEIGHT })
          .toBuffer();
        const logoMeta = await sharp(resizedLogo).metadata();
        const logoW = logoMeta.width || 130;

        const MARGIN = 60; // Elite Calibration Margin
        // --- ELITE DASHBOARD CALIBRATION: 800x1000 Portrait ---
        const buffer = await sharp(rawBuffer)
          .resize(800, 1000, {
            fit: 'contain', 
            background: { r: 10, g: 25, b: 47, alpha: 1 }, // Elite Dark Navy background fill
            kernel: 'cubic'
          })
          .composite([
            {
              input: resizedLogo,
              left: 800 - logoW - MARGIN,
              top: 1000 - TARGET_LOGO_HEIGHT - MARGIN,
            }
          ])
          .png()
          .toBuffer();
        // --- END POST-PROCESSING ---

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
