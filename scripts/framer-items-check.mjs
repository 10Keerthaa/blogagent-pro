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

        console.log(`\n📄 Checking items in: "${blogsCol.name}"`);
        console.log("-----------------------------------------");

        const items = await blogsCol.getItems();
        console.log(`✅ Total items found: ${items.length}`);
        
        if (items.length === 0) {
            console.log("⚠️ The collection is empty.");
        } else {
            console.log("\nLatest 5 Items:");
            // Items are usually returned in order, we take the last 5 (most recent)
            items.slice(-5).reverse().forEach((item, i) => {
                const title = item.fieldData["Blog Head"] || item.fieldData["H2Goeekmd"] || "No Title";
                console.log(`${i + 1}. [${item.draft ? 'DRAFT' : 'PUBLISHED'}] Slug: "${item.slug}"`);
                console.log(`   Title: "${title}"`);
                console.log(`   ID: ${item.id}`);
                console.log('---');
            });
        }

        await framer.disconnect();
    } catch (error) {
        console.error("❌ Error:", error.message);
    }
}

main();
