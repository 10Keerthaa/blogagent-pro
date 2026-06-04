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

async function listUsers() {
    console.log("Listing last 10 Firebase Auth users...");
    const listUsersResult = await admin.auth().listUsers(10);
    listUsersResult.users.forEach((userRecord) => {
        console.log(`- UID: ${userRecord.uid}, Email: ${userRecord.email}, Name: ${userRecord.displayName}`);
    });
}

listUsers().catch(console.error);
