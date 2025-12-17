import { useState, useEffect } from 'react';
import mqtt from 'mqtt';

const CONFIG = {
    mqtt: {
        protocol: 'wss',
        host: '09872002dac9410e9af391b1a7066483.s1.eu.hivemq.cloud',
        port: 8884,
        path: '/mqtt',
        username: 'naimur',
        password: 'Sohan786@',
        clientId: 'uiu-web-' + Math.random().toString(16).substr(2, 8)
    },
    topics: {
        location: 'uiu/bus/location',
        presence: 'uiu/presence'
    }
};

export const useMqttStats = () => {
    const [stats, setStats] = useState({
        totalUsers: 0,
        activeBuses: 0,
        isConnected: false
    });

    useEffect(() => {
        const client = mqtt.connect(`wss://${CONFIG.mqtt.host}:${CONFIG.mqtt.port}/mqtt`, {
            username: CONFIG.mqtt.username,
            password: CONFIG.mqtt.password,
            clientId: CONFIG.mqtt.clientId,
            clean: true
        });

        const activeUsers = new Map();
        const activeBuses = new Set();

        client.on('connect', () => {
            console.log('Connected to MQTT');
            setStats(prev => ({ ...prev, isConnected: true }));
            client.subscribe(CONFIG.topics.presence);
            client.subscribe(CONFIG.topics.location);
        });

        client.on('message', (topic, message) => {
            try {
                const data = JSON.parse(message.toString());
                const now = Date.now();

                if (topic === CONFIG.topics.presence) {
                    activeUsers.set(data.id, now);
                }
                else if (topic === CONFIG.topics.location) {
                    if (data.status !== 'offline') {
                        activeBuses.add(data.id);
                    } else {
                        activeBuses.delete(data.id);
                    }
                }

                // Cleanup stale users (older than 45s)
                for (const [id, ts] of activeUsers) {
                    if (now - ts > 45000) activeUsers.delete(id);
                }

                setStats(prev => ({
                    ...prev,
                    totalUsers: activeUsers.size,
                    activeBuses: activeBuses.size
                }));

            } catch (e) {
                console.error("MQTT Parse Error", e);
            }
        });

        return () => {
            client.end();
        };
    }, []);

    return stats;
};
