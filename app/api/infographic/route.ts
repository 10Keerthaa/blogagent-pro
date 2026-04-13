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

    // TASK 1: Generate Visual Design Blueprint via Vertex AI Gemini 1.5 Flash (Proven Stable)
    let visualPrompt = '';
    try {
      const url = `https://us-central1-aiplatform.googleapis.com/v1/projects/${projectId}/locations/us-central1/publishers/google/models/gemini-1.5-flash:streamGenerateContent`;

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
      if (data.candidates) {
        visualPrompt = data.candidates[0].content.parts[0].text;
      }
      visualPrompt = visualPrompt.trim();
    } catch (designerError: any) {
      console.error("Vertex AI Designer Error:", designerError);
      visualPrompt = `A clean, professional 10XDS style infographic for: ${prompt}. Isometric glass-bubble roadmap.`;
    }

    // TASK 2: Restored High-Fidelity Generation via Imagen 3 (Proven Artist)
    let infographicUrl = '';
    try {
      const imagenUrl = `https://us-central1-aiplatform.googleapis.com/v1/projects/${projectId}/locations/us-central1/publishers/google/models/imagen-3.0-generate-001:predict`;

      const imagePrompt = `
        ISOMETRIC 3D GLASS-BUBBLE ROADMAP with glowing winding path and glass spheres. Portrait 4:5 ratio. High-end Executive 3D Illustration.
        Visual Blueprint: ${visualPrompt.substring(0, 1000)}.
        
        THE ARTIST MANDATES:
        1. THE LIGHT MANDATE: STRICTLY PURE WHITE or Light Pearl Gray background. NO DARK THEMES. NO BLACK OR CHARCOAL.
        2. NO-OFFICE RULE: ABSOLUTELY DO NOT draw a real office, do not draw real people in a real room, no stock photography of people. 
        3. THE NO-SCREEN RULE: ABSOLUTELY DO NOT draw a computer, a laptop, a monitor, a tablet, or a UI dashboard. Represent the data as a physical journey through 3D glass spheres on a winding path.
        4. TEXTURE: Translucent glass, soft light refraction, vibrant colorful pastel palette (Lavender, Mint, Coral, Sky Blue).
        
        NEGATIVE REINFORCEMENT: [office, laptop, computer, monitor, screen, dashboard, analytics, UI, browser window, telemetry, dark mode, black background, software interface, mouse cursor, scrollbar].
        
        MANDATORY: All text must be perfectly spelled and highly legible.
      `;

      const response = await client.request({
        url: imagenUrl,
        method: 'POST',
        data: {
          instances: [{ prompt: imagePrompt }],
          parameters: { sampleCount: 1, aspectRatio: "4:5" },
        }
      });

      const data = response.data as any;
      if (data.predictions?.[0]?.bytesBase64Encoded) {
        const base64Data = data.predictions[0].bytesBase64Encoded;
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

        const MARGIN = 60; 
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
        throw new Error("Invalid response from Imagen 3");
      }
    } catch (vertexError: any) {
      console.error("Vertex Infographic Error:", vertexError);
      // Fallback to a neutral infographic illustration (No Fallback Photos)
      infographicUrl = `https://images.unsplash.com/photo-1557804506-669a67965ba0?auto=format&fit=crop&w=800&q=80`;
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
