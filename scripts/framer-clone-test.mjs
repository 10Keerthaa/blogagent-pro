import { connect } from 'framer-api';
import fs from 'fs';
import path from 'path';

async function main() {
    const envPath = path.resolve(process.cwd(), '.env.local');
    const envContent = fs.readFileSync(envPath, 'utf8');
    const apiKey = envContent.match(/FRAMER_API_KEY=(.*)/)?.[1]?.trim();
    const projectId = "10xDS-AI--HWf6AK0krID40WbZhtbm-70z6O";
    const collectionId = "y4HlWWxdS";

    try {
        const framer = await connect(`https://framer.com/projects/${projectId}`, apiKey);
        const collections = await framer.getCollections();
        const blogsCol = collections.find(c => c.id === collectionId);

        console.log("\n🧬 CLONE TEST: Can Framer accept its own data?");
        console.log("-----------------------------------------");

        const items = await blogsCol.getItems();
        const originalItem = items[0];
        
        console.log(`Original Slug: "${originalItem.slug}"`);
        
        // Create a perfect clone
        const clone = {
            slug: "clone-test-" + Date.now(),
            draft: true,
            fieldData: originalItem.fieldData
        };

        console.log("📡 Attempting to re-upload original data shape...");
        try {
            await blogsCol.addItems([clone]);
            console.log("✅ SUCCESS! The server accepts its own data shape.");
            console.log("Winning Keys are exactly what we saw in the scan.");
        } catch (err) {
            console.error("❌ CLONE FAILED:", err.message);
            console.log("This proves the SDK or Server is rejecting the very keys it gave us.");
        }

        await framer.disconnect();
    } catch (error) {
        console.error("❌ Error:", error.message);
    }
}

main();
