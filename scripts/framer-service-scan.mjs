import fs from 'fs';
import path from 'path';

async function main() {
    const envPath = path.resolve(process.cwd(), '.env.local');
    const envContent = fs.readFileSync(envPath, 'utf8');
    const apiKey = envContent.match(/FRAMER_API_KEY=(.*)/)?.[1]?.trim();
    const collectionId = "y4HlWWxdS";

    const endpoints = [
        `https://api.framer.com/v1/collections/${collectionId}/items`,
        `https://api.framer.com/cms/v1/collections/${collectionId}/items`,
        `https://api.framer.com/cms/collections/${collectionId}/items`,
        `https://api.framer.com/v2/collections/${collectionId}/items`,
        `https://api.framer.com/v1/projects/10xDS-AI--HWf6AK0krID40WbZhtbm-70z6O/collections/${collectionId}/items`
    ];

    console.log("\n📡 SERVICE SCAN: Finding the active API...");
    console.log("-----------------------------------------");

    for (const url of endpoints) {
        process.stdout.write(`Testing: ${url.substring(0, 50)}... `);
        try {
            const response = await fetch(url, {
                method: 'GET',
                headers: { 'Authorization': `Bearer ${apiKey}` }
            });
            if (response.ok) {
                console.log("✅ SUCCESS!");
                process.exit(0);
            } else {
                console.log(`❌ (${response.status})`);
            }
        } catch (e) {
            console.log("❌ (Error)");
        }
    }
}

main();
