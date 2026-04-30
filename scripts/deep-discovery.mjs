import { connect } from 'framer-api';
import fs from 'fs';
import path from 'path';
import util from 'util';

async function main() {
    const envPath = path.resolve(process.cwd(), '.env.local');
    const envContent = fs.readFileSync(envPath, 'utf8');
    const apiKey = envContent.match(/FRAMER_API_KEY=(.*)/)?.[1]?.trim();
    const projectId = "10xDS-AI--HWf6AK0krID40WbZhtbm-70z6O";

    try {
        const framer = await connect(`https://framer.com/projects/${projectId}`, apiKey);
        const collections = await framer.getCollections();
        const blogsCol = collections.find(c => c.id === 'y4HlWWxdS');

        const fields = await blogsCol.getFields();
        console.log("\n🕵️  DEEP DISCOVERY");
        console.log("-----------------------------------------");

        fields.forEach((f, i) => {
            console.log(`Field #${i + 1}: "${f.name}"`);
            console.log(`- ID: "${f.id}"`);
            // Print all keys of the object
            console.log("Internal Keys:", Object.keys(f));
            console.log('---');
        });

        await framer.disconnect();
    } catch (error) {
        console.error("❌ Error:", error.message);
    }
}

main();
