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
        const imagePrompt = `A breathtaking, abstract, high-resolution digital art representing '${prompt}'.
        Style: Glowing neon circuit patterns, flowing data streams, geometric particle fields, or luminous network nodes on a deep dark background.
        Color palette: Deep navy, electric violet, and teal highlights.
        
        ABSOLUTE RULES - ZERO EXCEPTIONS:
        - NO laptops, NO phones, NO screens, NO monitors, NO devices of ANY kind.
        - NO text, NO letters, NO words, NO numbers anywhere.
        - NO people, NO faces, NO hands.
        - ONLY abstract geometric patterns, light flows, and data visualizations.
        
        8k photorealistic abstract digital art.`;

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
