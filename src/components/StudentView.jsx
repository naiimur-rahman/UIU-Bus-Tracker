import React, { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Circle, useMap } from 'react-leaflet';
import L from 'leaflet';
import { CONFIG, BUS_STYLES } from '../utils/constants';
import { calculateDistance, escapeHtml } from '../utils/helpers';

// Helper to pan map
const SetViewOnClick = ({ coords, zoom }) => {
  const map = useMap();
  useEffect(() => {
    map.setView(coords, zoom);
  }, [coords, map, zoom]);
  return null;
};

const MapController = ({ mapRef }) => {
  const map = useMap();
  useEffect(() => {
    mapRef.current = map;

    // Custom Jump to UIU button
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
  return null;
};

const createBusIcon = (id, colorClass, isStale) => {
  return L.divIcon({
     className: 'custom-bus-pin',
     html: `
         <div class="${colorClass} ${isStale ? 'grayscale opacity-70' : ''} w-10 h-10 rounded-full flex items-center justify-center text-white font-bold border-2 border-white shadow-lg relative z-10 transition-all duration-500">
             ${id}
             <div class="absolute -bottom-1 left-1/2 -translate-x-1/2 w-3 h-3 ${colorClass} rotate-45 z-0"></div>
         </div>
     `,
     iconSize: [40, 48],
     iconAnchor: [20, 48],
     popupAnchor: [0, -48]
 });
};

const uiuIcon = L.divIcon({ className: '', html: '<div class="text-2xl">🎓</div>', iconSize: [30, 30] });

const StudentView = ({ goHome, activeBuses, activeUsersCount, isConnected, theme }) => {
  const [studentLocation, setStudentLocation] = useState(null);
  const [bottomSheetOpen, setBottomSheetOpen] = useState(false);
  const mapRef = useRef(null);

  const busesArray = Object.values(activeBuses);

  useEffect(() => {
    let watchId;
    if (navigator.geolocation) {
      watchId = navigator.geolocation.watchPosition(
        (pos) => { setStudentLocation(pos.coords); },
        (err) => console.log("Student GPS denied"),
        { enableHighAccuracy: true }
      );
    }
    return () => {
      if (watchId) navigator.geolocation.clearWatch(watchId);
    };
  }, []);

  const focusBus = (bus) => {
    if (mapRef.current) {
      mapRef.current.setView([bus.lat, bus.lng], 16);
      setBottomSheetOpen(false);
    }
  };

  return (
    <div className="flex flex-col h-full z-10 w-full relative">
      <div className="absolute top-4 left-4 right-16 z-[400]">
        <div className="glass rounded-full p-2 pl-4 pr-2 flex justify-between items-center shadow-lg">
          <div className="flex items-center gap-3">
            <button onClick={goHome} className="w-8 h-8 bg-slate-100 dark:bg-slate-700 rounded-full flex items-center justify-center text-slate-600 dark:text-slate-300 hover:bg-brand-500 hover:text-white transition-colors">
              <i className="fas fa-arrow-left"></i>
            </button>
            <div>
              <h2 className="font-bold text-sm leading-tight">Live Map</h2>
              <div className="flex items-center gap-2 text-[10px] text-slate-500 dark:text-slate-400">
                <span className="flex items-center gap-1"><i className="fas fa-users"></i> <span>{activeUsersCount}</span></span>
                <span className="flex items-center gap-1"><i className="fas fa-bus"></i> <span>{busesArray.length}</span></span>
              </div>
            </div>
          </div>
          <div className={`px-3 py-1 rounded-full text-[10px] font-bold flex items-center gap-2 ${isConnected ? 'text-green-600 bg-green-100' : 'text-slate-500 bg-slate-100 dark:bg-slate-800'}`}>
            <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500 animate-pulse' : 'bg-red-400'}`}></div> {isConnected ? 'Live' : 'Connect'}
          </div>
        </div>
      </div>

      <div className="flex-grow relative bg-slate-200 dark:bg-slate-900 overflow-hidden">
        <MapContainer
          center={CONFIG.uiuCoords}
          zoom={14}
          zoomControl={false}
          style={{ height: '100%', width: '100%', outline: 'none', zIndex: 0 }}
        >
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution="&copy; OSM"
            className={theme === 'dark' ? 'dark-map-tiles' : ''}
          />
          <MapController mapRef={mapRef} />

          <Marker position={CONFIG.uiuCoords} icon={uiuIcon}>
            <Popup>UIU Campus</Popup>
          </Marker>

          {busesArray.map(bus => {
            const isStale = (Date.now() - bus.ts) > 60000;
            let colorClass = BUS_STYLES.default;
            if (bus.id.startsWith('K')) colorClass = BUS_STYLES['K'];
            else if (bus.id.startsWith('N')) colorClass = BUS_STYLES['N'];
            else if (bus.id.startsWith('A')) colorClass = BUS_STYLES['A'];
            else if (bus.route && bus.route.includes('To UIU')) colorClass = BUS_STYLES.to_uiu;
            else if (bus.route && bus.route.includes('From UIU')) colorClass = BUS_STYLES.from_uiu;

            return (
              <React.Fragment key={bus.id}>
                <Marker position={[bus.lat, bus.lng]} icon={createBusIcon(bus.id, colorClass, isStale)}>
                  <Popup>
                    <div className="text-center p-2">
                        <b className="text-brand-500 block mb-1">Bus {escapeHtml(bus.id)}</b>
                        <p className="text-xs text-slate-500">{escapeHtml(bus.route)}</p>
                        {bus.username && <p className="text-xs font-bold text-slate-600 dark:text-slate-300 mt-1">👤 {escapeHtml(bus.username)}</p>}
                    </div>
                  </Popup>
                </Marker>
                {bus.acc && bus.acc > 10 && (
                  <Circle
                    center={[bus.lat, bus.lng]}
                    radius={bus.acc}
                    pathOptions={{ color: 'transparent', fillColor: '#3b82f6', fillOpacity: 0.2 }}
                  />
                )}
              </React.Fragment>
            )
          })}
        </MapContainer>
      </div>

      <div className={`bg-white dark:bg-slate-900 rounded-t-3xl shadow-[0_-5px_20px_rgba(0,0,0,0.1)] z-20 relative transition-transform duration-300 transform ${bottomSheetOpen ? 'translate-y-0' : 'translate-y-[80%]'}`}>
        <div className="w-full flex justify-center pt-4 pb-2 cursor-pointer" onClick={() => setBottomSheetOpen(!bottomSheetOpen)}>
          <div className="w-16 h-1.5 bg-slate-300/50 dark:bg-slate-600/50 rounded-full backdrop-blur-sm"></div>
        </div>
        <div className="p-4 pb-8 max-h-[40vh] overflow-y-auto">
          <h3 className="font-bold mb-4 text-sm text-slate-500 uppercase tracking-wide">Active Transport</h3>
          <div className="space-y-2">
            {busesArray.length === 0 ? (
              <div className="text-center py-8 text-slate-400 text-sm">
                <i className="fas fa-satellite-dish animate-pulse mb-2 block text-2xl"></i>
                Searching for buses...
              </div>
            ) : (
              busesArray.map(bus => {
                const isStale = (Date.now() - bus.ts) > 60000;

                let etaText = null;
                if (studentLocation) {
                    const dist = calculateDistance(studentLocation.latitude, studentLocation.longitude, bus.lat, bus.lng);
                    const speed = Math.max(Number(bus.speed) || 20, 10);
                    const mins = Math.ceil((dist / 1000) / speed * 60);
                    etaText = <span className="px-1.5 py-0.5 rounded bg-brand-100 text-brand-600 text-[10px] font-bold ml-2">~{mins} min</span>;
                }

                let bgClass = "bg-orange-500";
                if (bus.id.startsWith('K')) bgClass = "bg-blue-500";
                if (bus.id.startsWith('N')) bgClass = "bg-green-500";
                if (bus.id.startsWith('A')) bgClass = "bg-purple-500";

                return (
                  <div key={bus.id} onClick={() => focusBus(bus)} className={`flex items-center justify-between p-4 mb-2 bg-slate-50/80 dark:bg-slate-800/80 backdrop-blur-sm border border-slate-100 dark:border-slate-700/50 rounded-2xl cursor-pointer hover:bg-white dark:hover:bg-slate-700 transition-all shadow-sm hover:shadow-md ${isStale ? 'bus-stale' : ''}`}>
                    <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-full ${bgClass} text-white flex items-center justify-center font-bold`}>
                            {escapeHtml(bus.id)}
                        </div>
                        <div>
                            <div className="flex items-center">
                                <p className="font-bold text-sm text-slate-700 dark:text-slate-200 whitespace-nowrap">{escapeHtml(bus.route || 'Unknown')}</p>
                                {etaText}
                            </div>
                            <div className="flex items-center gap-2">
                                <p className={`text-[10px] ${isStale ? 'text-red-400' : 'text-green-500'} transition-opacity duration-200`}>{isStale ? 'Signal Lost' : 'Active Now'}</p>
                                <p className="text-[10px] text-slate-400">| {Number(bus.speed || 0).toFixed(1)} km/h</p>
                            </div>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-500 dark:text-slate-400 truncate max-w-[80px]">{escapeHtml(bus.username || '')}</span>
                        <i className="fas fa-chevron-right text-slate-300"></i>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default StudentView;
