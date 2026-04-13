import { NextResponse } from "next/server";
import { uploadToGCS } from '@/lib/gcs';
import { generateHeroBanner } from '@/lib/imageProcessor';
import { getGoogleAuth } from '@/lib/googleAuth';

export const maxDuration = 60;

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { prompt, title, keywords } = body;

        if (!prompt || !title) {
            return NextResponse.json({ error: "Prompt and Title are required" }, { status: 400 });
        }

        const auth = await getGoogleAuth(['https://www.googleapis.com/auth/cloud-platform']);
        const client = await auth.getClient();
        const projectId = await auth.getProjectId();

        const url = `https://us-central1-aiplatform.googleapis.com/v1/projects/${projectId}/locations/us-central1/publishers/google/models/imagen-3.0-generate-001:predict`;
        const imagePrompt = `A stunning, high-quality abstract professional background photograph thematically inspired by the concept of '${prompt}'. The image MUST be purely visual and atmospheric — absolutely NO text, NO letters, NO words, NO numbers, NO laptop screens, NO computer monitors, NO phone screens, NO digital displays showing any text. NO UI elements. Depict the theme using abstract shapes, lighting, color gradients, or symbolic visual metaphors only. Professional minimalist aesthetic, elegant dramatic lighting, premium corporate color palette. Clean composition suitable as a full-bleed background for white text overlays.`;

        const response = await client.request({
            url,
            method: 'POST',
            data: {
                instances: [{ prompt: imagePrompt }],
                parameters: { sampleCount: 1, aspectRatio: "4:3" },
            },
        });

        const data = response.data as any;
        if (data.predictions?.[0]?.bytesBase64Encoded) {
            const base64Data = data.predictions[0].bytesBase64Encoded;
            const buffer = Buffer.from(base64Data, 'base64');

            // Bake the Hero Banner (Refinement 3.0 logic already handles the frontend overlay, 
            // but we still want the base image resized/tinted if needed by imageProcessor)
            const bannerBuffer = await generateHeroBanner(buffer, title);

            const fileName = `featured-${Date.now()}.png`;
            const generatedImageUrl = await uploadToGCS(bannerBuffer, fileName, 'image/png');

            return NextResponse.json({ imageUrl: generatedImageUrl });
        } else {
            throw new Error("Invalid image response from Vertex AI");
        }

    } catch (error: any) {
        console.error("Featured Image API Error:", error);
        return NextResponse.json({
            error: "Image Generation Failed",
            details: error.message
        }, { status: 500 });
    }
}
