import dotenv from 'dotenv';
import admin from 'firebase-admin';
import path from 'path';

dotenv.config({ path: path.resolve('.env.local') });

const pkey = process.env.FIREBASE_PRIVATE_KEY ? process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n') : '';
const cEmail = process.env.FIREBASE_CLIENT_EMAIL;
const pId = process.env.FIREBASE_PROJECT_ID;

if (!admin.apps.length) {
    admin.initializeApp({ credential: admin.credential.cert({ projectId: pId, clientEmail: cEmail, privateKey: pkey }) });
}

async function run() {
  try {
    const wp = await admin.firestore().collection('config').doc('sitemap-cache').get();
    console.log("WP Sitemap Cache size:", Object.keys(wp.data()?.keywordMap || {}).length);
    
    const pk = await admin.firestore().collection('page_knowledge').get();
    console.log("Page Knowledge DB size:", pk.size);
    
    const pk_framer = await admin.firestore().collection('page_knowledge_framer').get();
    console.log("Framer Page Knowledge DB size:", pk_framer.size);
  } catch(e) {
    console.error("Error:", e.message);
  }
  process.exit(0);
}
run();
