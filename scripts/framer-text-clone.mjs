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
        const originalItem = items[0];

        console.log(`\n🧪 TEXT-ONLY CLONE TEST: "${originalItem.slug}"`);
        console.log("-----------------------------------------");

        // We only keep the keys that have "string" or "formattedText" types
        const cleanFieldData = {};
        for (const [key, val] of Object.entries(originalItem.fieldData)) {
            if (val && typeof val === 'object' && (val.type === 'string' || val.type === 'formattedText')) {
                cleanFieldData[key] = val;
            }
        }

        const newItemPayload = {
            slug: `text-clone-${Date.now()}`,
            draft: true,
            fieldData: cleanFieldData
        };

        try {
            await blogsCol.addItems([newItemPayload]);
            console.log("✅ SUCCESS! Text keys are verified.");
            console.log("Verified Keys:", Object.keys(cleanFieldData));
        } catch (err) {
            console.log(`❌ FAILED: ${err.message}`);
        }

        await framer.disconnect();
    } catch (error) {
        console.error("❌ Error:", error.message);
    }
}

main();
