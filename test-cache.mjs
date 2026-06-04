import { readFileSync } from 'fs';
import admin from 'firebase-admin';
import path from 'path';

const envPath = path.resolve('.env.local');
const envStr = readFileSync(envPath, 'utf8');
const pkey = envStr.match(/FIREBASE_PRIVATE_KEY="(.*?)"/s)[1].replace(/\\n/g, '\n');
const cEmail = envStr.match(/FIREBASE_CLIENT_EMAIL=(.*)/)[1].trim();
const pId = envStr.match(/FIREBASE_PROJECT_ID=(.*)/)[1].trim();

admin.initializeApp({ credential: admin.credential.cert({ projectId: pId, clientEmail: cEmail, privateKey: pkey }) });

async function run() {
  try {
    const wp = await admin.firestore().collection('config').doc('sitemap-cache').get();
    console.log("WP Sitemap Cache size:", Object.keys(wp.data()?.keywordMap || {}).length);
    
    const pk = await admin.firestore().collection('page_knowledge').get();
    console.log("Page Knowledge DB size:", pk.size);
    
    const pk_framer = await admin.firestore().collection('page_knowledge_framer').get();
    console.log("Framer Page Knowledge DB size:", pk_framer.size);
  } catch(e) {
    console.error(e);
  }
  process.exit(0);
}
run();
