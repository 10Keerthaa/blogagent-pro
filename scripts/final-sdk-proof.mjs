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
        console.log("\n🧪 FINAL SDK PROOF: Testing Perfect Shape");
        console.log("-----------------------------------------");
        
        const framer = await connect(`https://framer.com/projects/${projectId}`, apiKey);
        const collections = await framer.getCollections();
        const blogsCol = collections.find(c => c.id === collectionId);

        const testSlug = "sdk-perfect-shape-test-" + Date.now();
        const itemPayload = {
          slug: testSlug,
          draft: true,
          fieldData: {
            "Blog Head": { type: "string",        value: "🚀 SDK SUCCESS TEST", valueByLocale: {} },
            "Content":   { type: "formattedText", value: "This is a test.",     valueByLocale: {} },
            "Category":  { type: "string",        value: "Test",                valueByLocale: {} },
            "Description": { type: "string",      value: "Testing SDK Shape",   valueByLocale: {} },
          }
        };

        console.log("📡 Sending test item...");
        const result = await blogsCol.addItems([itemPayload]);
        
        console.log("✅ SUCCESS! Item created via SDK with Perfect Shape.");
        console.log(`New Item Slug: ${testSlug}`);

        await framer.disconnect();
    } catch (error) {
        console.error("❌ TEST FAILED:", error.message);
    }
}

main();
