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
           STRICT RULE: Milestones MUST be 1 or 2 words MAXIMUM (e.g., "Data Ingestion", "Model Training"). No full sentences.
           Output ONLY a JSON object with: 
           "mode": "ROADMAP",
           "count": ${N},
           "milestones": string[] (Array of exactly ${N} short technical headers)
           Blog: ${content.substring(0, 3500)}`
        : `Analyze this blog post and structure it for a 'Master Technical Dashboard'.
           STRICT CONSTRAINTS:
           - EXACTLY 4 Quadrants. You must NOT output more or less than 4 quadrants.
           - STRICTLY FORBIDDEN: Do not add a 5th node, bottom section, or any external challenges. You must ONLY output the 4 quadrants.
           - Max 3 bullet points per quadrant.
           - AGGRESSIVE CONDENSATION: Every bullet point MUST be 1 to 3 words maximum (e.g., 'Zero-Trust Pipeline', 'Automated Audits'). No sentences. No verbs.
           - Terminology: Use high-impact, single-word or short-phrase terminology.
           
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
        let parsed = JSON.parse(jsonMatch ? jsonMatch[0] : rawText);

        // --- TASK 1.5: ELITE SPELLING SANITY CHECK & CONDENSATION ---
        try {
          const sanityUrl = `https://us-central1-aiplatform.googleapis.com/v1/projects/${projectId}/locations/us-central1/publishers/google/models/gemini-2.5-pro:streamGenerateContent`;
          const sanityPrompt = `Review this Infographic JSON for absolute technical accuracy, perfect spelling, and Elite Minimalist style.
          STRICT RULES:
          1. PROOFREAD EVERYTHING: Correct spelling of all technical headers and EVERY single bullet point word.
          2. BRANDING: Ensure terms like 'Document AI', 'OCR', 'No-Code Orchestration', and 'Hyperautomation' are correctly cased.
          3. BRUTAL CONDENSATION & FORMALITY: To prevent Image AI typos, you MUST aggressively shrink every bullet point to 1 or 2 simple words MAXIMUM. You MUST use Formal Enterprise Business Terminology. Replace long, complex words with short, professional equivalents (e.g., replace "Vulnerabilities" with "Risk Data", replace "Standardized" with "Rules"). Maintain a highly professional tone. NO EXCEPTIONS.
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
          const milestones = (parsed.milestones || []).join(', ');
          visualPrompt = `Roadmap with ${parsed.count} steps: ${milestones}`;
        } else {
          const central = parsed.central_theme || prompt;
          const quadrants = (parsed.quadrants || []).slice(0, 4).map((q: any) => `${q.title}: ${q.points.join(', ')}`).join('. ');
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
Content: Each pod must contain a unique technical label from these steps: ${steps}.

STRICT ELITE MINIMALIST CONSTRAINTS:
- PROMPT EXCLUSION: NEVER write the words "MODE", "ROADMAP", or "CONTAINER" in the image.
- VISUAL HIERARCHY: Bold, oversized Headers/Labels. Very small, refined secondary detail text.
- MANDATORY DICTIONARY SPELLING: You MUST verify the spelling of EVERY SINGLE WORD you draw. ZERO tolerance for gibberish, mashed letters, or typos (e.g., no 'Prolonrud', 'Subotmal'). Every letter must be perfectly legible and exactly match standard English.
- MIRROR RULE: Copy the text from the steps EXACTLY. Do not change any spelling or casing. Perfect spelling of "${steps}" is mandatory.

STYLE: High-fidelity 3D vector. 
PALETTE RULES (STRICT - NO EXCEPTIONS):
- Background: Pure deep BLACK (#000000). No gradients on the base layer.
- Path/Spine: A glowing deep violet (#4B0082) or rich purple (#7B2FBE) ribbon winding as an S-curve.
- Pods/Bubbles: Use GLASS or FROSTED effect in WHITE (#FFFFFF) with a purple (#9D4EDD) glow border. Alternate between pure white glass and deep purple (#3A0CA3) solid pods for visual rhythm.
- Text Labels inside pods: Use YELLOW (#FFD700) for the main header. Use WHITE (#FFFFFF) for any sub-label.
- Connecting Lines: Glowing purple-to-violet gradient (#7B2FBE to #C77DFF).
- Accent Glows: Soft purple light halos around each pod node.
Portrait 4:5 (800x1000).`;
                    } else {
                      return `CINEMATIC 3D HOLOGRAPHIC DASHBOARD (INTEGRATED ICON STYLE). 
Layout: Floating central hexagonal glass core connected to four peripheral clear reflective glass modules. 
DISTRIBUTION: Use the full 800x1000 frame height. Modules must be large and spaced vertically.

ICONOGRAPHY (IMAGE-DOMINANT):
For every one of the 4 quadrants, you MUST render a LARGE, DISTINCT 3D Glass Icon that FLOATS ABOVE or is INTEGRATED into the top of the module pod.
CRITICAL ICON RULE: Each of the 4 icons MUST be a completely DIFFERENT vibrant neon color (e.g., Cyan, Emerald Green, Magenta, Amber). Do not use the same color for all icons.

Data Highlights: ${visualPrompt.substring(0, 1000)}.

STRICT ELITE CONSTRAINTS:
- ZERO TYPO TOLERANCE: You MUST verify the spelling of every single character. NO errors like "Enhahements" or "Mainteniarce". Spelling must be FLAWLESS.
- PROMPT EXCLUSION: NEVER write ANY technical metadata, labels, or status text like "MODE: DISPLAY", "MODE - CENTRAL", "VERSION", or "DASHBOARD".
- EXACTLY 4 QUADRANTS: You must ONLY draw exactly 4 quadrants around the core. You are STRICTLY FORBIDDEN from adding a 5th node at the bottom, and strictly forbidden from drawing vertical lines that lead to nothing. The bottom of the image must be PURE and empty.
- CLEANLINESS: Ignore any '|' characters in the Data Highlights, DO NOT draw vertical lines or cursors anywhere.
- MIRROR RULE: Copy the text from the data highlights EXACTLY.

ENVIRONMENT & COLORS:
- BACKGROUND: Deep Midnight Purple Gradient (#1A0B2E to #0A0412). 
- MATERIALS: CLEAR REFLECTIVE GLASS with glossy acrylic finish and realistic thickness.
- TEXT: YELLOW (#FFD700) for titles, WHITE (#FFFFFF) for bullet points.
- LIGHTING: Cinematic global illumination, soft neon auras.

STYLE: Photorealistic 3D Render (Cinema4D/Octane Quality). 
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
        
        // Elite Alpha-Masking: Remove white background from logo to prevent white box artifact
        // Uses high-precision contrast adjustment to ensure absolute transparency of white pixels
        const logoProcessor = sharp(logoBuffer);
        const alphaMask = await logoProcessor
          .clone()
          .greyscale()
          .negate()
          .linear(1.5, -40) // Contrast boost to kill any faint white halo
          .toBuffer();

        const resizedLogo = await sharp(logoBuffer)
          .joinChannel(alphaMask) 
          .resize({ height: TARGET_LOGO_HEIGHT })
          .png()
          .toBuffer();

        const logoMeta = await sharp(resizedLogo).metadata();
        const logoW = logoMeta.width || 130;

        const MARGIN = 60; // Elite Calibration Margin
        // --- ELITE DASHBOARD CALIBRATION: 800x1000 Portrait ---
        const buffer = await sharp(rawBuffer)
          .resize(800, 1000, {
            fit: 'contain',
            background: { r: 0, g: 0, b: 0, alpha: 1 }, // Pure Black background fill
            kernel: 'cubic'
          })
          .composite([
            {
              input: resizedLogo,
              left: 800 - logoW - MARGIN,
              top: 1000 - TARGET_LOGO_HEIGHT - MARGIN,
              blend: 'over',  // Transparent alpha-composite — removes box
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
