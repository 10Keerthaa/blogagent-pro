import { NextResponse } from "next/server";
import { uploadToGCS } from '@/lib/gcs';
import { generateHeroBanner } from '@/lib/imageProcessor';
import { getGoogleAuth } from '@/lib/googleAuth';

export const maxDuration = 60;

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { prompt, title, keywords, platform = 'framer' } = body;

        if (!prompt || !title) {
            return NextResponse.json({ error: "Prompt and Title are required" }, { status: 400 });
        }

        const auth = await getGoogleAuth(['https://www.googleapis.com/auth/cloud-platform']);
        const client = await auth.getClient();
        const projectId = await auth.getProjectId();

        // Switched to the dedicated Image model to resolve "Multi-modal output is not supported" error
        const url = `https://us-central1-aiplatform.googleapis.com/v1/projects/${projectId}/locations/us-central1/publishers/google/models/gemini-2.5-flash-image:generateContent`;

        // Strip "AI" so the model draws the industry (Farming, Finance) instead of a microchip.
        const cleanPrompt = prompt.replace(/\bAI in\b|\bAI\b/ig, "").trim() || prompt;

        // Aspect ratio: WordPress=4:3, Framer=16:9 — dimensions enforced downstream by imageProcessor
        const aspectRatio = platform === 'wordpress' ? "4:3" : "16:9";

        const imagePrompt = `A breathtaking, high-resolution conceptual digital art representing the core essence of '${cleanPrompt}'.
        Style: Professional enterprise aesthetic, high-contrast lighting, 3D depth, cinematic atmosphere.
        Theme: STRICTLY visualize the exact industry and subject matter of '${cleanPrompt}'. The background must be unmistakably and obviously related to this specific topic. Use bold, industry-specific 3D visual metaphors:
        - Healthcare / Medical → glowing DNA double helices, 3D molecular structures, abstract neural pathways, medical cross symbols
        - Finance / Banking → glowing 3D bar charts, abstract gold geometric coins, digital vault structures, rising graph lines
        - Technology / AI → abstract neural network nodes, flowing data streams, glowing geometric circuit-like patterns, holographic data grids
        - Logistics / Supply Chain → interconnected 3D node networks, abstract flow arrows, geometric grid maps
        - Manufacturing → abstract 3D gear systems, precision geometric machinery forms
        - Cybersecurity → abstract shield forms, encrypted data patterns, glowing lock structures
        Always use whichever visual metaphors best match the exact topic '${cleanPrompt}'. The image must be INSTANTLY recognisable as belonging to that specific industry.
        Color palette: Deep navy, electric violet, and teal highlights. MANDATORY — this exact color scheme must dominate the entire image at all times.
        
        ABSOLUTE RULES - ZERO EXCEPTIONS:
        - The imagery must be unmistakably and directly related to the specific topic '${cleanPrompt}'. Generic floating geometric shapes alone are NOT acceptable.
        - NO text, letters, words, numbers, or labels anywhere in the image.
        - NO cartoon, clipart, or flat vector illustration style.
        - If human figures are included, they MUST exclusively be men in professional business attire (suits/formal dress). NO female figures are allowed under any circumstances.
        
        8k photorealistic enterprise-grade conceptual art.`;

        const response = await client.request({
            url,
            method: 'POST',
            data: {
                contents: [{ role: 'user', parts: [{ text: imagePrompt }] }],
                generationConfig: {
                    responseModalities: ['IMAGE'],
                    imageConfig: { aspect_ratio: aspectRatio }
                }
            },
        });

        const data = response.data as any;
        const candidates = data?.candidates || [];
        const parts = candidates[0]?.content?.parts || [];
        const imagePart = parts.find((p: any) => p.inlineData?.mimeType?.startsWith('image/'));

        if (imagePart?.inlineData?.data) {
            const buffer = Buffer.from(imagePart.inlineData.data, 'base64');

            // Downstream pipeline unchanged: resize + purple tint via imageProcessor,
            // then logo/tag/title overlay via /api/banner, then GCS upload.
            const bannerBuffer = await generateHeroBanner(buffer, title, platform);

            const fileName = `featured-${Date.now()}.png`;
            const generatedImageUrl = await uploadToGCS(bannerBuffer, fileName, 'image/png');

            return NextResponse.json({ imageUrl: generatedImageUrl });
        } else {
            throw new Error("Invalid image response from Gemini 2.5 Flash Image");
        }

    } catch (error: any) {
        console.error("Featured Image API Error:", error);
        return NextResponse.json({
            error: "Image Generation Failed",
            details: error.message
        }, { status: 500 });
    }
}
