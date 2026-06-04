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

async function removeInvites() {
    const db = admin.firestore();
    try {
        db.settings({ databaseId: 'blog-creation' });
    } catch (e) {}

    console.log("Fetching all invites...");
    const snapshot = await db.collection('invited_users').get();

    if (snapshot.empty) {
        console.log('No invites found to remove.');
        return;
    }

    console.log(`Removing ${snapshot.size} invites...`);
    const batch = db.batch();
    snapshot.forEach(doc => {
        batch.delete(doc.ref);
        console.log(`- Queued deletion for: ${doc.id}`);
    });

    await batch.commit();
    console.log("Done. All invites removed.");
}

removeInvites().catch(console.error);
