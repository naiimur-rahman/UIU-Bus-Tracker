require('dotenv').config({ path: '.env.local' });
const admin = require('firebase-admin');

// 1. Initialize Admin
admin.initializeApp({
    credential: admin.credential.cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n')
    }),
    databaseURL: "https://bustrackernaimur-default-rtdb.firebaseio.com"
});

async function testPush() {
    console.log('Fetching tokens...');
    const db = admin.database();
    const tokensSnapshot = await db.ref('fcm_tokens').once('value');
    const tokensObj = tokensSnapshot.val();

    if (!tokensObj) {
        console.log('No subscribers found in database.');
        process.exit(0);
    }

    const tokens = Object.keys(tokensObj);
    console.log(`Found ${tokens.length} subscribers. Sending test push...`);

    const message = {
        notification: {
            title: 'UIU Shuttle is on the move!',
            body: `This is a LIVE TEST from local! The Kuril shuttle is heading to UIU.`,
        },
        tokens: tokens
    };

    try {
        const response = await admin.messaging().sendEachForMulticast(message);
        console.log(`Success: ${response.successCount}, Failed: ${response.failureCount}`);
        
        if (response.failureCount > 0) {
            response.responses.forEach((resp, idx) => {
                if (!resp.success) {
                    console.error(`Token ${tokens[idx]} failed:`, resp.error);
                }
            });
        }
    } catch (e) {
        console.error('Crash:', e);
    }
    process.exit(0);
}

testPush();
