import fs from 'fs';
import path from 'path';

async function main() {
    const envPath = path.resolve(process.cwd(), '.env.local');
    const envContent = fs.readFileSync(envPath, 'utf8');
    const apiKey = envContent.match(/FRAMER_API_KEY=(.*)/)?.[1]?.trim();
    const projectId = "10xDS-AI--HWf6AK0krID40WbZhtbm-70z6O";
    const collectionId = "y4HlWWxdS";

    // Trying the Project-Specific Endpoint
    const url = `https://api.framer.com/v1/projects/${projectId}/collections/${collectionId}/items`;

    console.log(`\n🔍 PROJECT-URL FINDER: Testing api.framer.com/v1/projects/...`);
    console.log("-----------------------------------------");

    try {
        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json',
            },
        });

        if (response.ok) {
            console.log("✅ SUCCESS! The Project-Specific endpoint is correct.");
            const data = await response.json();
            console.log("Items found:", data.items.length);
        } else {
            const errorText = await response.text();
            console.error(`❌ Failed (${response.status}): ${errorText}`);
        }
    } catch (error) {
        console.error("❌ Fetch failed:", error.message);
    }
}

main();
