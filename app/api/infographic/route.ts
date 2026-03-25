import { NextResponse } from "next/server";
import { uploadToGCS } from '@/lib/gcs';
import { getGoogleAuth } from '@/lib/googleAuth';

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

    // TASK 1: Generate Visual Summary Prompt via Vertex AI Gemini 2.5 Flash
    let visualPrompt = '';
    try {
      const url = `https://us-central1-aiplatform.googleapis.com/v1/projects/${projectId}/locations/us-central1/publishers/google/models/gemini-2.5-flash:streamGenerateContent`;

      const aiPrompt = `
        You are a graphic designer specializing in data visualization.
        Draft: ${content.substring(0, 3000)}
        
        TASK: Create a highly detailed image generation prompt for a square infographic.
        REQUIREMENTS:
        - Must be a high-resolution, professional data visualization centered ENTIRELY on the provided blog content.
        - Style: Modern, clean lines, professional typography, vibrant and colorful palette.
        - Focus: Illustrate the specific key takeaways and data points from the blog text (e.g., if the blog is about hydration, show water/health data).
        - Aspect Ratio: Square (1:1).
        
        Return ONLY the prompt text. No quotes, no markdown.
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

    // TASK 2: Generate the Infographic via Vertex AI (Imagen)
    let infographicUrl = '';
    try {
      const imagenUrl = `https://us-central1-aiplatform.googleapis.com/v1/projects/${projectId}/locations/us-central1/publishers/google/models/imagen-3.0-generate-001:predict`;

      const response = await client.request({
        url: imagenUrl,
        method: 'POST',
        data: {
          instances: [
            {
              prompt: visualPrompt.substring(0, 500),
            },
          ],
          parameters: {
            sampleCount: 1,
            aspectRatio: "1:1",
          },
        },
      });

      const data = response.data as any;
      if (data.predictions && data.predictions[0] && data.predictions[0].bytesBase64Encoded) {
        const base64Data = data.predictions[0].bytesBase64Encoded;
        const buffer = Buffer.from(base64Data, 'base64');
        const fileName = `info-${Date.now()}.png`;

        console.log("Uploading Infographic to GCS...");
        infographicUrl = await uploadToGCS(buffer, fileName, 'image/png');
        console.log("GCS Upload Success:", infographicUrl);
      } else {
        throw new Error("Invalid response from Vertex AI Imagen");
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
