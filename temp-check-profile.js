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

async function checkProfile() {
    const db = admin.firestore();
    try {
        db.settings({ databaseId: 'blog-creation' });
    } catch (e) {}

    const email = 'keerthana.jossy@pp.tenxds.in';
    console.log(`Searching profile for ${email}...`);
    
    const snapshot = await db.collection('user_profiles').where('email', '==', email).get();
    
    if (snapshot.empty) {
        console.log('No profile found yet.');
        return;
    }

    snapshot.forEach(doc => {
        console.log(`UID: ${doc.id}`);
        console.log(`Data:`, doc.data());
    });
}

checkProfile().catch(console.error);
