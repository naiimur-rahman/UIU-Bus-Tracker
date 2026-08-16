import admin from 'firebase-admin';

// Initialize Firebase Admin (only once)
if (!admin.apps.length) {
    try {
        admin.initializeApp({
            credential: admin.credential.cert({
                projectId: process.env.FIREBASE_PROJECT_ID,
                clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
                // Replace escaped newlines in private key
                privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n')
            }),
            databaseURL: "https://bustrackernaimur-default-rtdb.firebaseio.com"
        });
    } catch (error) {
        console.error('Firebase Admin Init Error:', error);
    }
}

export default async function handler(req, res) {
    // 1. CORS headers to allow frontend requests
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { busRoute, busDirection, secretKey } = req.body;

        // 2. Simple security check (Add this variable in Vercel)
        if (secretKey !== process.env.API_SECRET_KEY) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        // 3. Fetch all FCM tokens from Realtime Database
        const db = admin.database();
        const tokensSnapshot = await db.ref('fcm_tokens').once('value');
        const tokensObj = tokensSnapshot.val();

        if (!tokensObj) {
            return res.status(200).json({ message: 'No subscribers found.' });
        }

        const tokens = Object.keys(tokensObj);

        // 4. Map the short route code to a readable name
        const routeNames = {
            'K': 'Kuril',
            'N': 'Notun Bazar',
            'A': 'Aftab Nagar',
            'default': 'UIU'
        };
        const readableRoute = routeNames[busRoute] || 'UIU';
        
        // Map direction
        let readableDirection = "started its trip";
        if (busDirection === 'to_uiu') readableDirection = "heading to UIU";
        if (busDirection === 'from_uiu') readableDirection = "leaving UIU";

        // 5. Construct payload
        const message = {
            notification: {
                title: 'UIU Shuttle is on the move!',
                body: `The ${readableRoute} shuttle is ${readableDirection}. Track it live now!`,
            },
            tokens: tokens
        };

        // 6. Send multicast message
        // Note: Firebase limit is 500 tokens per sendMulticast call. 
        // For production with thousands, you'd chunk the 'tokens' array into groups of 500.
        let successCount = 0;
        let failureCount = 0;

        const chunkSize = 500;
        for (let i = 0; i < tokens.length; i += chunkSize) {
            const chunk = tokens.slice(i, i + chunkSize);
            message.tokens = chunk;
            
            const response = await admin.messaging().sendEachForMulticast(message);
            successCount += response.successCount;
            failureCount += response.failureCount;
        }

        return res.status(200).json({ 
            success: true, 
            message: `Sent to ${successCount} devices, failed ${failureCount}` 
        });

    } catch (error) {
        console.error('Error sending notification:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
}
