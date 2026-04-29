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

        const fields = await blogsCol.getFields();
        console.log("\n🕵️  ULTIMATE SCAN: Finding Machine IDs");
        console.log("-----------------------------------------");

        fields.forEach(f => {
            console.log(`Field: "${f.name}"`);
            console.log(`  - id: "${f.id}"`);
            
            for (const key in f) {
                const val = f[key];
                if (typeof val === 'string' && val.length === 9 && val !== f.id) {
                    console.log(`  - 🚀 POTENTIAL MACHINE ID (${key}): "${val}"`);
                }
            }
            console.log('---');
        });

        await framer.disconnect();
    } catch (error) {
        console.error("❌ Error:", error.message);
    }
}

main();
