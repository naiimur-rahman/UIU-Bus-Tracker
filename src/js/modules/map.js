import { CONFIG, BUS_STYLES } from './config.js';
import { state } from './state.js';

export const updateMapStyle = (mapInstance) => {
    if (!mapInstance) return;
    const isDark = document.documentElement.classList.contains('dark');
    mapInstance.eachLayer(layer => {
        if (layer instanceof L.TileLayer) {
            if (isDark) layer.getContainer().classList.add('dark-map-tiles');
            else layer.getContainer().classList.remove('dark-map-tiles');
        }
    });
};

export const initStudentMap = (callbacks) => {
    setTimeout(() => {
        if (!state.map) {
            state.map = L.map('map', { zoomControl: false }).setView(CONFIG.uiuCoords, 14);
            L.control.zoom({ position: 'bottomright' }).addTo(state.map);
            
            const jumpBtn = L.control({position: 'bottomright'});
            jumpBtn.onAdd = function(map) {
                const div = L.DomUtil.create('div', 'leaflet-bar leaflet-control');
                const a = L.DomUtil.create('a', '', div);
                a.href = '#';
                a.title = 'Jump to UIU';
                a.innerHTML = '<i class="fas fa-university"></i>';
                a.style.backgroundColor = 'white';
                a.style.color = '#334155';
                a.onclick = (e) => {
                    e.preventDefault();
                    state.map.setView(CONFIG.uiuCoords, 16);
                }
                return div;
            };
            jumpBtn.addTo(state.map);

            const locateBtn = L.control({position: 'bottomright'});
            locateBtn.onAdd = function(map) {
                const div = L.DomUtil.create('div', 'leaflet-bar leaflet-control');
                const a = L.DomUtil.create('a', '', div);
                a.href = '#';
                a.title = 'My Location';
                a.innerHTML = '<i class="fas fa-location-crosshairs"></i>';
                a.style.backgroundColor = 'white';
                a.style.color = '#f97316';
                a.onclick = (e) => {
                    e.preventDefault();
                    if (navigator.geolocation) {
                        navigator.geolocation.getCurrentPosition((pos) => {
                            state.map.setView([pos.coords.latitude, pos.coords.longitude], 16);
                        });
                    }
                }
                return div;
            };
            locateBtn.addTo(state.map);

            const uiuIcon = L.divIcon({
                 className: '',
                 html: '<div class="text-2xl">🎓</div>',
                 iconSize: [30, 30]
            });
            L.marker(CONFIG.uiuCoords, {icon: uiuIcon}).addTo(state.map).bindPopup("UIU Campus");

            const isDark = document.documentElement.classList.contains('dark');
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '© OSM',
                className: isDark ? 'dark-map-tiles' : ''
            }).addTo(state.map);
            
            requestAnimationFrame(() => { state.map.invalidateSize(); });
        }
    }, 200);
};

export const initDriverMap = () => {
    if (state.driverMap) {
        try {
            state.driverMap.off();
            state.driverMap.remove();
        } catch(e) {}
        state.driverMap = null;
    }

    const mapContainer = document.getElementById('driver-map');
    if (mapContainer) {
        mapContainer.innerHTML = '';
        mapContainer._leaflet_id = null;
    }

    const COORDS = {
        'UIU': CONFIG.uiuCoords, 
        'Kuril': [23.822339, 90.420163],
        'Notun Bazar': [23.797881, 90.424652],
        'Aftab Nagar': [23.767860, 90.425833],
        'Transport': CONFIG.uiuCoords 
    };

    let start, end;
    if (state.driverDirection === 'From UIU') {
        start = COORDS['UIU'];
        end = COORDS[state.driverDestination] || COORDS['Transport'];
    } else {
        start = COORDS[state.driverDestination] || COORDS['Transport'];
        end = COORDS['UIU'];
    }

    setTimeout(() => {
        if (!document.getElementById('driver-map')) return; 
        
        state.driverMap = L.map('driver-map', { zoomControl: false }).setView(start, 13);
        const isDark = document.documentElement.classList.contains('dark');
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OSM',
            className: isDark ? 'dark-map-tiles' : ''
        }).addTo(state.driverMap);

        L.marker(start).addTo(state.driverMap).bindPopup("Start");
        L.marker(end).addTo(state.driverMap).bindPopup("End");

        const iconHtml = `
            <div class="bg-blue-600 w-6 h-6 rounded-full border-2 border-white shadow-lg flex items-center justify-center relative pulse-ring">
                <div class="w-2 h-2 bg-white rounded-full"></div>
            </div>
        `;
        const icon = L.divIcon({ className: '', html: iconHtml, iconSize: [24, 24] });
        state.driverMarker = L.marker(start, {icon: icon}).addTo(state.driverMap);

        const jumpBtn = L.control({position: 'bottomright'});
        jumpBtn.onAdd = function(map) {
            const div = L.DomUtil.create('div', 'leaflet-bar leaflet-control');
            const a = L.DomUtil.create('a', '', div);
            a.href = '#';
            a.title = 'Jump to UIU';
            a.innerHTML = '<i class="fas fa-university"></i>';
            a.style.backgroundColor = 'white';
            a.style.color = '#334155';
            a.onclick = (e) => {
                e.preventDefault();
                state.driverMap.setView(CONFIG.uiuCoords, 16);
            }
            return div;
        };
        jumpBtn.addTo(state.driverMap);

        const locateBtn = L.control({position: 'bottomright'});
        locateBtn.onAdd = function(map) {
            const div = L.DomUtil.create('div', 'leaflet-bar leaflet-control');
            const a = L.DomUtil.create('a', '', div);
            a.href = '#';
            a.title = 'My Location';
            a.innerHTML = '<i class="fas fa-location-crosshairs"></i>';
            a.style.backgroundColor = 'white';
            a.style.color = '#f97316';
            a.onclick = (e) => {
                e.preventDefault();
                state.isFollowingDriver = true; // Force re-follow
                if (state.lastLat && state.lastLng) {
                    state.driverMap.setView([state.lastLat, state.lastLng], 16);
                }
            }
            return div;
        };
        locateBtn.addTo(state.driverMap);

        state.driverMap.on('dragstart zoomstart', () => {
            state.isFollowingDriver = false;
            if (state.autoFollowTimeout) clearTimeout(state.autoFollowTimeout);
            state.autoFollowTimeout = setTimeout(() => {
                state.isFollowingDriver = true;
                // Immediate re-center on timeout
                if (state.lastLat && state.lastLng) {
                    state.driverMap.panTo([state.lastLat, state.lastLng]);
                }
            }, 5000); 
        });
        
        requestAnimationFrame(() => { state.driverMap.invalidateSize(); });
    }, 200);
};

export const updateBusMarker = (data, callbacks) => {
    const id = data.id;
    if (!state.markers[id]) {
        const prefix = id.charAt(0);
        const colorClass = BUS_STYLES[prefix] || BUS_STYLES['default'];
        const iconHtml = `
            <div class="${colorClass} w-10 h-10 rounded-2xl border-2 border-white shadow-xl flex flex-col items-center justify-center text-white relative transform transition-all duration-500">
                <span class="font-black text-sm">${id}</span>
                <div class="absolute -bottom-1 -right-1 w-4 h-4 bg-white rounded-full flex items-center justify-center">
                    <div class="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                </div>
            </div>
        `;
        const icon = L.divIcon({ className: '', html: iconHtml, iconSize: [40, 40], iconAnchor: [20, 20] });
        state.markers[id] = L.marker([data.lat, data.lng], {icon: icon}).addTo(state.map);
        
        state.circles[id] = L.circle([data.lat, data.lng], {
            radius: data.acc || 20,
            color: '#3b82f6',
            fillColor: '#3b82f6',
            fillOpacity: 0.1,
            weight: 1
        }).addTo(state.map);
    } else {
        state.markers[id].setLatLng([data.lat, data.lng]);
        if (state.circles[id]) {
            state.circles[id].setLatLng([data.lat, data.lng]);
            state.circles[id].setRadius(data.acc || 20);
        }
    }

    // Update or Create Polyline (Breadcrumbs)
    if (!state.pathHistory[id]) state.pathHistory[id] = [];
    
    // Only push if location has changed significantly
    const lastPoint = state.pathHistory[id][state.pathHistory[id].length - 1];
    const hasMoved = !lastPoint || lastPoint[0] !== data.lat || lastPoint[1] !== data.lng;
    
    if (hasMoved) {
        state.pathHistory[id].push([data.lat, data.lng]);
        if (state.pathHistory[id].length > 40) state.pathHistory[id].shift(); // Keep last 40 points
    }

    if (!state.polylines[id]) {
        const prefix = id.charAt(0);
        const colorMap = { 'K': '#f97316', 'N': '#8b5cf6', 'A': '#10b981', 'default': '#3b82f6' };
        const color = colorMap[prefix] || colorMap['default'];
        
        state.polylines[id] = L.polyline(state.pathHistory[id], {
            color: color,
            weight: 3,
            opacity: 0.6,
            dashArray: '8, 12',
            lineJoin: 'round',
            lineCap: 'round'
        }).addTo(state.map);
    } else if (hasMoved) {
        state.polylines[id].setLatLngs(state.pathHistory[id]);
    }

    const popupHtml = `
        <div class="p-1 min-w-[150px]">
            <div class="font-bold text-slate-800">${callbacks.escapeHtml(data.route)}</div>
            <div class="text-[10px] text-slate-500 mt-1 flex justify-between">
                <span>Speed: <b>${data.speed} km/h</b></span>
                <span>ID: <b>${data.id}</b></span>
            </div>
            ${data.username ? `<div class="text-[9px] bg-slate-100 p-1 mt-2 rounded">Captain: <b>${callbacks.escapeHtml(data.username)}</b></div>` : ''}
        </div>
    `;
    state.markers[id].bindPopup(popupHtml);
};

export const removeBusMarker = (id) => {
    if (state.markers[id]) {
        state.map.removeLayer(state.markers[id]);
        delete state.markers[id];
    }
    if (state.circles[id]) {
        state.map.removeLayer(state.circles[id]);
        delete state.circles[id];
    }
    if (state.polylines[id]) {
        state.map.removeLayer(state.polylines[id]);
        delete state.polylines[id];
        delete state.pathHistory[id];
    }
};
