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

        console.log(`\n🔎 KEY HUNT: Testing update on "${item.slug}"`);
        console.log("-----------------------------------------");

        const guesses = ["Blog Head", "title", "Title", "blog_head", "blogHead"];
        
        for (const key of guesses) {
            console.log(`Trying Key: "${key}"...`);
            try {
                await (item as any).update({
                    fieldData: {
                        [key]: { type: "string", value: "Update Test" }
                    }
                });
                console.log(`🎯 FOUND IT! The key is: "${key}"`);
                break;
            } catch (err) {
                console.log(`❌ No: ${err.message}`);
            }
        }

        await framer.disconnect();
    } catch (error) {
        console.error("❌ Error:", error.message);
    }
}

main();
