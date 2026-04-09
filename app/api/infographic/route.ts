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
        Blog Content: ${content.substring(0, 3000)}

        TASK: Do two things in sequence:

        STEP A — Content Analysis:
        Read the blog content carefully and identify exactly 4 main pillars, steps, or themes. Each pillar must be represented by a SINGLE WORD (e.g. "Automate", "Scale", "Integrate", "Monitor"). These words must come directly from the blog content.

        STEP B — Image Prompt Generation:
        Using those 4 pillars, write a detailed image generation prompt for a vertical infographic (3:4 portrait ratio).

        The prompt MUST specify:
        - LAYOUT: A 3D Isometric Technical Schematic with 4 nodes — use a hub-and-spoke or sequential process flow diagram to visually explain the architecture.
        - LABELS: Each node must have its single-word pillar label rendered in clean, professional, sans-serif typography.
        - STYLE: 3D Isometric Technical Schematic. Precision engineering aesthetic. High-resolution, crisp lines.
        - PRIMARY COLORS: Deep Purple, Silver, and White.
        - ACCENT COLOR: Muted Dark Gray (#666666) for ALL connecting lines, arrows, secondary borders, and background grid details.
        - BRANDING: 10xDS Premium Corporate feel. No decorative elements unrelated to the blog topic.
        - The infographic must be a meaningful technical architecture schematic of THIS specific blog post.

        Return ONLY the final image generation prompt text for Step B. No explanations, no markdown, no quotes.
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
      const geminiImageUrl = `https://us-central1-aiplatform.googleapis.com/v1/projects/${projectId}/locations/us-central1/publishers/google/models/gemini-2.0-flash-preview-image-generation:generateContent`;

      const response = await client.request({
        url: geminiImageUrl,
        method: 'POST',
        data: {
          contents: [
            {
              role: 'user',
              parts: [
                {
                  text: `${visualPrompt.substring(0, 800)}. Render single-word pillar labels in clean, professional sans-serif font. Use Deep Purple, Silver, White as primary colors. Use #666666 (Muted Dark Gray) exclusively for all connecting lines, arrows, and secondary details. Technical Schematic style. Portrait format 3:4. High fidelity, enterprise-grade visual.`
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

        // Resize logo to 130px wide for the overlay
        const resizedLogo = await sharp(logoBuffer)
          .resize({ width: 130 })
          .toBuffer();
        const logoMeta = await sharp(resizedLogo).metadata();
        const logoH = logoMeta.height || 50;

        // Resize infographic to exactly 800x1000 and overlay logo at bottom-right
        const MARGIN = 40; // Requirement: Match visual proportions of featured image
        const buffer = await sharp(rawBuffer)
          .resize(800, 1000, { fit: 'cover', position: 'center', kernel: 'cubic' })
          .composite([
            {
              input: resizedLogo,
              left: 800 - 130 - MARGIN,
              top: 1000 - logoH - MARGIN,
            }
          ])
          .png()
          .toBuffer();
        // --- END POST-PROCESSING ---

        const fileName = `info-${Date.now()}.png`;

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
