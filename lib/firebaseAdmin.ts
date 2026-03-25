import * as admin from 'firebase-admin';
import path from 'path';
import fs from 'fs';

let db: admin.firestore.Firestore;

if (!admin.apps.length) {
    let credsEnv = process.env.GOOGLE_APPLICATION_CREDENTIALS;

    try {
        if (credsEnv) {
            // 1. Handle Base64 (Vercel common practice)
            if (!credsEnv.startsWith('{')) {
                try {
                    const decoded = Buffer.from(credsEnv, 'base64').toString('utf8');
                    if (decoded.startsWith('{')) credsEnv = decoded;
                } catch (e) { }
            }

            // 2. Sanitize and Parse
            const sanitized = (credsEnv || '').trim().replace(/[\n\r]/g, '');
            if (sanitized.startsWith('{')) {
                const serviceAccount = JSON.parse(sanitized);
                admin.initializeApp({
                    credential: admin.credential.cert(serviceAccount)
                });
            }
        }

        // Fallback for Local Dev or if Env failed
        if (!admin.apps.length) {
            const credentialsPath = path.join(process.cwd(), 'credentials.json');
            if (fs.existsSync(credentialsPath)) {
                const serviceAccount = JSON.parse(fs.readFileSync(credentialsPath, 'utf8'));
                admin.initializeApp({
                    credential: admin.credential.cert(serviceAccount)
                });
            } else {
                // Last resort: initialize with default or empty
                admin.initializeApp();
            }
        }
    } catch (err) {
        console.error("Firebase Admin hard crash prevented during init:", err);
        if (!admin.apps.length) admin.initializeApp(); // Minimal fallback to avoid "app not found" errors later
    }
}

db = admin.firestore();
db.settings({ databaseId: 'blog-creation' });

export { db };
