import { NextResponse } from "next/server";
import { uploadToGCS } from '@/lib/gcs';
import { getGoogleAuth } from '@/lib/googleAuth';
import sharp from 'sharp';
import fs from 'fs';
import path from 'path';


export const maxDuration = 120; // Extended for two sequential AI calls + GCS upload

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

    // TASK 1: Master Dashboard Analysis via Vertex AI Gemini 2.5 Pro
    let visualPrompt = '';
    try {
      const url = `https://us-central1-aiplatform.googleapis.com/v1/projects/${projectId}/locations/us-central1/publishers/google/models/gemini-2.5-pro:streamGenerateContent`;

      const aiPrompt = `
        Analyze this blog post and structure it for a 'Master Technical Dashboard' infographic.
        
        CRITICAL STRUCTURE:
        1. CENTRAL THEME: Extract the main strategic approach header.
        2. QUADRANTS: Identify exactly 4 primary industries or use cases discussed.
        3. MILESTONE BAR: Extract 5-7 sequential project steps (e.g. Identify, Define, Evaluate).
        4. SIDEBARS: Identify 3 Challenges and 3 Future Trends.

        Output ONLY a JSON object with: "central_theme", "quadrants" (title/points), "milestones", "challenges", "future".
        CRITICAL: Valid JSON only. No markdown.

        Blog Content: ${content.substring(0, 3500)}
      `;

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
        const parsed = JSON.parse(jsonMatch ? jsonMatch[0] : rawText);
        const central = parsed.central_theme || prompt;
        const quadrants = (parsed.quadrants || []).slice(0, 4).map((q: any) => `${q.title}`).join(', ');
        const milestones = (parsed.milestones || []).join(' > ');
        visualPrompt = `CENTRAL: ${central} | QUADRANTS: ${quadrants} | MILESTONES: ${milestones} | CHALLENGES: ${(parsed.challenges || []).join(', ')}`;
      } catch (e) {
        visualPrompt = rawText.substring(0, 500);
      }
    } catch (designerError: any) {
      console.error("Vertex AI Designer Error:", designerError);
      visualPrompt = `Master Dashboard for ${prompt}. Full-Spectrum Colorful.`;
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
                    const themeMatch = cleanedPrompt.match(/THEME: (.*?) \|/);
                    const countMatch = cleanedPrompt.match(/COUNT: (.*?) \|/);
                    const milestonesMatch = cleanedPrompt.match(/MILESTONES: (.*)/);
                    
                    const theme = themeMatch ? themeMatch[1] : 'translucent glass spheres';
                    const count = countMatch ? countMatch[1] : '5';
                    const milestones = milestonesMatch ? milestonesMatch[1] : cleanedPrompt;

                    return `MASTER TECHNICAL DASHBOARD. 
Layout: Central hexagonal thematic core connected to four peripheral quadrants.
Data: ${cleanedPrompt.substring(0, 1000)}.
${refinement ? `USER VISUAL DIRECTIVE: ${refinement}` : ''}

TEXT & BRANDING HARDENING MANDATE:
- BAN LOREM IPSUM: STRICTLY FORBIDDEN: Do not use any placeholder or non-English text. Every sidebar and trend summary must contain short, meaningful English technical phrases derived from the blog data.
- FIX SPELLING: Verify the spelling of the header "MILESTONES". It must be spelled correctly, not as "MILESONES".
- REMOVE WATERMARK TEXT: Do not render the text "10xDS ELITE" anywhere in the image. The bottom-right corner must remain clean to accommodate the post-processed logo.
- TYPOGRAPHY: All headers and labels must be rendered in high-contrast, bold English characters only.

VIBRANT FULL-SPECTRUM COLORFUL VISUALS:
1. Quadrant Modules: Use vibrant colors (Sage, Rose, Cerulean, Amber).
2. Bottom Ribbon: Sequential milestone chevron steps.
3. Sidebar Icons: Challenges and Trend summaries.

STYLE: Flat 2.5D Vector Illustration. 
PALETTE: Dark Navy background ({r: 10, g: 25, b: 47}). 
Portrait 4:5 (800x1000).`;
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
