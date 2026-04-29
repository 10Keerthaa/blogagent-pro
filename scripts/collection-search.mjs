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

        console.log("\n🕵️  COLLECTION SEARCH: Finding 'Blog Head'");
        console.log("-----------------------------------------");

        for (const col of collections) {
            const fields = await col.getFields();
            const hasBlogHead = fields.some(f => f.name.includes("Blog Head"));
            
            if (hasBlogHead) {
                console.log(`🎯 FOUND IT!`);
                console.log(`Collection Name: "${col.name}"`);
                console.log(`Collection ID: "${col.id}"`);
                console.log(`Fields: ${fields.map(f => f.name).join(', ')}`);
            } else {
                console.log(`- Skipping "${col.name}" (No 'Blog Head' found)`);
            }
        }

        await framer.disconnect();
    } catch (error) {
        console.error("❌ Error:", error.message);
    }
}

main();
