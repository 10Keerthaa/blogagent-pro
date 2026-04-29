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
        const item = items[0];

        console.log("\n📐 SHAPE CHECK: Inspecting Field Structure");
        console.log("-----------------------------------------");
        console.log(`Item Slug: "${item.slug}"`);
        
        // Print the EXACT structure of every field
        console.log(JSON.stringify(item.fieldData, null, 2));

        await framer.disconnect();
    } catch (error) {
        console.error("❌ Error:", error.message);
    }
}

main();
