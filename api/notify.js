import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const admin = require('firebase-admin');

// Initialize Firebase Admin (only once)
if (!admin.apps.length) {
    try {
        admin.initializeApp({
            credential: admin.credential.cert({
                projectId: process.env.FIREBASE_PROJECT_ID,
                clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
                privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n')
            }),
            databaseURL: "https://bustrackernaimur-default-rtdb.firebaseio.com"
        });
    } catch (error) {
        console.error('Firebase Admin Init Error:', error.message);
    }
}

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    try {
        const { busRoute, busDirection, secretKey } = req.body;

        if (secretKey !== process.env.API_SECRET_KEY) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        // Fetch all FCM tokens from Realtime Database
        const db = admin.database();
        const tokensSnapshot = await db.ref('fcm_tokens').once('value');
        const tokensObj = tokensSnapshot.val();

        if (!tokensObj) {
            return res.status(200).json({ message: 'No subscribers found.' });
        }

        const tokens = Object.keys(tokensObj);

        // Map route name to readable name
        const routeNames = { 'K': 'Kuril', 'N': 'Notun Bazar', 'A': 'Aftab Nagar' };
        const routePrefix = busRoute ? busRoute.charAt(0) : '';
        const readableRoute = routeNames[routePrefix] || 'UIU';

        let readableDirection = "started its trip";
        if (busDirection && busDirection.includes('To UIU')) readableDirection = "heading to UIU";
        if (busDirection && busDirection.includes('From UIU')) readableDirection = "leaving UIU";

        // Send in chunks of 500 (Firebase limit)
        let successCount = 0;
        let failureCount = 0;
        const chunkSize = 500;

        for (let i = 0; i < tokens.length; i += chunkSize) {
            const chunk = tokens.slice(i, i + chunkSize);
            const message = {
                notification: {
                    title: '🚌 UIU Shuttle is on the move!',
                    body: `The ${readableRoute} shuttle is ${readableDirection}. Track it live now!`,
                },
                android: {
                    priority: 'high',
                    notification: { sound: 'default', channelId: 'default' }
                },
                tokens: chunk
            };
            const response = await admin.messaging().sendEachForMulticast(message);
            successCount += response.successCount;
            failureCount += response.failureCount;

            // Auto-cleanup invalid/expired tokens
            response.responses.forEach((resp, idx) => {
                if (!resp.success) {
                    const errCode = resp.error?.code;
                    if (errCode === 'messaging/invalid-registration-token' ||
                        errCode === 'messaging/registration-token-not-registered') {
                        db.ref(`fcm_tokens/${chunk[idx]}`).remove().catch(() => {});
                    }
                }
            });
        }

        return res.status(200).json({
            success: true,
            message: `Sent to ${successCount} devices, failed ${failureCount}`
        });

    } catch (error) {
        console.error('Notify API Error:', error.message);
        return res.status(500).json({ error: 'Internal server error', detail: error.message });
    }
}
