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
        console.log("\n🕵️  SUPER DETECTIVE: Finding Hidden Slugs");
        console.log("-----------------------------------------");

        fields.forEach(f => {
            console.log(`Field Name: "${f.name}"`);
            console.log(`  - id property: "${f.id}"`);
            
            // Check every possible property name
            const allProps = Object.getOwnPropertyNames(f);
            allProps.forEach(prop => {
                if (prop !== 'name' && prop !== 'id') {
                    console.log(`  - ${prop}: "${f[prop]}"`);
                }
            });
            console.log('---');
        });

        await framer.disconnect();
    } catch (error) {
        console.error("❌ Error:", error.message);
    }
}

main();
