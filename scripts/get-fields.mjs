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
        
        if (!blogsCol) {
            console.error("Collection not found");
            return;
        }

        const fields = await blogsCol.getFields();
        console.log(JSON.stringify(fields, null, 2));

        await framer.disconnect();
    } catch (error) {
        console.error("❌ TEST FAILED:", error.message);
    }
}

main();
