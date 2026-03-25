import * as admin from 'firebase-admin';
import path from 'path';
import fs from 'fs';

let db: admin.firestore.Firestore;

if (!admin.apps.length) {
    const credsEnv = process.env.GOOGLE_APPLICATION_CREDENTIALS;

    if (credsEnv && credsEnv.startsWith('{')) {
        // Netlify/Production: Use JSON string from Env
        const serviceAccount = JSON.parse(credsEnv);
        admin.initializeApp({
            credential: admin.credential.cert(serviceAccount)
        });
    } else {
        // Local Dev: Use physical file
        const credentialsPath = path.join(process.cwd(), 'credentials.json');
        if (fs.existsSync(credentialsPath)) {
            const serviceAccount = JSON.parse(fs.readFileSync(credentialsPath, 'utf8'));
            admin.initializeApp({
                credential: admin.credential.cert(serviceAccount)
            });
        } else {
            admin.initializeApp();
        }
    }
}

db = admin.firestore();
db.settings({ databaseId: 'blog-creation' });

export { db };
