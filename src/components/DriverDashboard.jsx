import React, { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import confetti from 'canvas-confetti';
import { CONFIG } from '../utils/constants';
import { calculateDistance, playBeep } from '../utils/helpers';

const MapController = ({ mapRef, startCoords, isBroadcasting }) => {
  const map = useMap();
  useEffect(() => {
    mapRef.current = map;
    const jumpBtn = L.control({position: 'bottomright'});
    jumpBtn.onAdd = function() {
        const div = L.DomUtil.create('div', 'leaflet-bar leaflet-control');
        const a = L.DomUtil.create('a', '', div);
        a.href = '#';
        a.title = 'Jump to UIU';
        a.innerHTML = '<i class="fas fa-university"></i>';
        a.onclick = (e) => {
          e.preventDefault();
          map.setView(CONFIG.uiuCoords, 16);
        }
        return div;
    };
    jumpBtn.addTo(map);

    return () => {
      jumpBtn.remove();
    }
  }, [map, mapRef]);

  useEffect(() => {
    if (!isBroadcasting && startCoords) {
      map.setView(startCoords, 13);
    }
  }, [isBroadcasting, startCoords, map]);

  return null;
};

const driverIcon = L.divIcon({
  className: '',
  html: `<div class="bg-blue-600 w-6 h-6 rounded-full border-2 border-white shadow-lg flex items-center justify-center relative pulse-ring"><div class="w-2 h-2 bg-white rounded-full"></div></div>`,
  iconSize: [24, 24]
});

const DriverDashboard = ({ goHome, driverInfo, client, isConnected, activeBuses, theme }) => {
  const [isBroadcasting, setIsBroadcasting] = useState(false);
  const [speed, setSpeed] = useState('0.0');
  const [accuracy, setAccuracy] = useState('--');
  const [uptime, setUptime] = useState('00:00');
  const [wakeLock, setWakeLock] = useState(null);
  const [showSummary, setShowSummary] = useState(false);
  const [currentLocation, setCurrentLocation] = useState(null);

  const mapRef = useRef(null);
  const watchIdRef = useRef(null);
  const uptimeIntervalRef = useRef(null);
  const smoothedSpeedRef = useRef(0);
  const tripStartTimeRef = useRef(null);
  const lastSentTimeRef = useRef(0);

  const COORDS = {
    'UIU': CONFIG.uiuCoords,
    'Kuril': [23.822339, 90.420163],
    'Notun Bazar': [23.797881, 90.424652],
    'Aftab Nagar': [23.767860, 90.425833],
    'Transport': CONFIG.uiuCoords
  };

  const startCoords = driverInfo.direction === 'From UIU' ? COORDS['UIU'] : (COORDS[driverInfo.destination] || COORDS['Transport']);
  const endCoords = driverInfo.direction === 'From UIU' ? (COORDS[driverInfo.destination] || COORDS['Transport']) : COORDS['UIU'];

  const requestWakeLock = async () => {
    if ('wakeLock' in navigator) {
      try {
        const lock = await navigator.wakeLock.request('screen');
        setWakeLock(lock);
        lock.addEventListener('release', () => {
          setWakeLock(null);
        });
      } catch (err) {
        console.error(`${err.name}, ${err.message}`);
      }
    }
  };

  const releaseWakeLock = () => {
    if (wakeLock) {
      wakeLock.release();
      setWakeLock(null);
    }
  };

  const stopBroadcastCallback = async () => {
    playBeep('stop');
    setIsBroadcasting(false);
    releaseWakeLock();

    if (watchIdRef.current) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    if (uptimeIntervalRef.current) {
      clearInterval(uptimeIntervalRef.current);
      uptimeIntervalRef.current = null;
    }
    setUptime('00:00');
    setSpeed('0.0');
    setAccuracy('--');

    if (client && isConnected) {
      client.publish(CONFIG.topics.location, JSON.stringify({
        id: driverInfo.id, status: 'offline'
      }), { retain: true });
    }

    setShowSummary(true);
    confetti({ particleCount: 150, spread: 70, origin: { y: 0.6 } });
  };

  const handleStartBroadcast = () => {
    if (!navigator.geolocation) { alert("Geolocation not supported"); return; }

    playBeep('start');
    setIsBroadcasting(true);
    smoothedSpeedRef.current = 0;
    tripStartTimeRef.current = Date.now();

    if (uptimeIntervalRef.current) clearInterval(uptimeIntervalRef.current);
    uptimeIntervalRef.current = setInterval(() => {
        const diff = Math.floor((Date.now() - tripStartTimeRef.current) / 1000);
        const m = Math.floor(diff / 60).toString().padStart(2, '0');
        const s = (diff % 60).toString().padStart(2, '0');
        setUptime(`${m}:${s}`);
    }, 1000);

    requestWakeLock();

    let isFirstFix = true;
    watchIdRef.current = navigator.geolocation.watchPosition(
      (position) => {
          const { latitude, longitude, accuracy: locAcc, speed: locSpeed } = position.coords;
          const now = Date.now();

          if (isFirstFix) {
              let conflict = false;
              const buses = Object.values(activeBuses);
              for (let bus of buses) {
                  if (bus.id === driverInfo.id) continue;
                  if (now - bus.ts > 60000) continue;
                  if (bus.route === driverInfo.route) {
                      const dist = calculateDistance(latitude, longitude, bus.lat, bus.lng);
                      if (dist < 20) { conflict = true; break; }
                  }
              }
              if (conflict) {
                  alert("⚠️ Another Captain is active nearby in the same direction! Save your battery.");
                  stopBroadcastCallback();
                  return;
              }
              isFirstFix = false;
          }

          let rawSpeedKmh = (locSpeed || 0) * 3.6;
          let alpha = 0.15;
          if (smoothedSpeedRef.current > rawSpeedKmh) alpha = 0.6;
          smoothedSpeedRef.current = (smoothedSpeedRef.current * (1 - alpha)) + (rawSpeedKmh * alpha);
          if (rawSpeedKmh < 0.2 && smoothedSpeedRef.current < 2.0) smoothedSpeedRef.current = 0;

          const displaySpeed = smoothedSpeedRef.current.toFixed(1);
          setSpeed(displaySpeed);
          setAccuracy(Math.round(locAcc) + 'm');
          setCurrentLocation([latitude, longitude]);

          if (mapRef.current) {
            mapRef.current.panTo([latitude, longitude]);
          }

          if (now - lastSentTimeRef.current < 200) return;
          lastSentTimeRef.current = now;

          if (client && isConnected) {
              const payload = JSON.stringify({
                  id: driverInfo.id,
                  uid: CONFIG.mqtt.clientId,
                  route: driverInfo.route,
                  username: driverInfo.username,
                  lat: latitude,
                  lng: longitude,
                  acc: locAcc,
                  speed: displaySpeed,
                  ts: now
              });
              client.publish(CONFIG.topics.location, payload, { retain: true });
          }
      },
      (error) => { console.error("GPS Error", error); playBeep('stop'); },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  const toggleBroadcast = () => {
    if (isBroadcasting) {
      stopBroadcastCallback();
    } else {
      handleStartBroadcast();
    }
  };

  const closeSummary = () => {
    confetti.reset();
    setShowSummary(false);
    goHome(false);
  };

  useEffect(() => {
    // Cleanup on unmount
    return () => {
      if (watchIdRef.current) navigator.geolocation.clearWatch(watchIdRef.current);
      if (uptimeIntervalRef.current) clearInterval(uptimeIntervalRef.current);
      if (wakeLock) wakeLock.release();
    };
  }, []);

  return (
    <div className="flex flex-col h-full bg-slate-50 dark:bg-slate-900 w-full relative">
      <div className="absolute top-0 left-0 right-0 p-4 z-30 flex justify-between items-start pointer-events-none">
        <div className="pointer-events-auto">
              <button onClick={() => goHome(isBroadcasting, stopBroadcastCallback)} className="w-10 h-10 rounded-full glass bg-slate-900/50 text-white flex items-center justify-center hover:scale-110 transition-transform">
                <i className="fas fa-power-off"></i>
            </button>
        </div>
        <div className="glass bg-slate-900/80 text-white px-4 py-2 rounded-xl text-right backdrop-blur-md">
              <div className="flex items-center justify-end gap-2 mb-1">
                <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.6)]' : 'bg-red-500'}`}></span>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{isConnected ? 'ONLINE' : 'OFFLINE'}</span>
            </div>
            <div className="text-xs text-slate-400">ID: <span className="text-brand-500 font-mono font-bold">{driverInfo.route} [{driverInfo.id}]</span></div>
            {driverInfo.username && (
              <div className="text-[10px] text-slate-400 mt-0.5 text-right font-medium">
                <span className="text-white">{driverInfo.username}</span>
              </div>
            )}
            <div className="text-[10px] text-slate-500 mt-0.5 flex justify-end items-center gap-1">
                  <i className={`fas fa-lightbulb ${wakeLock ? 'text-green-500' : 'text-slate-600'}`}></i>
                  {wakeLock && <span>On</span>}
            </div>
        </div>
      </div>

      <div className="h-[60%] w-full relative z-0">
        <MapContainer
          center={startCoords}
          zoom={13}
          zoomControl={false}
          style={{ height: '100%', width: '100%' }}
        >
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution="&copy; OSM"
            className={theme === 'dark' ? 'dark-map-tiles' : ''}
          />
          <MapController mapRef={mapRef} startCoords={startCoords} isBroadcasting={isBroadcasting} />

          {!isBroadcasting && (
            <>
              <Marker position={startCoords}><Popup>Start</Popup></Marker>
              <Marker position={endCoords}><Popup>End</Popup></Marker>
            </>
          )}

          <Marker position={currentLocation || startCoords} icon={driverIcon} />
        </MapContainer>
        <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-slate-50 dark:from-slate-900 to-transparent pointer-events-none z-[400]"></div>
      </div>

      <div className="flex-grow flex flex-col items-center justify-start p-6 -mt-12 relative z-20 overflow-y-auto">
        <div className="glass w-full max-w-sm rounded-3xl p-6 shadow-xl text-center backdrop-blur-xl border border-white/20">
            <div className="flex items-center justify-between mb-6">
                  <div className="text-left">
                    <h2 className="text-xl font-bold">{isBroadcasting ? 'Broadcasting' : 'Ready to Drive?'}</h2>
                    <p className="text-slate-500 text-xs">Start trip to broadcast</p>
                  </div>
                  <div className="w-12 h-12 rounded-full border-2 border-slate-200 dark:border-slate-600 flex items-center justify-center relative">
                    <div className={`absolute inset-0 rounded-full animate-pulse-glow transition-opacity ${isBroadcasting ? 'opacity-100 bg-green-400' : 'opacity-0'}`}></div>
                    <i className={`fas fa-location-arrow transition-colors ${isBroadcasting ? 'text-green-500' : 'text-slate-300 dark:text-slate-600'}`}></i>
                </div>
            </div>

            <button onClick={toggleBroadcast} className={`w-full font-bold py-5 rounded-2xl active:translate-y-[2px] transition-all duration-150 mb-4 relative z-50 uppercase tracking-widest text-sm border-b-4 active:border-b-0 text-white shadow-[0_10px_20px_-5px_rgba(249,115,22,0.4),0_4px_6px_-2px_rgba(0,0,0,0.1),inset_0_2px_0_rgba(255,255,255,0.2)] active:shadow-[inset_0_4px_8px_rgba(0,0,0,0.2)] ${isBroadcasting ? 'bg-gradient-to-b from-red-500 to-red-600 hover:from-red-400 hover:to-red-500 border-red-900/20 animate-pulse' : 'bg-gradient-to-b from-brand-500 to-brand-600 hover:from-brand-400 hover:to-brand-500 border-brand-900/20'}`}>
                {isBroadcasting ? 'STOP TRIP' : 'START TRIP'}
            </button>
        </div>

        <div className="grid grid-cols-3 gap-3 w-full max-w-sm mt-6 px-2">
            <div className="glass p-3 rounded-xl text-center flex flex-col items-center justify-center border border-slate-200/50 dark:border-slate-700/50 bg-slate-100/30 dark:bg-slate-800/30 relative overflow-hidden group">
                <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent pointer-events-none"></div>
                <p className="text-[9px] text-slate-400 uppercase font-bold tracking-widest mb-1">Speed</p>
                <p className="text-xl font-mono font-bold text-slate-700 dark:text-slate-100 tracking-tighter">{speed}<span className="text-[10px] ml-0.5 text-slate-400 font-sans">km/h</span></p>
            </div>
            <div className="glass p-3 rounded-xl text-center flex flex-col items-center justify-center border border-slate-200/50 dark:border-slate-700/50 bg-slate-100/30 dark:bg-slate-800/30 relative overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent pointer-events-none"></div>
                <p className="text-[9px] text-slate-400 uppercase font-bold tracking-widest mb-1">GPS</p>
                <p className="text-xl font-mono font-bold text-slate-700 dark:text-slate-100 tracking-tighter">{accuracy}</p>
            </div>
            <div className="glass p-3 rounded-xl text-center flex flex-col items-center justify-center border border-slate-200/50 dark:border-slate-700/50 bg-slate-100/30 dark:bg-slate-800/30 relative overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent pointer-events-none"></div>
                <p className="text-[9px] text-slate-400 uppercase font-bold tracking-widest mb-1">Time</p>
                <p className="text-xl font-mono font-bold text-slate-700 dark:text-slate-100 tracking-tighter">{uptime}</p>
            </div>
        </div>
      </div>

      <div className={`absolute inset-0 bg-slate-900/95 flex flex-col items-center justify-center transition-opacity duration-500 ${showSummary ? 'opacity-100 z-50 pointer-events-auto' : 'opacity-0 z-[-1] pointer-events-none'}`}>
          <div className="w-32 h-32 bg-gradient-to-tr from-brand-500 to-yellow-500 rounded-full flex items-center justify-center mb-6 animate-bounce shadow-[0_0_50px_rgba(249,115,22,0.5)]">
              <i className="fas fa-heart text-6xl text-white"></i>
          </div>
          <h2 className="text-4xl font-black text-white mb-2 text-center">Thank You!</h2>
          <p className="text-slate-400 mb-8 text-center px-4 max-w-xs">Thanks for your Contribution.<br/>It means a lot for us.</p>

          <button onClick={closeSummary} className="mt-4 px-8 py-3 bg-white text-brand-600 font-bold rounded-full hover:scale-105 transition-transform shadow-lg shadow-white/20">
              Close
          </button>
      </div>
    </div>
  );
};

export default DriverDashboard;
