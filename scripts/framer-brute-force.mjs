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

        console.log("\n🔨 BRUTE FORCE TEST: Finding the right Keys");
        console.log("-----------------------------------------");

        // We will try 4 different variations for the "Title" and "Content"
        const variations = [
            { titleKey: "Blog Head", contentKey: "Content" },
            { titleKey: "blog-head", contentKey: "content" },
            { titleKey: "title",     contentKey: "article" },
            { titleKey: "Title",     contentKey: "Body" }
        ];

        for (const v of variations) {
            console.log(`Testing variation: Title="${v.titleKey}", Content="${v.contentKey}"...`);
            try {
                const itemPayload = {
                    slug: `brute-force-${Date.now()}`,
                    draft: true,
                    fieldData: {
                        [v.titleKey]: { type: "string", value: "Brute Force Test" },
                        [v.contentKey]: { type: "formattedText", value: "<p>Testing...</p>" },
                        "H2Goeekmd": { type: "string", value: "SEO Test" } // Verified machine ID
                    }
                };
                await blogsCol.addItems([itemPayload]);
                console.log(`✅ SUCCESS! The keys are: "${v.titleKey}" and "${v.contentKey}"`);
                break; 
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
