const admin = require('firebase-admin');
const path = require('path');
const fs = require('fs');

async function checkDatabase() {
    const credentialsPath = path.join(process.cwd(), 'credentials.json');
    const serviceAccount = JSON.parse(fs.readFileSync(credentialsPath, 'utf8'));

    if (!admin.apps.length) {
        admin.initializeApp({
            credential: admin.credential.cert(serviceAccount)
        });
    }

    const db = admin.firestore();
    try {
        db.settings({ databaseId: 'blog-creation' });
    } catch (e) {}

    console.log('--- Checking invited_users ---');
    const invitesSnap = await db.collection('invited_users').get();
    if (invitesSnap.empty) {
        console.log('No invites found.');
    } else {
        invitesSnap.forEach(doc => {
            console.log(`- ${doc.id}:`, doc.data());
        });
    }

    console.log('\n--- Checking system_config/init ---');
    const initDoc = await db.collection('system_config').doc('init').get();
    if (initDoc.exists) {
        console.log('system_config/init EXISTS:', initDoc.data());
    } else {
        console.log('system_config/init DOES NOT EXIST');
    }
}

checkDatabase().catch(err => console.error(err));
