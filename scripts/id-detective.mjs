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
            const item = items[0];
            console.log("\n🕵️  ID DETECTIVE: Extracting True Keys");
            console.log("-----------------------------------------");
            console.log("Here are the REAL keys being used in your CMS right now:");
            
            Object.keys(item.fieldData).forEach(key => {
                console.log(` - Found Key: "${key}"`);
            });
        } else {
            console.log("⚠️ No items found to inspect.");
        }

        await framer.disconnect();
    } catch (error) {
        console.error("❌ Error:", error.message);
    }
}

main();
