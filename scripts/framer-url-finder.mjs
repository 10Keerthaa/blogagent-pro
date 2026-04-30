import fs from 'fs';
import path from 'path';

async function main() {
    const envPath = path.resolve(process.cwd(), '.env.local');
    const envContent = fs.readFileSync(envPath, 'utf8');
    const apiKey = envContent.match(/FRAMER_API_KEY=(.*)/)?.[1]?.trim();

    // Trying the clean V1 endpoint
    const url = `https://api.framer.com/v1/collections`;

    console.log("\n🔍 URL FINDER: Testing api.framer.com/v1/collections");
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
            console.log("✅ SUCCESS! The V1 endpoint is correct.");
            const data = await response.json();
            console.log("Collections found:", data.collections.map(c => `${c.name} (${c.id})`));
        } else {
            const errorText = await response.text();
            console.error(`❌ V1 Failed (${response.status}): ${errorText}`);
        }
    } catch (error) {
        console.error("❌ Fetch failed:", error.message);
    }
}

main();
