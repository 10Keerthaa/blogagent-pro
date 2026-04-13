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
        You are an Expert Information Designer. Your task is to design a professional 'Industry Roadmap' infographic for a blog post.
        Blog Title: ${prompt}
        Blog Content: ${content.substring(0, 3000)}
        
        STEP A — Analysis:
        1. Identify the specific Industry (e.g., Boutique Hotels, Cybersecurity, AI Automation).
        2. Identify the core 'Expert Journey' or 'Maturity Path' described in the text.
        3. Extract 4-6 'Key Insights' from the CONTENT SUMMARY that represent specific actions or human-tech interactions.

        ${refinement ? `USER REFINEMENT INSTRUCTIONS (PRIORITY):
        Strictly incorporate the following changes requested by the user: "${refinement}"
        Ensure these adjustments override default stylistic choices if they conflict.` : ''}

        STEP B — Image Prompt Generation:
        Write a hyper-detailed image generation prompt for a technical 'Industry Roadmap' (strictly 4:5 portrait ratio).

        THE MANDATORY RULES: 
        - LAYOUT: Use a **Winding Roadmap** or **S-Curve Path** layout. A central digital 'road' must flow through the canvas connecting 4-6 nodes.
        - ORIENTATION: Portrait (Vertical).
        - NODES: Each node must feature a **Circular Illustrative Vignette** (a small, detailed scene showing people interacting with technology relevant to the industry).
        - LABELS: Use **Floating Text Bubbles** or minimalist call-outs for Takeaways.
        - STYLE: Isometric Flat Design. Clean, professional, and sophisticated.
        - NEGATIVE CONSTRAINTS: DO NOT generate a dashboard, telemetry, or data visualization screen. NO generic vertical boxes, NO bars, NO histograms. NO 3D bubbles.
        - PALETTE: Vibrant Colorful Pastel palette (Lavender, Mint, Sky Blue, and Coral).
        - BRANDING: High-end corporate schematic feel, 10xDS Elite standard.
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
      if (Array.isArray(data)) {
        visualPrompt = data.map(chunk => (chunk.candidates && chunk.candidates[0] && chunk.candidates[0].content.parts[0].text) || '').join('');
      } else if (data.candidates) {
        visualPrompt = data.candidates[0].content.parts[0].text;
      }
      visualPrompt = visualPrompt.trim();
    } catch (designerError: any) {
      console.error("Vertex AI Designer Error:", designerError);
      visualPrompt = `A clean, professional 10XDS style infographic for: ${prompt}. Industry Roadmap style.`;
    }

    // TASK 2: Restored High-Fidelity Generation via Gemini 2.5 Flash Image
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
                  text: `${visualPrompt.substring(0, 800)}. USE VIBRANT COLORFUL PASTEL COLORS. DO NOT GENERATE DASHBOARDS OR TELEMETRY. NO VERTICAL BOXES. ISOMETRIC S-CURVE ROADMAP ONLY. CIRCULAR VIGNETTES WITH PEOPLE AND TECH. FLOATING TEXT BUBBLES. Portrait format 4:5. High fidelity.`
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

        const TARGET_LOGO_HEIGHT = 75;
        const resizedLogo = await sharp(logoBuffer)
          .resize({ height: TARGET_LOGO_HEIGHT })
          .toBuffer();
        const logoMeta = await sharp(resizedLogo).metadata();
        const logoW = logoMeta.width || 130;

        const MARGIN = 40; // Match Hero Banner margin
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
