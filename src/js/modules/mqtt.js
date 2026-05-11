import { CONFIG } from './config.js';
import { state } from './state.js';

export const connectMqtt = (callbacks) => {
    console.log("Connecting to MQTT...");
    const connectUrl = `wss://${CONFIG.mqtt.host}:${CONFIG.mqtt.port}/mqtt`;
    
    state.client = mqtt.connect(connectUrl, {
        username: CONFIG.mqtt.username,
        password: CONFIG.mqtt.password,
        clientId: CONFIG.mqtt.clientId,
        clean: true
    });

    state.client.on('connect', () => {
        console.log("MQTT Connected");
        if (state.connectionDebounce) clearTimeout(state.connectionDebounce);
        state.isConnected = true;
        callbacks.onConnect();
        state.client.subscribe(CONFIG.topics.location);
        state.client.subscribe(CONFIG.topics.presence);
        callbacks.sendHeartbeat();
    });

    state.client.on('message', (topic, message) => {
        const msgString = message.toString();
        if (!msgString) return;
        try {
            const data = JSON.parse(msgString);
            if (topic === CONFIG.topics.location) {
                callbacks.onLocationUpdate(data);
            } else if (topic === CONFIG.topics.presence) {
                callbacks.onPresenceUpdate(data);
            }
        } catch (e) { console.error("Msg Parse Error:", e); }
    });

    state.client.on('error', (err) => {
        console.error("MQTT Error", err);
        if (state.connectionDebounce) clearTimeout(state.connectionDebounce);
        state.connectionDebounce = setTimeout(() => {
            state.isConnected = false;
            callbacks.onDisconnect('error');
        }, 2000);
    });
    
    state.client.on('close', () => {
        if (state.connectionDebounce) clearTimeout(state.connectionDebounce);
        state.connectionDebounce = setTimeout(() => {
            state.isConnected = false;
            callbacks.onDisconnect('offline');
        }, 2000);
    });
};

export const sendHeartbeat = () => {
    if (state.client && state.isConnected) {
        state.client.publish(CONFIG.topics.presence, JSON.stringify({
            id: CONFIG.mqtt.clientId,
            ts: Date.now(),
            role: state.role || 'viewer'
        }));
    }
};
