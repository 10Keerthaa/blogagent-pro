import fs from 'fs';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const admin = require('firebase-admin');

async function checkStatus() {
    try {
        const credentialsPath = 'c:/Users/KeerthanaJossy/ai-blog-platform/credentials.json';
        const serviceAccount = require(credentialsPath);
        if (!admin.apps.length) {
            admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
        }
        const db = admin.firestore();
        db.settings({ databaseId: 'blog-creation' });
        
        console.log("\n--- FRAMER CACHE (sitemap-cache-framer) ---");
        const framerDoc = await db.collection('config').doc('sitemap-cache-framer').get();
        if (framerDoc.exists) {
            const data = framerDoc.data();
            const unique = [...new Set(data.crawledUrls || [])];
            console.log(`Unique Crawled: ${unique.length}`);
            console.log(`First 5:`);
            unique.slice(0, 5).forEach(u => console.log(`  - ${u}`));
        } else {
            console.log("Does not exist.");
        }

        console.log("\n--- WORDPRESS CACHE (sitemap-cache) ---");
        const wpDoc = await db.collection('config').doc('sitemap-cache').get();
        if (wpDoc.exists) {
            const data = wpDoc.data();
            const unique = [...new Set(data.crawledUrls || [])];
            console.log(`Unique Crawled: ${unique.length}`);
            console.log(`First 5:`);
            unique.slice(0, 5).forEach(u => console.log(`  - ${u}`));
        } else {
            console.log("Does not exist.");
        }

    } catch (err) {
        console.error("Status check failed:", err.message);
    }
}

checkStatus();
