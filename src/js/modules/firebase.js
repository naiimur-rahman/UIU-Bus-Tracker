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
    
    // Set up auto-cleanup if driver disconnects
    onDisconnect(busRef).remove();
    
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
