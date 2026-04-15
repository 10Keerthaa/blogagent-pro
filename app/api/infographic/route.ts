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

    // TASK 1: Generate Visual Summary Prompt via Vertex AI Gemini 2.5 Pro
    let visualPrompt = '';
    try {
      const url = `https://us-central1-aiplatform.googleapis.com/v1/projects/${projectId}/locations/us-central1/publishers/google/models/gemini-2.5-pro:streamGenerateContent`;

      const aiPrompt = `
        Analyze this blog post and extract sequential milestones that represent a 'Technical Journey' for an infographic.
        
        CRITICAL INSTRUCTIONS:
        1. Title & Header Detection: Look at the Blog Title: "${prompt}". If it contains a number between 5 and 10 (e.g., '7 Steps', '8 Phases'), you MUST extract EXACTLY that many milestones. Scan the Blog Content for headers like "Phase 1", "Step 2", etc., to confirm the sequence. DO NOT merge, summarize, or omit any milestones if a specific number is requested.
        2. Container Theme: Identify a 'Container Theme' based on the industry (e.g., 'translucent glass cubes' for Tech, 'translucent glass pillars' for Architecture, 'translucent glass crates' for Logistics, 'translucent glass spheres' for General).

        Output ONLY a JSON object with these fields:
        - "container_theme": The identified 3D container theme.
        - "milestones": A JSON array where each milestone has:
            - "header": A 3-word title for the milestone.
            - "visual_vignette": A description of a 3D character interacting with a specific tech element from the text.
            - "industry": The primary industry of the post.

        CRITICAL: Output valid JSON only. No explanation text. No markdown backticks.

        Blog Content: ${content.substring(0, 3500)}
      `;

      const resp = await client.request({
        url,
        method: 'POST',
        data: {
          contents: [{ role: "user", parts: [{ text: aiPrompt }] }],
          generationConfig: { temperature: 0.4, topP: 0.9, topK: 40 }
        }
      });

      const data = resp.data as any;
      let rawText = '';
      if (Array.isArray(data)) {
        rawText = data.map(chunk => (chunk.candidates && chunk.candidates[0] && chunk.candidates[0].content.parts[0].text) || '').join('');
      } else if (data.candidates) {
        rawText = data.candidates[0].content.parts[0].text;
      }

      // ELITE RESILIENT EXTRACTION: Look for the JSON array specifically
      try {
        const jsonMatch = rawText.match(/\{[\s\S]*\}/);
        const jsonContent = jsonMatch ? jsonMatch[0] : rawText;
        const parsedData = JSON.parse(jsonContent);
        const parsed = Array.isArray(parsedData) ? parsedData : (parsedData.milestones || []);
        const theme = parsedData.container_theme || 'translucent glass spheres';

        if (Array.isArray(parsed) && parsed.length > 0) {
          const industry = parsed[0]?.industry || 'Technical';
          const milestoneCount = parsed.length;
          const milestones = parsed.map(m => `Header: ${m.header} - Vignette: ${m.visual_vignette}`).join('; ');
          
          // Store theme and count in a way that Task 2 can easily read (via a simple formatted string)
          visualPrompt = `THEME: ${theme} | COUNT: ${milestoneCount} | INDUSTRY: ${industry} | MILESTONES: ${milestones}`;
        } else {
          visualPrompt = rawText;
        }
      } catch (parseError) {
        console.warn("JSON Parse failed, attempting Regex Recovery...");
        // EMERGENCY REGEX RECOVERY: Manually extract headers and vignettes from raw text
        const headerMatches = Array.from(rawText.matchAll(/"header":\s*"([^"]+)"/g));
        const vignetteMatches = Array.from(rawText.matchAll(/"visual_vignette":\s*"([^"]+)"/g));
        
        if (headerMatches.length >= 3) {
           const milestones = headerMatches.map((m, i) => {
             const h = m[1];
             const v = vignetteMatches[i] ? vignetteMatches[i][1] : "Professional 3D technical scene";
             return `Header: ${h} - Vignette: ${v}`;
           }).join('; ');
           visualPrompt = `A Pastel Isometric S-Curve Roadmap. Path includes these milestones inside translucent glass bubbles: ${milestones}.`;
        } else {
          visualPrompt = rawText.substring(0, 500); // Massive fallback to raw text snippets
        }
      }
      visualPrompt = visualPrompt.trim();
    } catch (designerError: any) {
      console.error("Vertex AI Designer Error:", designerError);
      visualPrompt = `Professional 'Industry Roadmap' infographic for: ${prompt}. LAYOUT: Isometric S-Curve Winding Roadmap with 4-5 circular illustrative vignettes connected by a glowing digital road. Each vignette shows people interacting with technology specific to the topic. STYLE: Isometric Flat Design. PALETTE: Pastel (Lavender, Mint, Sky Blue, Coral). Floating text bubble labels. Portrait 4:5 ratio. 10xDS Elite corporate standard.`;
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

                    return `ISOMETRIC 3D INFOGRAPHIC ROADMAP. Render exactly ${count} ${theme} containers. Portrait layout. A winding path of soft pastels (Sage, Dusty Rose, Cerulean) winding through a pearl-gray space. Mandatory: Render the single-word milestone headers clearly above each ${theme} in clean typography. Include professional, technical vignettes illustrating each header. STRICTLY PROHIBIT dashboards, computer screens, or office environments. High-fidelity 10xDS Elite standard.`;
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

        // --- ELITE CALIBRATION: Resize to 800x1000 ---
        const buffer = await sharp(rawBuffer)
          // 1. Force exact pixel dimension
          .resize(800, 1000, {
            fit: 'contain', // Keep the roadmap's perspective
            background: { r: 242, g: 242, b: 242, alpha: 1 }, // Elite Pearl-Gray background fill
            kernel: 'cubic' // Clean resample
          })
          // 2. Composite the logo with precise 60px margin
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
