import fs from 'fs';
import path from 'path';

async function main() {
    const envPath = path.resolve(process.cwd(), '.env.local');
    const envContent = fs.readFileSync(envPath, 'utf8');
    const apiKey = envContent.match(/FRAMER_API_KEY=(.*)/)?.[1]?.trim();
    const collectionId = "y4HlWWxdS"; 

    // The Modern V1 Endpoint
    const url = `https://api.framer.com/cms/v1/collections/${collectionId}/items`;

    console.log("\n🚀 MODERN REST DISCOVERY: Fetching from api.framer.com/v1");
    console.log("-----------------------------------------");

    try {
        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json',
            },
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error(`❌ Error ${response.status}: ${errorText}`);
            return;
        }

        const data = await response.json();

        if (data.items && data.items.length > 0) {
            console.log("✅ SECRET MACHINE CODES FOUND!");
            const firstItem = data.items[0];
            Object.entries(firstItem.fieldData).forEach(([key, value]) => {
                console.log(`Real ID: "${key}" | Sample Value: ${JSON.stringify(value).substring(0, 50)}...`);
            });
        } else {
            console.log("No items found. Please add a dummy item in Framer manually!");
        }
    } catch (error) {
        console.error("❌ Fetch failed:", error.message);
    }
}

main();
