import fs from 'fs';
import path from 'path';
import { GoogleAuth } from 'google-auth-library';

async function runTest() {
    console.log("=== STARTING DEEP DEBUG ===");
    
    // 1. Get Credentials
    const envPath = path.resolve(process.cwd(), '.env.local');
    const envStr = fs.readFileSync(envPath, 'utf8');
    const privateKey = envStr.match(/FIREBASE_PRIVATE_KEY="(.*?)"/s)?.[1]?.replace(/\\n/g, '\n') || '';
    const clientEmail = envStr.match(/FIREBASE_CLIENT_EMAIL=(.*)/)?.[1]?.trim() || '';
    const projectId = envStr.match(/FIREBASE_PROJECT_ID=(.*)/)?.[1]?.trim() || '';

    if (!privateKey || !clientEmail) {
        console.error("Missing credentials in .env.local");
        return;
    }

    console.log("1. Authenticating with Google Cloud...");
    const auth = new GoogleAuth({
        credentials: { client_email: clientEmail, private_key: privateKey },
        scopes: ['https://www.googleapis.com/auth/cloud-platform']
    });

    const client = await auth.getClient();
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
