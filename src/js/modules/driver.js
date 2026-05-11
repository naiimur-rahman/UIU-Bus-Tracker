import { CONFIG } from './config.js';
import { state } from './state.js';

export const requestWakeLock = async () => {
    if ('wakeLock' in navigator) {
        try {
            state.wakeLock = await navigator.wakeLock.request('screen');
            document.getElementById('wakelock-text').innerText = "Active";
            document.getElementById('wakelock-text').className = "text-green-500 font-bold";
            
            state.wakeLock.addEventListener('release', () => {
                document.getElementById('wakelock-text').innerText = "Inactive";
                document.getElementById('wakelock-text').className = "";
            });
        } catch (err) {
            console.error(`${err.name}, ${err.message}`);
        }
    }
};

export const releaseWakeLock = () => {
    if (state.wakeLock) {
        state.wakeLock.release();
        state.wakeLock = null;
    }
};

export const startBroadcast = (callbacks) => {
    if (!navigator.geolocation) {
        alert("Geolocation not supported");
        return;
    }
    
    try {
        state.isBroadcasting = true;
        callbacks.updateBroadcastUI(true);

        if (state.watchId) navigator.geolocation.clearWatch(state.watchId);
        state.currentSmoothedSpeed = 0;

        state.tripStartTime = Date.now();
        if (state.uptimeInterval) clearInterval(state.uptimeInterval);
        state.uptimeInterval = setInterval(() => {
            const diff = Math.floor((Date.now() - state.tripStartTime) / 1000);
            const m = Math.floor(diff / 60).toString().padStart(2, '0');
            const s = (diff % 60).toString().padStart(2, '0');
            const el = document.getElementById('val-uptime');
            if(el) el.innerText = `${m}:${s}`;
        }, 1000);

        requestWakeLock();

        const options = {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 0
        };

        let isFirstFix = true;

        state.watchId = navigator.geolocation.watchPosition(
            (position) => {
                if (!state.isBroadcasting) return;

                const { latitude, longitude, accuracy, speed } = position.coords;
                const now = Date.now();

                if (isFirstFix) {
                    let conflict = false;
                    const buses = Object.values(state.activeBuses);
                    
                    for (let bus of buses) {
                        if (bus.id === state.driverId) continue;
                        if (now - bus.ts > 60000) continue;
                        if (bus.route === state.driverRoute) {
                            const dist = callbacks.calculateDistance(latitude, longitude, bus.lat, bus.lng);
                            if (dist < 20) {
                                conflict = true; 
                                break;
                            }
                        }
                    }

                    if (conflict) {
                        alert("⚠️ Another Captain is active nearby in the same direction! Save your battery.");
                        callbacks.stopBroadcast();
                        return; 
                    }
                    isFirstFix = false; 
                }

                let rawSpeedKmh = (speed || 0) * 3.6;
                let alpha = state.currentSmoothedSpeed > rawSpeedKmh ? 0.6 : 0.15; 
                state.currentSmoothedSpeed = (state.currentSmoothedSpeed * (1 - alpha)) + (rawSpeedKmh * alpha);

                if (rawSpeedKmh < 0.2 && state.currentSmoothedSpeed < 2.0) {
                    state.currentSmoothedSpeed = 0;
                }

                const displaySpeed = state.currentSmoothedSpeed.toFixed(1);
                
                document.getElementById('val-speed').innerHTML = `${displaySpeed}<span class="text-[10px] ml-0.5 text-slate-400 font-sans">km/h</span>`;
                document.getElementById('val-accuracy').innerText = Math.round(accuracy) + 'm';

                if (state.driverMarker) {
                    state.driverMarker.setLatLng([latitude, longitude]);
                    if (state.driverMap) state.driverMap.panTo([latitude, longitude]);
                }

                state.lastLat = latitude;
                state.lastLng = longitude;

                if (now - state.lastSentTime < 200) return;
                state.lastSentTime = now;

                if (state.client && state.isConnected) {
                    const payload = JSON.stringify({
                        id: state.driverId,
                        uid: CONFIG.mqtt.clientId,
                        route: state.driverRoute,
                        username: state.driverUsername,
                        lat: latitude,
                        lng: longitude,
                        acc: accuracy,
                        speed: displaySpeed,
                        ts: now
                    });
                    state.client.publish(CONFIG.topics.location, payload, { retain: true });
                }
            },
            (error) => { console.error("GPS Error", error); },
            options
        );
    } catch (e) {
        console.error("Start Broadcast Error:", e);
        alert("Error starting trip. Please refresh.");
        state.isBroadcasting = false;
        callbacks.updateBroadcastUI(false);
    }
};

export const stopBroadcast = async (callbacks) => {
    state.isBroadcasting = false;
    callbacks.updateBroadcastUI(false);
    releaseWakeLock();
    
    if (state.driverId && state.activeBuses[state.driverId]) {
        delete state.activeBuses[state.driverId];
    }
    
    if (state.watchId) {
        navigator.geolocation.clearWatch(state.watchId);
        state.watchId = null;
    }

    if (state.uptimeInterval) {
        clearInterval(state.uptimeInterval);
        state.uptimeInterval = null;
    }
    const uptimeEl = document.getElementById('val-uptime');
    if(uptimeEl) uptimeEl.innerText = "00:00";

    if (state.client && state.isConnected) {
          state.client.publish(CONFIG.topics.location, JSON.stringify({
            id: state.driverId,
            status: 'offline'
          }), { retain: true });
    }

    callbacks.showSummary();
};

export const assignNextId = (prefix) => {
    const activeIds = Object.keys(state.activeBuses)
        .filter(id => id.startsWith(prefix))
        .map(id => parseInt(id.replace(prefix, '')))
        .filter(num => !isNaN(num))
        .sort((a, b) => a - b);

    let nextNum = 1;
    for (const num of activeIds) {
        if (num === nextNum) nextNum++;
        else if (num > nextNum) break;
    }
    return prefix + nextNum;
};

export const toggleBroadcast = (callbacks) => {
    if (state.isBroadcasting) callbacks.stopBroadcast();
    else callbacks.startBroadcast();
};
