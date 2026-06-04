import { getGoogleAuth } from './lib/googleAuth';
import fs from 'fs';
import path from 'path';

const envStr = fs.readFileSync(path.resolve(process.cwd(), '.env.local'), 'utf8');
envStr.split('\n').forEach(line => {
    const match = line.match(/^([^=]+)=(.*)$/);
    if (match) {
        let val = match[2].trim();
        if (val.startsWith('"') && val.endsWith('"')) val = val.slice(1, -1);
        if (val.startsWith("'") && val.endsWith("'")) val = val.slice(1, -1);
        val = val.replace(/\\n/g, '\n');
        process.env[match[1].trim()] = val;
    }
});

async function runTest() {
    console.log("=== STARTING DEEP DEBUG ===");
    const auth = await getGoogleAuth(['https://www.googleapis.com/auth/cloud-platform']);
    const client = await auth.getClient();
    const projectId = await auth.getProjectId();
    const tokenResponse = await client.getAccessToken();
    const token = tokenResponse.token;

    console.log("2. Testing Image Generation Model (gemini-2.5-flash-image)...");
    const url = `https://us-central1-aiplatform.googleapis.com/v1/projects/${projectId}/locations/us-central1/publishers/google/models/gemini-2.5-flash-image:generateContent`;
    
    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                contents: [{ role: 'user', parts: [{ text: "test image" }] }],
                generationConfig: { responseModalities: ['IMAGE'] }
            })
        });

        const data = await response.json();
        if (!response.ok) {
            console.error("\n❌ IMAGE GENERATION FAILED!");
            console.error("Google Vertex AI Error:", JSON.stringify(data, null, 2));
        } else {
            console.log("\n✅ IMAGE GENERATION SUCCEEDED!");
        }
    } catch (e) {
        console.error("Fetch failed:", e);
    }
}
runTest();
