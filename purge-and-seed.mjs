import fs from 'fs';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const admin = require('firebase-admin');

async function purgeAndSeed() {
    try {
        const credentialsPath = 'c:/Users/KeerthanaJossy/ai-blog-platform/credentials.json';
        const serviceAccount = require(credentialsPath);
        if (!admin.apps.length) {
            admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
        }
        const db = admin.firestore();
        db.settings({ databaseId: 'blog-creation' });
        
        console.log("Purging sitemap-cache-framer...");
        await db.collection('config').doc('sitemap-cache-framer').delete();
        console.log("✅ Purge complete.");

        console.log("Triggering Fresh Framer Discovery...");
        const resp = await fetch('http://localhost:3000/api/sitemap-urls?platform=framer');
        if (resp.ok) {
            const data = await resp.json();
            console.log(`✅ Discovery complete. Discovered ${data.discoveredUrls?.length || 0} URLs.`);
            console.log(`✅ AI Crawl complete. Indexed ${data.crawledUrls?.length || 0} URLs.`);
        } else {
            console.error("Discovery trigger failed:", await resp.text());
        }

    } catch (err) {
        console.error("Purge failed:", err.message);
    }
}

purgeAndSeed();
