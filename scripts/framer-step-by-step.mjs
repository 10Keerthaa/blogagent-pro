import { connect } from 'framer-api';
import fs from 'fs';
import path from 'path';

async function main() {
    console.log("Step 1: Reading environment variables...");
    const envPath = path.resolve(process.cwd(), '.env.local');
    if (!fs.existsSync(envPath)) {
        console.error("❌ .env.local not found!");
        return;
    }

    const envContent = fs.readFileSync(envPath, 'utf8');
    const apiKey = envContent.match(/FRAMER_API_KEY=(.*)/)?.[1]?.trim();
    const projectId = envContent.match(/FRAMER_PROJECT_ID=(.*)/)?.[1]?.trim();

    if (!apiKey || !projectId) {
        console.error("❌ Missing FRAMER_API_KEY or FRAMER_PROJECT_ID in .env.local");
        return;
    }

    console.log(`Step 2: Connecting to Framer Project (${projectId})...`);
    try {
        const framer = await connect(`https://framer.com/projects/${projectId}`, apiKey);
        console.log("✅ Connection Successful!");

        console.log("Step 3: Fetching Collections...");
        const collections = await framer.getCollections();
        
        if (collections.length === 0) {
            console.log("⚠️ No collections found in this project.");
        } else {
            console.log(`✅ Found ${collections.length} Collections:`);
            collections.forEach((c, i) => {
                console.log(`   ${i + 1}. Name: "${c.name}" (ID: ${c.id})`);
            });
        }

        await framer.disconnect();
        console.log("\n🏁 Done.");
    } catch (error) {
        console.error("❌ Failed to connect to Framer:", error.message);
    }
}

main();
