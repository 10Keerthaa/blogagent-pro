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

async function listAuthUsers() {
    try {
        const listUsersResult = await admin.auth().listUsers(1000);
        listUsersResult.users.forEach((userRecord) => {
            if (userRecord.email && userRecord.email.includes('athira')) {
                console.log('Found Auth User:', userRecord.toJSON());
            }
        });
    } catch (error) {
        console.log('Error listing users:', error);
    }
}

listAuthUsers();
