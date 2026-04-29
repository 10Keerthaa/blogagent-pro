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

        if (!blogsCol) {
            console.error("❌ Could not find Blogs collection with ID y4HlWWxdS");
            return;
        }

        console.log(`\n🔍 Inspecting Collection: "${blogsCol.name}"`);
        console.log("-----------------------------------------");

        const fields = await blogsCol.getFields();
        console.log(`✅ Found ${fields.length} Fields:`);
        
        // Sort fields alphabetically by name for readability
        const sortedFields = [...fields].sort((a, b) => a.name.localeCompare(b.name));

        sortedFields.forEach((f, i) => {
            console.log(`${String(i + 1).padStart(2, ' ')}. [Type: ${f.type.padEnd(14)}]  Name: "${f.name.padEnd(20)}"  --> ID: "${f.id}"`);
        });

        await framer.disconnect();
    } catch (error) {
        console.error("❌ Error:", error.message);
    }
}

main();
