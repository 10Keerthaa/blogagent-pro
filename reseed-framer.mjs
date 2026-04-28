import fs from 'fs';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const admin = require('firebase-admin');

async function reseedFramer() {
    try {
        const credentialsPath = 'c:/Users/KeerthanaJossy/ai-blog-platform/credentials.json';
        const serviceAccount = require(credentialsPath);
        if (!admin.apps.length) {
            admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
        }
        const db = admin.firestore();
        db.settings({ databaseId: 'blog-creation' });
        
        const framerUrls = [
            "https://www.10xds.ai/",
            "https://www.10xds.ai/blogs",
            "https://www.10xds.ai/about-us",
            "https://www.10xds.ai/voice-agent",
            "https://www.10xds.ai/solutions/whatsapp-solutions",
            "https://www.10xds.ai/solutions/10xds-tax-compliance-platform",
            "https://www.10xds.ai/products/ai-voice-agent-for-debt-collection",
            "https://www.10xds.ai/products/recruitment-voice-agent",
            "https://www.10xds.ai/products/ai-voice-agents-for-hr-teams",
            "https://www.10xds.ai/products/ai-voice-collection-agent",
            "https://www.10xds.ai/products/companioncare"
        ];

        console.log("Seeding sitemap-cache-framer with 10 correct URLs...");
        await db.collection('config').doc('sitemap-cache-framer').set({
            discoveredUrls: framerUrls,
            lastDiscovery: Date.now(),
            crawledUrls: [],
            anchorMap: {},
            keywordMap: {},
            timestamp: Date.now()
        }, { merge: true });

        console.log("✅ Seed complete. Now triggering AI Crawl...");
        
        const resp = await fetch('http://localhost:3000/api/sitemap-urls?platform=framer');
        if (resp.ok) {
            const data = await resp.json();
            console.log(`✅ AI Crawl complete. Unique Keywords: ${Object.keys(data.anchorMap || {}).length}`);
        } else {
            console.error("Crawl trigger failed:", await resp.text());
        }

    } catch (err) {
        console.error("Reseed failed:", err.message);
    }
}

reseedFramer();
