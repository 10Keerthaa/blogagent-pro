import { connect } from 'framer-api';
import fs from 'fs';
import path from 'path';

async function main() {
    const envPath = path.resolve(process.cwd(), '.env.local');
    const envContent = fs.readFileSync(envPath, 'utf8');
    const apiKey = envContent.match(/FRAMER_API_KEY=(.*)/)?.[1]?.trim();
    const projectId = envContent.match(/FRAMER_PROJECT_ID=(.*)/)?.[1]?.trim();

    try {
        const framer = await connect(`https://framer.com/projects/${projectId}`, apiKey);
        const collections = await framer.getCollections();
        const blogsCol = collections.find(c => c.id === 'y4HlWWxdS');

        const items = await blogsCol.getItems();
        if (items.length === 0) {
            console.log("❌ No items found to copy.");
            return;
        }

        const originalItem = items[0];
        console.log(`\n📋 CLONE TEST: Copying item "${originalItem.slug}"`);
        console.log("-----------------------------------------");

        const newItemPayload = {
            slug: `clone-test-${Date.now()}`,
            draft: true,
            fieldData: originalItem.fieldData // Use the EXACT keys Framer gave us
        };

        try {
            await blogsCol.addItems([newItemPayload]);
            console.log("✅ SUCCESS! The keys in originalItem.fieldData are correct.");
            console.log("The keys used were:", Object.keys(originalItem.fieldData));
        } catch (err) {
            console.log(`❌ CLONE FAILED: ${err.message}`);
        }

        await framer.disconnect();
    } catch (error) {
        console.error("❌ Error:", error.message);
    }
}

main();
