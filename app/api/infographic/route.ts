import { NextResponse } from "next/server";
import { uploadToGCS } from '@/lib/gcs';
import { getGoogleAuth } from '@/lib/googleAuth';
import sharp from 'sharp';
import fs from 'fs';
import path from 'path';


export const maxDuration = 60; // Set timeout for Vercel

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

    // TASK 1: Generate Visual Summary Prompt via Vertex AI Gemini 2.5 Pro
    let visualPrompt = '';
    try {
      const url = `https://us-central1-aiplatform.googleapis.com/v1/projects/${projectId}/locations/us-central1/publishers/google/models/gemini-2.5-pro:streamGenerateContent`;

      const aiPrompt = `
        You are a Technical Infographic Designer for a premium enterprise AI company.
        Blog Title: ${prompt}
        Blog Content: ${content.substring(0, 3000)}

        TASK: Do two things in sequence:

        STEP A — Structural & Contextual Analysis:
        Read the blog content carefully.
        1. Identify the Industry Context (e.g. Hospitality, Finance, Cybersecurity).
        2. Identify the logical process: Is it a cycle, a linear sequence, or an expert model?
        3. Extract 3-5 'Key Takeaways' that provide the most value to an expert reader.

        STEP B — Image Prompt Generation:
        Write a detailed image generation prompt for a technical schematic (4:5 portrait ratio).

        THE MOST IMPORTANT RULE: 
        - DO NOT generate a dashboard, telemetry, or data visualization screen. 
        - DO NOT include charts, graphs, or UI elements.
        - INSTEAD: Generate a clean, flat-design Step-by-Step Cycle or Process Diagram.
        
        The prompt MUST specify:
        - LAYOUT: Modern flat-design diagram based on Step A.
        - ICONS: Use professional icons specific to the ${prompt} industry.
        - COMPONENTS: Clear labels using the Key Takeaways from Step A.
        - STYLE: Clean, minimal flat-design. Precision lines. High-resolution.
        - PALETTE: Vibrant Colorful Pastel palette (Soft Lavender, Mint, Sky Blue, and Coral).
        - BRANDING: 10xDS Elite Corporate aesthetic.
      `;

      const response = await client.request({
        url,
        method: 'POST',
        data: {
          contents: [{ role: "user", parts: [{ text: aiPrompt }] }],
          generationConfig: { temperature: 0.4, topP: 0.9, topK: 40 }
        }
      });

      const data = response.data as any;
      if (Array.isArray(data)) {
        visualPrompt = data.map(chunk => (chunk.candidates && chunk.candidates[0] && chunk.candidates[0].content.parts[0].text) || '').join('');
      } else if (data.candidates) {
        visualPrompt = data.candidates[0].content.parts[0].text;
      }
      visualPrompt = visualPrompt.trim();
    } catch (designerError: any) {
      console.error("Vertex AI Designer Error:", designerError);
      visualPrompt = `A clean, professional 10XDS style infographic for: ${prompt}. Square aspect ratio, premium corporate colors.`;
    }

    // TASK 2: Generate the Infographic via Gemini 2.5 Flash Image
    let infographicUrl = '';
    try {
      const geminiImageUrl = `https://us-central1-aiplatform.googleapis.com/v1/projects/${projectId}/locations/us-central1/publishers/google/models/gemini-2.5-flash-image:generateContent`;

      const response = await client.request({
        url: geminiImageUrl,
        method: 'POST',
        data: {
          contents: [
            {
              role: 'user',
              parts: [
                {
                  text: `${visualPrompt.substring(0, 800)}. USE VIBRANT COLORFUL PASTEL COLORS. NO DASHBOARDS. NO TELEMETRY. NO DATA SCREENS. Flat-design Step-by-Step Cycle Diagram only. Render labels in clean sans-serif font. Portrait format 4:5. High fidelity.`
                }
              ]
            }
          ],
          generationConfig: {
            responseModalities: ['IMAGE'],
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

        // Standardize logo scaling to match Hero Banner (h-14 feel)
        // On a 1000px height, a 75px height logo fits the visual weight of the 960x720 hero logo
        const TARGET_LOGO_HEIGHT = 75;
        const resizedLogo = await sharp(logoBuffer)
          .resize({ height: TARGET_LOGO_HEIGHT })
          .toBuffer();
        const logoMeta = await sharp(resizedLogo).metadata();
        const logoW = logoMeta.width || 130;

        // Resize infographic to exactly 800x1000 and overlay logo at bottom-right
        const MARGIN = 40; // Match Hero Banner margin
        const buffer = await sharp(rawBuffer)
          .resize(800, 1000, { fit: 'cover', position: 'center', kernel: 'cubic' })
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

        // SEO optimized filename
        const slug = prompt.toLowerCase().split(' ').join('-').replace(/[^\w-]/g, '');
        const fileName = `${slug}-infographic-${Date.now()}.png`;

        console.log("Uploading Infographic to GCS...");
        infographicUrl = await uploadToGCS(buffer, fileName, 'image/png');
        console.log("GCS Upload Success:", infographicUrl);
      } else {
        throw new Error("Invalid response from Gemini Flash Image");
      }
    } catch (vertexError: any) {
      console.error("Vertex Infographic Error:", vertexError);
      // Fallback to a neutral infographic-style illustration
      infographicUrl = `https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=800&q=80`;
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
