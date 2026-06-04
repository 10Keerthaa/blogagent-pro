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

async function listInvites() {
    const db = admin.firestore();
    try {
        db.settings({ databaseId: 'blog-creation' });
    } catch (e) {}

    console.log("Checking 'invited_users' collection...");
    const snapshot = await db.collection('invited_users').get();
    
    if (snapshot.empty) {
        console.log('No active invites found.');
        return;
    }

    console.log('Active Invites:');
    snapshot.forEach(doc => {
        console.log(`- ${doc.id} (Role: ${doc.data().role || 'not set'})`);
    });
}

listInvites().catch(console.error);
