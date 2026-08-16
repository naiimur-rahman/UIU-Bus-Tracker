import { initializeApp } from "firebase/app";
import { getDatabase, ref, set, onValue, onDisconnect, remove, update } from "firebase/database";
import { getAuth, signInAnonymously } from "firebase/auth";
import { CONFIG } from './config.js';
import { state } from './state.js';

let db;

export const connect = async (callbacks) => {
    try {
        const app = initializeApp(CONFIG.firebase);
        const auth = getAuth(app);
        db = getDatabase(app);

        await signInAnonymously(auth);
        callbacks.onConnect();

        // Listen for all bus locations
        const locationsRef = ref(db, CONFIG.paths.locations);
        onValue(locationsRef, (snapshot) => {
            callbacks.onLocationSnapshot(snapshot.val() || {});
        });

        // Listen for presence (user count)
        const presenceRef = ref(db, CONFIG.paths.presence);
        onValue(presenceRef, (snapshot) => {
            callbacks.onPresenceSnapshot(snapshot.val() || {});
        });

    } catch (error) {
        console.error("Firebase Connection Error:", error);
        callbacks.onDisconnect('error');
    }
};

export const sendLocation = async (busData) => {
    if (!db) return;
    const busRef = ref(db, `${CONFIG.paths.locations}/${busData.id}`);
    return set(busRef, busData);
};

export const stopLocation = async (busId) => {
    if (!db) return;
    const busRef = ref(db, `${CONFIG.paths.locations}/${busId}`);
    return remove(busRef);
};

export const sendHeartbeat = async () => {
    if (!db || !state.userId) return;
    const userRef = ref(db, `${CONFIG.paths.presence}/${state.userId}`);
    onDisconnect(userRef).remove();
    return set(userRef, Date.now());
};

export const setDriverStatus = async (busId, type, value) => {
    if (!db) return;
    const busRef = ref(db, `${CONFIG.paths.locations}/${busId}`);
    const updates = {};
    updates[type] = value;
    return update(busRef, updates);
};

export const requestNotificationPermission = async (vapidKey) => {
    try {
        const isNative = (typeof window !== 'undefined' && window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform()) ||
                         (typeof Capacitor !== 'undefined' && Capacitor.isNativePlatform && Capacitor.isNativePlatform());

        if (isNative) {
            console.log("Using Native Capacitor Push Notifications...");
            const { PushNotifications } = await import('@capacitor/push-notifications');
            
            let permStatus = await PushNotifications.checkPermissions();
            if (permStatus.receive === 'prompt' || permStatus.receive === 'prompt-with-rationale') {
                permStatus = await PushNotifications.requestPermissions();
            }

            if (permStatus.receive !== 'granted') {
                console.log('User denied Native Push permissions');
                return null;
            }
            
            return new Promise((resolve) => {
                const timeout = setTimeout(() => {
                    console.warn("FCM registration timed out");
                    resolve(null);
                }, 12000);

                PushNotifications.addListener('registration', async (token) => {
                    clearTimeout(timeout);
                    const fcmToken = token.value;
                    console.log('Native FCM Token retrieved:', fcmToken);
                    if (db) {
                        const tokenRef = ref(db, `fcm_tokens/${fcmToken}`);
                        await set(tokenRef, true);
                    }
                    resolve(fcmToken);
                });
                
                PushNotifications.addListener('registrationError', (error) => {
                    clearTimeout(timeout);
                    console.error('Error on Native registration:', error);
                    resolve(null);
                });

                PushNotifications.addListener('pushNotificationReceived', (notification) => {
                    console.log('Foreground push notification received:', notification);
                });

                PushNotifications.register();
            });
        }

        // --- Web Push Fallback ---
        if (typeof Notification === 'undefined') {
            console.warn('Notifications not supported in this environment');
            return null;
        }

        const { getMessaging, getToken, onMessage } = await import("firebase/messaging");
        const app = initializeApp(CONFIG.firebase);
        const messaging = getMessaging(app);
        
        console.log('Requesting Web notification permission...');
        const permission = await Notification.requestPermission();
        if (permission === 'granted') {
            console.log('Web Notification permission granted.');
            const currentToken = await getToken(messaging, { vapidKey });
            if (currentToken) {
                console.log('Web FCM Token retrieved');
                if (db) {
                    const tokenRef = ref(db, `fcm_tokens/${currentToken}`);
                    await set(tokenRef, true);
                }
                
                onMessage(messaging, (payload) => {
                    console.log('Foreground Web Message received: ', payload);
                    if (payload.notification) {
                        alert(`🚌 ${payload.notification.title}\n\n${payload.notification.body}`);
                    }
                });

                return currentToken;
            } else {
                console.log('No Web registration token available.');
            }
        } else {
            console.log('Unable to get permission to notify on Web.');
        }
    } catch (err) {
        console.error('An error occurred while retrieving notification token: ', err);
    }
    return null;
};

export const disableNotificationPermission = async (token) => {
    if (!token || !db) return false;
    try {
        const tokenRef = ref(db, `fcm_tokens/${token}`);
        await remove(tokenRef);
        return true;
    } catch (err) {
        console.error('Error removing token: ', err);
        return false;
    }
};
