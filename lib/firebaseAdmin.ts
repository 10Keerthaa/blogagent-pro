import * as admin from 'firebase-admin';
import path from 'path';
import fs from 'fs';

let db: admin.firestore.Firestore;

if (!admin.apps.length) {
    const credentialsPath = path.join(process.cwd(), 'credentials.json');
    if (fs.existsSync(credentialsPath)) {
        const serviceAccount = JSON.parse(fs.readFileSync(credentialsPath, 'utf8'));
        admin.initializeApp({
            credential: admin.credential.cert(serviceAccount)
        });
    } else {
        // Fallback for default credential behavior if strictly needed
        admin.initializeApp();
    }
}

db = admin.firestore();
db.settings({ databaseId: 'blog-creation' });

export { db };
