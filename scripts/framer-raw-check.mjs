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
        if (items.length > 0) {
            const item = items[items.length - 1]; // Get the very last one
            console.log("\nRAW DATA FOR ITEM:", item.slug);
            console.log("-----------------------------------------");
            console.log("Draft Status:", item.draft);
            console.log("Field Data (JSON):", JSON.stringify(item.fieldData, null, 2));
        }

        await framer.disconnect();
    } catch (error) {
        console.error("❌ Error:", error.message);
    }
}

main();
