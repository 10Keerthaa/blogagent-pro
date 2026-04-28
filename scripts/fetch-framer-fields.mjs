import { connect } from 'framer-api';
import { readFileSync } from 'fs';

// Read API key and project ID from .env.local
const env = readFileSync('.env.local', 'utf-8');
const getEnv = (key) => {
    const match = env.match(new RegExp(`^${key}=(.+)$`, 'm'));
    return match ? match[1].trim() : null;
};

const apiKey = getEnv('FRAMER_API_KEY');
const projectId = getEnv('FRAMER_PROJECT_ID');

if (!apiKey || !projectId) {
    console.error('Missing FRAMER_API_KEY or FRAMER_PROJECT_ID in .env.local');
    process.exit(1);
}

const projectUrl = `https://framer.com/projects/${projectId}`;
console.log(`\nConnecting to Framer project: ${projectUrl}\n`);

try {
    const framer = await connect(projectUrl, apiKey);
    
    console.log('✅ Connected! Fetching collections...\n');
    
    const collections = await framer.getCollections();
    
    for (const collection of collections) {
        console.log(`\n📁 Collection: "${collection.name}" (ID: ${collection.id})`);
        console.log('─'.repeat(60));
        
        const fields = await collection.getFields();
        for (const field of fields) {
            console.log(`  Field: "${field.name}"  →  slug: "${field.slug || field.id}"  type: ${field.type}`);
        }
    }
    
    await framer.disconnect();
    console.log('\n✅ Done! Use the slugs above in the fieldData object.\n');
} catch (err) {
    console.error('❌ Error:', err.message || err);
    process.exit(1);
}
