const admin = require('firebase-admin');
const path = require('path');
const fs = require('fs');

const credentialsPath = path.join(process.cwd(), 'credentials.json');
const serviceAccount = JSON.parse(fs.readFileSync(credentialsPath, 'utf8'));

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}

async function restoreNeeraj() {
    const db = admin.firestore();
    try {
        db.settings({ databaseId: 'blog-creation' });
    } catch (e) {}

    const email = 'neeraj.r@10xds.com';
    const uid = 'sW7G8KN6Q1RifZ3NckaIljJYHJr1';

    console.log(`--- Restoring ${email} as Admin ---`);

    try {
        await db.collection('user_profiles').doc(uid).set({
            email: email,
            full_name: 'Neeraj R',
            role: 'admin',
            created_at: new Date().toISOString()
        });
        console.log("SUCCESS: Neeraj restored to user_profiles as Admin.");
    } catch (error) {
        console.error("FAILED to restore Neeraj:", error);
    }
}

restoreNeeraj();
