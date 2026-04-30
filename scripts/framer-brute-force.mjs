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

        const variations = [
            { key: "slug-title", label: "Gemini Hint" },
            { key: "Blog Head",  label: "Original" },
            { key: "blog-title", label: "Slug Title" },
            { key: "title",      label: "Standard" },
            { key: "Name",       label: "System Name" }
        ];

        console.log("\n🔥 BRUTE FORCE TEST: Finding the winning key");
        console.log("-----------------------------------------");

        for (const v of variations) {
            console.log(`Testing variation: ${v.label} ("${v.key}")`);
            try {
                const testSlug = `test-brute-${Date.now()}`;
                await blogsCol.addItems([{
                    slug: testSlug,
                    draft: true,
                    fieldData: {
                        [v.key]: { type: "string", value: "BRUTE SUCCESS", valueByLocale: {} },
                        "Content": { type: "formattedText", value: "Test", valueByLocale: {} }
                    }
                }]);
                console.log(`✅ SUCCESS! The winning key is: "${v.key}"`);
                process.exit(0);
            } catch (err) {
                console.log(`❌ Failed: ${err.message}`);
            }
        }

        await framer.disconnect();
    } catch (error) {
        console.error("❌ Error:", error.message);
    }
}

main();
