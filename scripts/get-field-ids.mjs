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

        for (const col of collections) {
            if (col.id === "y4HlWWxdS") {
                const fields = await col.getFields();
                console.log(`Fields for collection ${col.name} (${col.id}):`);
                for (const f of fields) {
                    console.log(`- Name: "${f.name}", ID: "${f.id}", Type: "${f.type}"`);
                }
            }
        }

        await framer.disconnect();
    } catch (error) {
        console.error("❌ Error:", error.message);
    }
}

main();
