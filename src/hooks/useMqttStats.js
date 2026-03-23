import { useState, useEffect, useCallback, useRef } from 'react';
import mqtt from 'mqtt';
import { CONFIG } from '../utils/constants';

export function useMqttStats(role, password = null) {
  const [client, setClient] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [activeBuses, setActiveBuses] = useState({});
  const [activeUsers, setActiveUsers] = useState(new Map());

  const activeUsersRef = useRef(new Map());
  const activeBusesRef = useRef({});

  const connectMqtt = useCallback(() => {
    if (client) return;

    // For student fallback if not provided
    const pass = password || 'Sohan786@';

    const connectUrl = `${CONFIG.mqtt.protocol}://${CONFIG.mqtt.host}:${CONFIG.mqtt.port}${CONFIG.mqtt.path}`;
    const mqttClient = mqtt.connect(connectUrl, {
        username: CONFIG.mqtt.username,
        password: pass,
        clientId: CONFIG.mqtt.clientId,
        clean: true
    });

    mqttClient.on('connect', () => {
      console.log("MQTT Connected");
      setIsConnected(true);
      mqttClient.subscribe(CONFIG.topics.location);
      mqttClient.subscribe(CONFIG.topics.presence);

      // Send initial heartbeat
      mqttClient.publish(CONFIG.topics.presence, JSON.stringify({
          id: CONFIG.mqtt.clientId,
          ts: Date.now(),
          role: role || 'viewer'
      }));
    });

    mqttClient.on('message', (topic, message) => {
      const msgString = message.toString();
      if (!msgString) return;
      try {
        const data = JSON.parse(msgString);
        if (topic === CONFIG.topics.location) {
          handleLocationUpdate(data);
        } else if (topic === CONFIG.topics.presence) {
          handlePresenceUpdate(data);
        }
      } catch (e) {
        console.error("Msg Parse Error:", e);
      }
    });

    mqttClient.on('error', (err) => {
      console.error("MQTT Error", err);
      setIsConnected(false);
    });

    mqttClient.on('close', () => {
      setIsConnected(false);
    });

    setClient(mqttClient);
  }, [client, password, role]);

  const handlePresenceUpdate = (data) => {
    activeUsersRef.current.set(data.id, data.ts);
    // Force re-render for UI updates
    setActiveUsers(new Map(activeUsersRef.current));
  };

  const handleLocationUpdate = (data) => {
    if (data.status === 'offline') {
      const currentBuses = { ...activeBusesRef.current };
      delete currentBuses[data.id];
      activeBusesRef.current = currentBuses;
      setActiveBuses(currentBuses);
      return;
    }

    const timeDiff = Date.now() - data.ts;
    if (timeDiff > 120000) return;

    const currentBuses = { ...activeBusesRef.current };
    currentBuses[data.id] = data;
    activeBusesRef.current = currentBuses;
    setActiveBuses(currentBuses);
  };

  useEffect(() => {
    // Heartbeat interval
    const heartbeatInterval = setInterval(() => {
      if (client && isConnected) {
        client.publish(CONFIG.topics.presence, JSON.stringify({
            id: CONFIG.mqtt.clientId,
            ts: Date.now(),
            role: role || 'viewer'
        }));
      }
    }, CONFIG.presenceInterval);

    // Cleanup stale users/buses interval
    const cleanupInterval = setInterval(() => {
      const now = Date.now();

      // Clean users
      const currentUsers = new Map(activeUsersRef.current);
      let usersChanged = false;
      for (const [id, ts] of currentUsers) {
          if (now - ts > 45000) {
            currentUsers.delete(id);
            usersChanged = true;
          }
      }
      if (usersChanged) {
        activeUsersRef.current = currentUsers;
        setActiveUsers(currentUsers);
      }

      // Clean buses
      const currentBuses = { ...activeBusesRef.current };
      let busesChanged = false;
      for (const id in currentBuses) {
          if (now - currentBuses[id].ts > 300000) { // 5 mins dead
              delete currentBuses[id];
              busesChanged = true;
          }
      }
      if (busesChanged) {
        activeBusesRef.current = currentBuses;
        setActiveBuses(currentBuses);
      }

    }, 10000);

    return () => {
      clearInterval(heartbeatInterval);
      clearInterval(cleanupInterval);
    };
  }, [client, isConnected, role]);

  const disconnectMqtt = useCallback(() => {
    if (client) {
      client.end();
      setClient(null);
      setIsConnected(false);
    }
  }, [client]);

  return { client, isConnected, activeBuses, activeUsers, connectMqtt, disconnectMqtt };
}
