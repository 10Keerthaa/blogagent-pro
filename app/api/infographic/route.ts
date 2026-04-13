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

    // TASK 1: Generate Visual Design Blueprint via Vertex AI Gemini 2.5 Pro
    let visualPrompt = '';
    try {
      const url = `https://us-central1-aiplatform.googleapis.com/v1/projects/${projectId}/locations/us-central1/publishers/google/models/gemini-2.5-pro:streamGenerateContent`;

      const aiPrompt = `
        You are an Expert Strategic Information Designer. Your task is to design a high-fidelity 'Logic Flow' blueprint for a professional Infographic.
        Blog Title: ${prompt}
        Blog Content: ${content.substring(0, 3000)}
        
        STEP 1 — The Design Blueprint (The "Brain"):
        1. Logic Flow Analysis: Read the content and identify the 4-6 "Key Milestones" or "Strategic Phases" (e.g., Data Acquisition → Processing → Security → Insights).
        2. Identify the Industry context (e.g., Cybersecurity, Manufacturing, AI Finance).
        3. Extraction: List exactly 4-6 concise takeaways (under 5 words each).
        
        ${refinement ? `USER REFINEMENT INSTRUCTIONS (PRIORITY):
        Strictly incorporate the following changes requested by the user: "${refinement}"
        Ensure these adjustments override default stylistic choices if they conflict.` : ''}

        STEP 2 — Professional Description:
        Write a hyper-detailed architectural description for an 'Isometric Glass-Bubble Roadmap'.
        RULES:
        - The milestones must be represented as **3D Physical Scenes (Vignettes)** showing human-tech interaction.
        - Each vignette must be contained inside a **Translucent Isometric Glass Sphere/Bubble**.
        - All spheres must be connected by a **Winding Glowing S-Curve Roadmap** that flows through the vertical canvas.
        - SPELLING: List the technical terms that must be 100% accurate (e.g., 'IMPLEMENTATION', 'GOVERNANCE', 'SECURITY').
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
      visualPrompt = `A clean, professional 10XDS style infographic for: ${prompt}. Isometric glass-bubble roadmap.`;
    }

    // TASK 2: High-Fidelity Generation via Gemini 2.5 Flash Image (The "Artist")
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
                  text: `
                    PRIMARY STYLE: ISOMETRIC GLASS-BUBBLE ROADMAP. 
                    Visual Blueprint: ${visualPrompt.substring(0, 1000)}.
                    
                    THE ARTIST MANDATES:
                    1. THE LIGHT MANDATE: Strictly use a soft Pearl Gray, light Pastel, or PURE WHITE background. NO DARK THEMES. NO BLACK OR CHARCOAL.
                    2. THE NO-SCREEN RULE: ABSOLUTELY DO NOT draw a computer, a laptop, a monitor, a tablet, or a UI dashboard. Represent the data as a physical journey through 3D glass spheres on a winding path.
                    3. TEXTURE: Translucent glass, soft light refraction, vibrant colorful pastel palette (Lavender, Mint, Coral, Sky Blue).
                    4. LAYOUT: Winding S-Curve Path, portrait 4:5 ratio. High-end Executive 3D Illustration.
                    
                    NEGATIVE REINFORCEMENT: [dashboard, analytics, UI, screen, monitor, browser window, telemetry, dark mode, black background, software interface, mouse cursor, scrollbar].
                    
                    MANDATORY: All text must be perfectly spelled and highly legible.
                  `
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
        const MARGIN = 60; // Increased margin for better branding breathing room
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
