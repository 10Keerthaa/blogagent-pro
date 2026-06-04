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

async function listAllProfiles() {
    const db = admin.firestore();
    try {
        db.settings({ databaseId: 'blog-creation' });
    } catch (e) {}

    console.log("Listing all user profiles...");
    const snapshot = await db.collection('user_profiles').get();
    
    if (snapshot.empty) {
        console.log('No profiles found.');
        return;
    }

    snapshot.forEach(doc => {
        const data = doc.data();
        console.log(`- UID: ${doc.id}, Email: ${data.email}, Name: ${data.displayName}, Role: ${data.role}`);
    });
}

listAllProfiles().catch(console.error);
