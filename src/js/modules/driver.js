import { CONFIG } from './config.js';
import { state } from './state.js';
import { Geolocation } from '@capacitor/geolocation';
import { Capacitor } from '@capacitor/core';
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

export const startBroadcast = async (callbacks) => {
    
    try {
        state.isBroadcasting = true;
        callbacks.updateBroadcastUI(true);

        if (state.watchId) {
            await Geolocation.clearWatch({ id: state.watchId });
        }
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

        const isNative = (typeof window !== 'undefined' && window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform()) ||
                         (typeof Capacitor !== 'undefined' && Capacitor.isNativePlatform && Capacitor.isNativePlatform());

        if (isNative) {
            try {
                // Request Notification Permission for Android 13+
                const { PushNotifications } = await import('@capacitor/push-notifications');
                let permStatus = await PushNotifications.checkPermissions();
                if (permStatus.receive === 'prompt' || permStatus.receive === 'prompt-with-rationale') {
                    await PushNotifications.requestPermissions();
                }

                const { ForegroundService } = await import('@capawesome-team/capacitor-android-foreground-service');
                await ForegroundService.startForegroundService({
                    id: 1001,
                    title: 'UIU Bus Tracker',
                    body: 'Location broadcasting is active.',
                    smallIcon: 'ic_stat_tracker'
                });
            } catch (fsErr) {
                console.error("Foreground Service start failed:", fsErr);
            }
        }

        state.watchId = await Geolocation.watchPosition(options, (position, err) => {
            if (err || !position) return;
            if (!state.isBroadcasting) return;

                const { latitude, longitude, accuracy, speed } = position.coords;
                const now = Date.now();

                // 1. Filter out poor accuracy fixes to prevent jumping
                if (accuracy > 80) return; 

                if (isFirstFix) {
                    let conflict = false;
                    const buses = Object.values(state.activeBuses);
                    for (let bus of buses) {
                        if (bus.id === state.driverId) continue;
                        if (now - bus.ts > 60000) continue;
                        if (bus.route === state.driverRoute) {
                            const dist = callbacks.calculateDistance(latitude, longitude, bus.lat, bus.lng);
                            if (dist < 20) { conflict = true; break; }
                        }
                    }
                    if (conflict) {
                        alert("⚠️ Another Captain is active nearby in the same direction!");
                        callbacks.stopBroadcast();
                        return; 
                    }
                    isFirstFix = false; 
                    
                    // Trigger Push Notifications to all students
                    try {
                        fetch('/api/notify.cjs', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                busRoute: state.driverRoute,
                                busDirection: state.driverDirection,
                                secretKey: 'bus_tracker_secret_2026'
                            })
                        }).catch(e => console.error('Failed to trigger notifications', e));
                    } catch (e) { }
                }

                // 2. Hybrid Speed Calculation
                let rawSpeedKmh = 0;
                if (speed !== null && speed !== undefined && speed > 0) {
                    rawSpeedKmh = speed * 3.6;
                } else if (state.lastLat && state.lastLng) {
                    // Fallback: Distance / Time
                    const distMeters = callbacks.calculateDistance(latitude, longitude, state.lastLat, state.lastLng);
                    const timeSec = (now - (state.lastLocationTime || now - 1000)) / 1000;
                    if (timeSec > 0.5 && distMeters < 200) { // Filter out unrealistic jumps
                        rawSpeedKmh = (distMeters / timeSec) * 3.6;
                    }
                }

                // 3. Precision Smoothing (Faster reaction to acceleration)
                let alpha = rawSpeedKmh > state.currentSmoothedSpeed ? 0.4 : 0.2;
                state.currentSmoothedSpeed = (state.currentSmoothedSpeed * (1 - alpha)) + (rawSpeedKmh * alpha);

                // 4. Dead-zone & UI Update
                if (state.currentSmoothedSpeed < 1.5) state.currentSmoothedSpeed = 0;
                const displaySpeed = state.currentSmoothedSpeed.toFixed(1);
                
                document.getElementById('val-speed').innerHTML = `${displaySpeed}<span class="text-[10px] ml-0.5 text-slate-400 font-sans">km/h</span>`;
                document.getElementById('val-accuracy').innerText = Math.round(accuracy) + 'm';

                if (state.driverMarker) {
                    state.driverMarker.setLatLng([latitude, longitude]);
                    if (state.driverMap && state.isFollowingDriver) {
                        state.driverMap.panTo([latitude, longitude]);
                    }
                }

                state.lastLat = latitude;
                state.lastLng = longitude;
                state.lastLocationTime = now;

                if (now - state.lastSentTime < 800 && Math.abs(rawSpeedKmh - state.lastSentSpeed) < 2) return;
                state.lastSentTime = now;
                state.lastSentSpeed = rawSpeedKmh;

                callbacks.sendLocation({
                    id: state.driverId,
                    route: state.driverRoute,
                    username: state.driverUsername,
                    lat: latitude,
                    lng: longitude,
                    acc: accuracy,
                    speed: displaySpeed,
                    cap: state.driverCap,
                    msg: state.driverMsg,
                    ts: now
                });
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
    
    if (state.driverId) {
        callbacks.stopLocation(state.driverId);
        if (state.activeBuses[state.driverId]) delete state.activeBuses[state.driverId];
    }
    
    if (state.watchId) {
        Geolocation.clearWatch({ id: state.watchId });
        state.watchId = null;
    }

    const isNative = (typeof window !== 'undefined' && window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform()) ||
                     (typeof Capacitor !== 'undefined' && Capacitor.isNativePlatform && Capacitor.isNativePlatform());

    if (isNative) {
        try {
            const { ForegroundService } = await import('@capawesome-team/capacitor-android-foreground-service');
            await ForegroundService.stopForegroundService();
        } catch (fsErr) {
            console.error("Foreground Service stop failed:", fsErr);
        }
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
