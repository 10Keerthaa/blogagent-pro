import { getGoogleAuth } from './lib/googleAuth';
import { db } from './lib/firebaseAdmin';
import fs from 'fs';
import path from 'path';

const envStr = fs.readFileSync(path.resolve(process.cwd(), '.env.local'), 'utf8');
envStr.split('\n').forEach(line => {
    const match = line.match(/^([^=]+)=(.*)$/);
    if (match) {
        let val = match[2].trim();
        if (val.startsWith('"') && val.endsWith('"')) val = val.slice(1, -1);
        if (val.startsWith("'") && val.endsWith("'")) val = val.slice(1, -1);
        val = val.replace(/\\n/g, '\n');
        process.env[match[1].trim()] = val;
    }
});

async function checkDatabases() {
    console.log("=== CHECKING INTERNAL LINKING DATABASES ===");
    
    try {
        const wp = await db.collection('config').doc('sitemap-cache').get();
        const wpData = wp.data() || {};
        console.log("WP Sitemap Cache size:", Object.keys(wpData.keywordMap || {}).length);
        
        const wpFramer = await db.collection('config').doc('sitemap-cache-framer').get();
        const framerData = wpFramer.data() || {};
        console.log("Framer Sitemap Cache size:", Object.keys(framerData.keywordMap || {}).length);
        
        const pk = await db.collection('page_knowledge').get();
        console.log("Page Knowledge DB size:", pk.size);
        
        const pk_framer = await db.collection('page_knowledge_framer').get();
        console.log("Framer Page Knowledge DB size:", pk_framer.size);
    } catch (e) {
        console.error("DB check failed:", e);
    }
}
checkDatabases();
