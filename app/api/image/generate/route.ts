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
        Theme: Analyze the '${cleanPrompt}' topic and make the INDUSTRY the primary visual subject. Use topic-specific sophisticated visual metaphors. For example, if it's about healthcare, draw abstract DNA helices or sterile medical environments. If it's finance, draw abstract 3D charts, glowing vaults, or golden geometric coins. Any technological elements should be subtle background data streams or node networks.
        Color palette: Deep navy, electric violet, and teal highlights.
        
        ABSOLUTE RULES - ZERO EXCEPTIONS:
        - The imagery must be conceptual and sophisticated, not a literal photograph of a device.
        - NO text, letters, words, numbers, or labels anywhere in the image.
        - NO microchips, circuit boards, glowing brains, cartoon or clipart elements.
        - NO people, faces, hands, or human figures.
        
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
