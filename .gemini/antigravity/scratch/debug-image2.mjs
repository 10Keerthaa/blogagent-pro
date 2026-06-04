import { getGoogleAuth } from '../../lib/googleAuth.js';
import dotenv from 'dotenv';
dotenv.config({ path: '../../.env.local' });

async function runTest() {
    console.log("=== STARTING DEEP DEBUG ===");
    
    console.log("1. Authenticating with Google Cloud...");
    const auth = await getGoogleAuth(['https://www.googleapis.com/auth/cloud-platform']);
    const client = await auth.getClient();
    const projectId = await auth.getProjectId();
    
    const tokenResponse = await client.getAccessToken();
    const token = tokenResponse.token;

    console.log("2. Testing Image Generation Model (gemini-2.5-flash-image)...");
    const url = `https://us-central1-aiplatform.googleapis.com/v1/projects/${projectId}/locations/us-central1/publishers/google/models/gemini-2.5-flash-image:generateContent`;
    
    const imagePrompt = "A futuristic glowing neon city skyline at night";
    
    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                contents: [{ role: 'user', parts: [{ text: imagePrompt }] }],
                generationConfig: {
                    responseModalities: ['IMAGE'],
                    imageConfig: { aspect_ratio: "16:9" }
                }
            })
        });

        const data = await response.json();
        if (!response.ok) {
            console.error("\n❌ IMAGE GENERATION FAILED!");
            console.error("Google Vertex AI Error:", JSON.stringify(data, null, 2));
        } else {
            console.log("\n✅ IMAGE GENERATION SUCCEEDED!");
            console.log(data);
        }
    } catch (e) {
        console.error("Fetch failed:", e);
    }
}

runTest();
