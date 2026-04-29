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

        const timestamp = Date.now();
        const testTitle = "🚀 FINAL TEST: Success!";
        const testSlug = `final-success-test-${timestamp}`;

        console.log(`\n📤 Publishing item: "${testTitle}"...`);

        const itemPayload = {
            slug: testSlug,
            draft: false,
            fieldData: {
                "Blog Head": { type: "string", value: testTitle },
                "Content": { type: "formattedText", value: "<h1>Fixed!</h1><p>Mapping verified.</p>" },
                "Category": { type: "string", value: "General" },
                "Description": { type: "string", value: "Validation complete." },
                "H2Goeekmd": { type: "string", value: testTitle },
                "g6sVmWkbx": { type: "string", value: "SEO verified." }
            }
        };

        const newItems = await blogsCol.addItems([itemPayload]);
        console.log(`✅ Success! Item ID: ${newItems[0].id}`);
        
        console.log("📡 Publishing site...");
        await framer.publish();
        console.log("✅ LIVE.");

        await framer.disconnect();
    } catch (error) {
        console.error("❌ Test Failed:", error.message);
    }
}

main();
