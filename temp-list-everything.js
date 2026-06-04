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

async function listEverything() {
    const db = admin.firestore();
    try {
        db.settings({ databaseId: 'blog-creation' });
    } catch (e) {}

    console.log("--- Collection: user_profiles ---");
    const profiles = await db.collection('user_profiles').get();
    profiles.forEach(doc => console.log(`- ${doc.data().email || doc.id} (Role: ${doc.data().role})`));

    console.log("\n--- Collection: invited_users ---");
    const invites = await db.collection('invited_users').get();
    invites.forEach(doc => console.log(`- ${doc.id} (Role: ${doc.data().role})`));
}

listEverything().catch(console.error);
