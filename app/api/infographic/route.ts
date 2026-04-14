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
        Analyze this blog post and extract exactly 5 sequential milestones that represent a 'Technical Journey' for an infographic.

        Output ONLY a JSON array with exactly these fields for each milestone:
        - "header": A 3-word title for the milestone.
        - "visual_vignette": A description of a 3D character interacting with a specific tech element from the text.
        - "industry": The primary industry of the post.

        CRITICAL: Output valid JSON only. No explanation text. No markdown backticks.

        Blog Content: ${content.substring(0, 2000)}
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
        const jsonMatch = rawText.match(/\[[\s\S]*\]/);
        const jsonContent = jsonMatch ? jsonMatch[0] : rawText;
        const parsed = JSON.parse(jsonContent);

        if (Array.isArray(parsed)) {
          const industry = parsed[0]?.industry || 'Technical';
          const milestones = parsed.map(m => `(Label: "${m.header}", Scene: ${m.visual_vignette})`).join(', ');
          visualPrompt = `Isometric Roadmap for ${industry}. Milestones: ${milestones}.`;
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
             return `(Label: "${h}", Scene: ${v})`;
           }).join(', ');
           visualPrompt = `Professional Isometric Roadmap. Milestones: ${milestones}.`;
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
                  text: `Strictly render EXACTLY 5 glass bubbles. DO NOT add empty bubbles or decorative nodes. ISOMETRIC 3D GLASS-BUBBLE ROADMAP. S-Curve winding path on a soft pearl-gray background. Render the 3-word "header" clearly as a floating label above each bubble, and use the "vignette" description to illustrate the scene inside the bubble. Use this list: ${cleanedPrompt.substring(0, 1000)}. 4:5 Portrait. High Fidelity Rendering.`
                }
              ]
            }
          ],
          generationConfig: {
            responseModalities: ['TEXT', 'IMAGE'],
          }
        }
      });

      const data = response.data as any;
      const imagePart = data?.candidates?.[0]?.content?.parts?.find((p: any) => p.inlineData?.mimeType?.startsWith('image/'));

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
        const buffer = await sharp(rawBuffer)
          .resize(800, 1000, {
            fit: 'contain',
            background: { r: 255, g: 255, b: 255, alpha: 1 },
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
      console.error("Vertex Infographic Error:", vertexError?.message || vertexError?.response?.data || vertexError);
      // Fallback to the local branded elite placeholder created for this project
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
