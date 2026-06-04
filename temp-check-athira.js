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

async function checkAthira() {
    const db = admin.firestore();
    try {
        db.settings({ databaseId: 'blog-creation' });
    } catch (e) {}

    console.log("Checking user_profiles...");
    const profiles = await db.collection('user_profiles').get();
    profiles.forEach(doc => {
        const data = doc.data();
        if (data.email && data.email.includes('athira')) {
            console.log(`Found in user_profiles -> ID: ${doc.id}, Data:`, data);
        }
    });

    console.log("Checking invited_users...");
    const invites = await db.collection('invited_users').get();
    invites.forEach(doc => {
        if (doc.id.includes('athira')) {
            console.log(`Found in invited_users -> ID: ${doc.id}, Data:`, doc.data());
        }
    });

    console.log("Checking notifications...");
    const notifs = await db.collection('notifications').get();
    notifs.forEach(doc => {
        const data = doc.data();
        if (data.message && data.message.includes('athira')) {
            console.log(`Found in notifications -> ID: ${doc.id}, Data:`, data);
        }
    });
}

checkAthira().catch(console.error);
