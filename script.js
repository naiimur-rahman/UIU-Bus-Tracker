window.closeWelcomeModal = function() {
            const modal = document.getElementById('welcome-modal');
            if (modal) {
                // Add fade out effect
                modal.style.opacity = '0';
                modal.style.pointerEvents = 'none';
                
                // Wait for animation to finish then hide completely
                setTimeout(() => {
                    modal.style.display = 'none';
                }, 500);
            }
        };
        /** APP CONFIG */
        const CONFIG = {
            mqtt: {
                protocol: 'wss',
                host: '09872002dac9410e9af391b1a7066483.s1.eu.hivemq.cloud',
                port: 8884,
                path: '/mqtt',
                username: 'naimur',
                password: 'Sohan786@',
                clientId: (() => {
                    let id = localStorage.getItem('mqtt_client_id');
                    if (!id) {
                        id = 'uiu-' + Math.random().toString(16).substr(2, 8);
                        localStorage.setItem('mqtt_client_id', id);
                    }
                    return id;
                })()
            },
            topics: {
                location: 'uiu/bus/location',
                presence: 'uiu/presence'
            },
            uiuCoords: [23.79790, 90.44970], 
            presenceInterval: 15000,
            minAccuracy: 50
        };

        const BUS_STYLES = {
            'K': 'bg-blue-500',   // Kuril - Blue
            'N': 'bg-green-500',  // Notun Bazar - Green
            'A': 'bg-purple-500', // Aftab Nagar - Purple
            'default': 'bg-orange-500',
            'to_uiu': 'bg-green-600',
            'from_uiu': 'bg-red-600'
        };

        /** GLOBAL STATE */
        const state = {
            client: null,
            isConnected: false,
            connectionDebounce: null, 
            role: null,
            driverId: null,
            driverRoute: null,
            driverDestination: null,
            driverUsername: null,
            isBroadcasting: false,
            watchId: null,
            wakeLock: null,
            activeBuses: {},
            activeUsers: new Map(),
            userCache: {},
            map: null,
            driverMap: null,
            driverMarker: null,
            markers: {},
            circles: {}, 
            lastSentTime: 0,
            sessionPoints: 0,
            sessionDistance: 0,
            lastLat: null,
            lastLng: null,
            tripStartTime: null,
            uptimeInterval: null,
            currentSmoothedSpeed: 0
        };

        /** APP CONTROLLER */
        const app = {
            init: () => {
                app.loadTheme();
                app.connectMqtt();
                console.log("App Version: Map Clear Fix & Structure Fix");
                
                // CHECK LOCALSTORAGE
                const savedDriverId = localStorage.getItem('active_driver_id');
                const savedRoute = localStorage.getItem('active_driver_route');
                
                if (savedDriverId && savedRoute) {
                    console.log("Restoring previous session...");
                    state.driverId = savedDriverId;
                    state.driverRoute = savedRoute;
                    state.driverDestination = localStorage.getItem('active_driver_dest');
                    state.driverDirection = localStorage.getItem('active_driver_dir');
                    state.driverUsername = localStorage.getItem('active_driver_username');
                    
                    app.setRole('driver-dashboard');
                    document.getElementById('driver-assigned-id').innerText = `${state.driverRoute} [${state.driverId}]`;

                    if (state.driverUsername) {
                        document.getElementById('driver-display-username-container').classList.remove('hidden');
                        document.getElementById('driver-display-username').innerText = state.driverUsername;
                    }

                    app.switchView('view-driver-dashboard');
                    app.initDriverMap();
                }

                setInterval(app.sendHeartbeat, CONFIG.presenceInterval);
                setInterval(app.cleanupStaleUsers, 10000);
            },

            // --- Theme & View ---
            escapeHtml: (text) => {
                if (!text) return text;
                return String(text)
                    .replace(/&/g, "&amp;")
                    .replace(/</g, "&lt;")
                    .replace(/>/g, "&gt;")
                    .replace(/"/g, "&quot;")
                    .replace(/'/g, "&#039;");
            },

            toggleTheme: () => {
                const html = document.documentElement;
                if (html.classList.contains('dark')) {
                    html.classList.remove('dark');
                    localStorage.setItem('theme', 'light');
                } else {
                    html.classList.add('dark');
                    localStorage.setItem('theme', 'dark');
                }
                app.updateMapStyle();
            },

            loadTheme: () => {
                const theme = localStorage.getItem('theme');
                if (theme === 'dark' || (!theme && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
                    document.documentElement.classList.add('dark');
                } else {
                    document.documentElement.classList.remove('dark');
                }
            },

            switchView: (viewId) => {
                document.getElementById('selection-loader').classList.add('hidden');
                document.getElementById('route-sub-select').classList.add('hidden');

                const views = document.querySelectorAll('.view-section');
                views.forEach(el => {
                    el.classList.remove('view-active');
                    el.style.opacity = '0';
                    el.style.pointerEvents = 'none';
                    el.style.zIndex = '0';
                });

                const target = document.getElementById(viewId);
                if (target) {
                    target.classList.add('view-active');
                    void target.offsetWidth; 
                    target.style.opacity = '1';
                    target.style.pointerEvents = 'auto';
                    target.style.zIndex = '100';
                    target.style.visibility = 'visible';
                }

                const globalControls = document.getElementById('global-controls');
                if (globalControls) {
                    if (viewId === 'view-landing') {
                        globalControls.classList.remove('opacity-0', 'pointer-events-none', 'invisible');
                    } else {
                        globalControls.classList.add('opacity-0', 'pointer-events-none', 'invisible');
                    }
                }
            },

            setRole: (role) => {
                state.role = role;
                if (role === 'student') {
                    app.switchView('view-student');
                    app.initMap();
                } else if (role === 'driver-select') {
                    app.switchView('view-driver-select');
                } else if (role === 'driver-dashboard') {
                    app.switchView('view-driver-dashboard');
                }
            },

            goHome: async () => {
                try {
                    if (state.isBroadcasting) {
                        const confirmExit = confirm("Stop broadcasting and exit?");
                        if (!confirmExit) return;
                        await app.stopBroadcast();
                    }

                    // Force Clear Watch
                    if (state.watchId) {
                        navigator.geolocation.clearWatch(state.watchId);
                        state.watchId = null;
                    }

                    state.driverId = null;
                    state.driverRoute = null;
                    state.driverDestination = null;
                    state.driverDirection = null;
                    state.role = null;
                    state.isBroadcasting = false;
                    state.currentSmoothedSpeed = 0;
                    state.activeBuses = {}; // Full reset

                    // FIX: Safer Map Removal
                    if (state.driverMap) {
                        try {
                            state.driverMap.off();
                            state.driverMap.remove();
                        } catch (e) { console.log("Map cleanup warning", e); }
                        state.driverMap = null;
                    }
                    
                    state.driverMarker = null;

                    localStorage.removeItem('active_driver_id');
                    localStorage.removeItem('active_driver_route');
                    localStorage.removeItem('active_driver_dest');
                    localStorage.removeItem('active_driver_dir');
                    localStorage.removeItem('active_driver_username');
                    
                } catch (error) {
                    console.error("Error during exit:", error);
                }
                app.switchView('view-landing');
            },

            // --- Wake Lock ---
            requestWakeLock: async () => {
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
            },

            releaseWakeLock: () => {
                if (state.wakeLock) {
                    state.wakeLock.release();
                    state.wakeLock = null;
                }
            },

            // --- MQTT Logic ---
            connectMqtt: () => {
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
                    app.updateConnectionStatus('connected');
                    state.client.subscribe(CONFIG.topics.location);
                    state.client.subscribe(CONFIG.topics.presence);
                    app.sendHeartbeat();
                });

                state.client.on('message', (topic, message) => {
                    const msgString = message.toString();
                    if (!msgString) return;
                    try {
                        const data = JSON.parse(msgString);
                        if (topic === CONFIG.topics.location) {
                            app.handleLocationUpdate(data);
                        } else if (topic === CONFIG.topics.presence) {
                            app.handlePresenceUpdate(data);
                        }
                    } catch (e) { console.error("Msg Parse Error:", e); }
                });

                state.client.on('error', (err) => {
                    console.error("MQTT Error", err);
                    if (state.connectionDebounce) clearTimeout(state.connectionDebounce);
                    state.connectionDebounce = setTimeout(() => {
                        state.isConnected = false;
                        app.updateConnectionStatus('error');
                    }, 2000);
                });
                
                state.client.on('close', () => {
                    if (state.connectionDebounce) clearTimeout(state.connectionDebounce);
                    state.connectionDebounce = setTimeout(() => {
                        state.isConnected = false;
                        app.updateConnectionStatus('offline');
                    }, 2000);
                });
            },

            updateConnectionStatus: (status) => {
                const dot = document.getElementById('driver-connection-dot');
                const text = document.getElementById('driver-connection-text');
                const studentStatus = document.getElementById('student-status');

                if (status === 'connected') {
                    if (dot) dot.className = "w-2 h-2 rounded-full bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.6)]";
                    if (text) text.innerText = "ONLINE";
                    if (studentStatus) {
                        studentStatus.innerHTML = '<div class="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div> Live';
                        studentStatus.classList.add('text-green-600', 'bg-green-100');
                    }
                } else {
                    if (dot) dot.className = "w-2 h-2 rounded-full bg-red-500";
                    if (text) text.innerText = "OFFLINE";
                    if (studentStatus) {
                        studentStatus.innerHTML = '<div class="w-2 h-2 bg-red-400 rounded-full"></div> Connect';
                    }
                }
            },

            sendHeartbeat: () => {
                if (state.client && state.isConnected) {
                    state.client.publish(CONFIG.topics.presence, JSON.stringify({
                        id: CONFIG.mqtt.clientId,
                        ts: Date.now(),
                        role: state.role || 'viewer'
                    }));
                }
            },

            handlePresenceUpdate: (data) => {
                state.activeUsers.set(data.id, data.ts);
                app.updateUserCount();
            },

            cleanupStaleUsers: () => {
                const now = Date.now();
                for (const [id, ts] of state.activeUsers) {
                    if (now - ts > 45000) state.activeUsers.delete(id);
                }
                app.updateUserCount();

                for (const id in state.activeBuses) {
                    if (now - state.activeBuses[id].ts > 45000) { 
                        delete state.activeBuses[id];
                        app.removeBusMarker(id);
                    }
                }
                app.updateBusList();
            },

            updateUserCount: () => {
                const el = document.getElementById('count-users');
                if (el) el.innerText = state.activeUsers.size;
            },

            // --- Location Logic ---
            handleLocationUpdate: (data) => {
                if (data.status === 'offline') {
                    delete state.activeBuses[data.id];
                    app.removeBusMarker(data.id);
                    app.updateBusList();
                    return;
                }

                if (state.isBroadcasting && data.id === state.driverId) return;

                const timeDiff = Date.now() - data.ts;
                if (timeDiff > 120000) return; 
                
                state.activeBuses[data.id] = data;

                if (state.role === 'student') {
                    app.updateBusMarker(data);
                    app.updateBusList();
                }
            },

            selectRoute: (name, prefix) => {
                state.tempRouteName = name;
                state.tempRoutePrefix = prefix;
                const savedName = localStorage.getItem('saved_username');
                if (savedName) {
                    document.getElementById('driver-username-input').value = savedName;
                }
                document.getElementById('route-sub-select').classList.remove('hidden');
            },

            confirmRoute: (direction) => {
                const name = state.tempRouteName;
                const prefix = state.tempRoutePrefix;
                const fullRouteName = `${name} (${direction})`;

                const usernameInput = document.getElementById('driver-username-input').value.trim();
                const username = usernameInput || null;

                document.getElementById('route-sub-select').classList.add('hidden');
                const loader = document.getElementById('selection-loader');
                if (loader) loader.classList.remove('hidden');

                if (state.watchId) {
                    navigator.geolocation.clearWatch(state.watchId);
                    state.watchId = null;
                }

                let attempts = 0;
                const syncInterval = setInterval(() => {
                    attempts++;
                    if (state.isConnected || attempts > 30) {
                        clearInterval(syncInterval);
                        
                        const now = Date.now();
                        for (const id in state.activeBuses) {
                            if (now - state.activeBuses[id].ts > 30000) { 
                                delete state.activeBuses[id];
                            }
                        }

                        const assignedId = app.assignNextId(prefix);
                        
                        state.driverRoute = fullRouteName;
                        state.driverId = assignedId;
                        state.driverDestination = name;
                        state.driverDirection = direction;
                        state.driverUsername = username;

                        localStorage.setItem('active_driver_id', assignedId);
                        localStorage.setItem('active_driver_route', fullRouteName);
                        localStorage.setItem('active_driver_dest', name);
                        localStorage.setItem('active_driver_dir', direction);

                        if (username) {
                            localStorage.setItem('active_driver_username', username);
                            localStorage.setItem('saved_username', username);
                        } else {
                            localStorage.removeItem('active_driver_username');
                        }

                        document.getElementById('driver-assigned-id').innerText = fullRouteName + ' [' + assignedId + ']';

                        const nameContainer = document.getElementById('driver-display-username-container');
                        const nameSpan = document.getElementById('driver-display-username');
                        if (username) {
                            nameContainer.classList.remove('hidden');
                            nameSpan.innerText = username;
                        } else {
                            nameContainer.classList.add('hidden');
                            nameSpan.innerText = '';
                        }

                        if (loader) loader.classList.add('hidden');
                        
                        // FIX: Ensure button state is fresh
                        state.isBroadcasting = false;
                        app.updateBroadcastUI(false);
                        
                        app.switchView('view-driver-dashboard');
                        app.initDriverMap();
                    }
                }, 100);
            },

            assignNextId: (prefix) => {
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
            },

            calculateDistance: (lat1, lon1, lat2, lon2) => {
                const R = 6371e3; 
                const φ1 = lat1 * Math.PI/180;
                const φ2 = lat2 * Math.PI/180;
                const Δφ = (lat2-lat1) * Math.PI/180;
                const Δλ = (lon2-lon1) * Math.PI/180;
                const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ/2) * Math.sin(Δλ/2);
                const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
                return R * c;
            },

            // --- Driver Map & Routing ---
            initDriverMap: () => {
                if (state.driverMap) {
                    try {
                        state.driverMap.off();
                        state.driverMap.remove();
                    } catch(e) {}
                    state.driverMap = null;
                }

                // FIX: CLEAN MAP CONTAINER FORCEFULLY
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
                        a.onclick = (e) => {
                            e.preventDefault();
                            state.driverMap.setView(CONFIG.uiuCoords, 16);
                        }
                        return div;
                    };
                    jumpBtn.addTo(state.driverMap);
                    
                    requestAnimationFrame(() => { state.driverMap.invalidateSize(); });
                }, 200);
            },

            // --- Driver Broadcasting ---
            toggleBroadcast: () => {
                if (state.isBroadcasting) app.stopBroadcast();
                else app.startBroadcast();
            },

            startBroadcast: () => {
                if (!navigator.geolocation) {
                    alert("Geolocation not supported");
                    return;
                }
                
                try {
                    // INSTANT UI UPDATE - NO WAITING
                    state.isBroadcasting = true;
                    app.updateBroadcastUI(true);

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

                    app.requestWakeLock();

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

                            // --- SAME DIRECTION BLOCKING LOGIC START ---
                            if (isFirstFix) {
                                let conflict = false;
                                const buses = Object.values(state.activeBuses);
                                
                                for (let bus of buses) {
                                    // 1. Skip checking against yourself
                                    if (bus.id === state.driverId) continue;

                                    // 2. Skip stale buses (older than 60s)
                                    if (now - bus.ts > 60000) continue;

                                    // 3. Check Exact Route & Direction Match
                                    // defined in confirmRoute: e.g., "Kuril (To UIU)"
                                    if (bus.route === state.driverRoute) {
                                        
                                        // 4. Calculate Distance
                                        const dist = app.calculateDistance(latitude, longitude, bus.lat, bus.lng);
                                        
                                        // 5. If closer than 20 meters
                                        if (dist < 20) {
                                            conflict = true; 
                                            break;
                                        }
                                    }
                                }

                                if (conflict) {
                                    alert("⚠️ Another Captain is active nearby in the same direction! Save your battery.");
                                    app.stopBroadcast();
                                    return; // Stop execution here
                                }

                                isFirstFix = false; // Disable check for rest of trip
                            }

                            // --- DYNAMIC SPEED LOGIC START ---
                            let rawSpeedKmh = (speed || 0) * 3.6;

                            // 1. Determine Smoothing Factor (Alpha)
                            // Default 0.15 = Heavy smoothing (keeps 85% history) -> Good for cruising
                            let alpha = 0.15; 
                            
                            // If we are slowing down (Current > New), react FAST.
                            // 0.6 = Low smoothing (only keeps 40% history) -> Drops quickly
                            if (state.currentSmoothedSpeed > rawSpeedKmh) {
                                alpha = 0.6; 
                            }

                            // 2. Apply Dynamic EMA
                            // Formula: (Old * (1 - alpha)) + (New * alpha)
                            state.currentSmoothedSpeed = (state.currentSmoothedSpeed * (1 - alpha)) + (rawSpeedKmh * alpha);

                            // 3. Absolute Stop Snap
                            // If raw GPS says 0 and we are already slow, just snap to 0 immediately to kill lag
                            if (rawSpeedKmh < 0.2 && state.currentSmoothedSpeed < 2.0) {
                                state.currentSmoothedSpeed = 0;
                            }

                            // 4. Formatting
                            const displaySpeed = state.currentSmoothedSpeed.toFixed(1);
                            
                            document.getElementById('val-speed').innerHTML = `${displaySpeed}<span class="text-[10px] ml-0.5 text-slate-400 font-sans">km/h</span>`;
                            // --- DYNAMIC SPEED LOGIC END ---
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
                    app.updateBroadcastUI(false);
                }
            },

            stopBroadcast: async () => {
                state.isBroadcasting = false;
                app.updateBroadcastUI(false);
                app.releaseWakeLock();
                
                // FORCE KILL GHOSTS
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

                app.showSummary();
            },

            showSummary: () => {
                const modal = document.getElementById('trip-summary-modal');
                modal.classList.remove('opacity-0', 'pointer-events-none', 'z-[-1]');
                modal.classList.add('z-50');
                modal.style.opacity = '1';
                modal.style.pointerEvents = 'auto';

                if (window.confetti) {
                    confetti({
                        particleCount: 150,
                        spread: 70,
                        origin: { y: 0.6 }
                    });
                }
            },

            closeSummary: () => {
                if (window.confetti) {
                    try { window.confetti.reset(); } catch(e) {}
                }
                const modal = document.getElementById('trip-summary-modal');
                modal.classList.add('opacity-0', 'pointer-events-none', 'z-[-1]');
                modal.classList.remove('z-50');
                modal.style.opacity = '0';
                app.goHome(); 
            },

            updateBroadcastUI: (isActive) => {
                const btn = document.getElementById('broadcast-btn');
                const glow = document.getElementById('broadcast-glow');
                const title = document.getElementById('broadcast-status-title');
                const icon = document.getElementById('broadcast-icon');

                if (isActive) {
                    btn.innerText = "STOP TRIP";
                    btn.classList.remove('from-brand-500', 'to-brand-600', 'hover:from-brand-400', 'hover:to-brand-500');
                    btn.classList.add('from-red-500', 'to-red-600', 'hover:from-red-400', 'hover:to-red-500', 'animate-pulse');

                    glow.style.opacity = '1';
                    glow.className = "absolute inset-0 rounded-full animate-pulse-glow bg-green-400";
                    title.innerText = "Broadcasting";
                    icon.classList.remove('text-slate-300', 'dark:text-slate-600');
                    icon.classList.add('text-green-500');
                } else {
                    btn.innerText = "START TRIP";
                    // Restore gradients
                    btn.classList.remove('from-red-500', 'to-red-600', 'hover:from-red-400', 'hover:to-red-500', 'animate-pulse');
                    btn.classList.add('from-brand-500', 'to-brand-600', 'hover:from-brand-400', 'hover:to-brand-500');
                    
                    glow.style.opacity = '0';
                    title.innerText = "Ready?";
                    icon.classList.add('text-slate-300', 'dark:text-slate-600');
                    icon.classList.remove('text-green-500');
                }
            },

            // --- Student Map ---
            initMap: () => {
                setTimeout(() => {
                    if (!state.map) {
                        state.map = L.map('map', { zoomControl: false }).setView(CONFIG.uiuCoords, 14);
                        L.control.zoom({ position: 'bottomright' }).addTo(state.map);
                        
                        const jumpBtn = L.control({position: 'bottomright'});
                        jumpBtn.onAdd = function(map) {
                            const div = L.DomUtil.create('div', 'leaflet-bar leaflet-control');
                            // Use same structure as default leaflet controls but customized
                            const a = L.DomUtil.create('a', '', div);
                            a.href = '#';
                            a.title = 'Jump to UIU';
                            a.innerHTML = '<i class="fas fa-university"></i>';
                            a.onclick = (e) => {
                                e.preventDefault();
                                state.map.setView(CONFIG.uiuCoords, 16);
                            }
                            return div;
                        };
                        jumpBtn.addTo(state.map);

                        const uiuIcon = L.divIcon({
                             className: '',
                             html: '<div class="text-2xl">🎓</div>',
                             iconSize: [30, 30]
                        });
                        L.marker(CONFIG.uiuCoords, {icon: uiuIcon}).addTo(state.map).bindPopup("UIU Campus");
                        app.updateMapStyle();
                    }
                    requestAnimationFrame(() => { state.map.invalidateSize(); });
                }, 100);
            },

            createBusIcon: (id, colorClass) => {
                 return L.divIcon({
                    className: 'custom-bus-pin', 
                    html: `
                        <div class="${colorClass} w-10 h-10 rounded-full flex items-center justify-center text-white font-bold border-2 border-white shadow-lg relative z-10">
                            ${id}
                            <div class="absolute -bottom-1 left-1/2 -translate-x-1/2 w-3 h-3 ${colorClass} rotate-45 z-0"></div>
                        </div>
                    `,
                    iconSize: [40, 48], 
                    iconAnchor: [20, 48], 
                    popupAnchor: [0, -48]
                });
            },

            updateMapStyle: () => {
                if (!state.map) return;
                state.map.eachLayer((layer) => {
                    if (layer instanceof L.TileLayer) state.map.removeLayer(layer);
                });
                const isDark = document.documentElement.classList.contains('dark');
                L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                    attribution: '© OSM',
                    className: isDark ? 'dark-map-tiles' : ''
                }).addTo(state.map);
            },

            updateBusMarker: async (data) => {
                const { id, lat, lng, acc } = data;

                let colorClass = BUS_STYLES.default;
                
                if (id.startsWith('K')) colorClass = BUS_STYLES['K']; 
                else if (id.startsWith('N')) colorClass = BUS_STYLES['N']; 
                else if (id.startsWith('A')) colorClass = BUS_STYLES['A']; 
                else if (data.route && data.route.includes('To UIU')) colorClass = BUS_STYLES.to_uiu;
                else if (data.route && data.route.includes('From UIU')) colorClass = BUS_STYLES.from_uiu;

                if (state.markers[id]) {
                    state.markers[id].setLatLng([lat, lng]);
                    const icon = app.createBusIcon(id, colorClass); 
                    state.markers[id].setIcon(icon);
                } else {
                    const icon = app.createBusIcon(id, colorClass);
                    const marker = L.marker([lat, lng], { icon: icon }).addTo(state.map);
                    
                    const popupContent = document.createElement('div');
                    popupContent.innerHTML = `
                        <div class="text-center p-2">
                            <b class="text-brand-500 block mb-1">Bus ${app.escapeHtml(id)}</b>
                            <p class="text-xs text-slate-500">${app.escapeHtml(data.route)}</p>
                            ${data.username ? `<p class="text-xs font-bold text-slate-600 dark:text-slate-300 mt-1">👤 ${app.escapeHtml(data.username)}</p>` : ''}
                        </div>
                    `;
                    marker.bindPopup(popupContent);
                    state.markers[id] = marker;
                    app.updateBusCount();
                }

                if (acc && acc > 10) {
                    if (state.circles[id]) {
                        state.circles[id].setLatLng([lat, lng]);
                        state.circles[id].setRadius(acc);
                    } else {
                        state.circles[id] = L.circle([lat, lng], {
                            radius: acc,
                            color: 'transparent',
                            fillColor: '#3b82f6',
                            fillOpacity: 0.2
                        }).addTo(state.map);
                    }
                }
            },

            removeBusMarker: (id) => {
                if (state.markers[id]) {
                    state.map.removeLayer(state.markers[id]);
                    delete state.markers[id];
                }
                if (state.circles[id]) {
                    state.map.removeLayer(state.circles[id]);
                    delete state.circles[id];
                }
                app.updateBusCount();
            },

            updateBusCount: () => {
                document.getElementById('count-buses').innerText = Object.keys(state.markers).length;
            },

            updateBusList: () => {
                const list = document.getElementById('bus-list');
                const buses = Object.values(state.activeBuses);
                if (buses.length === 0) {
                    if (!list.querySelector('.fa-satellite-dish')) {
                        list.innerHTML = `<div class="text-center py-8 text-slate-400 text-sm"><i class="fas fa-satellite-dish animate-pulse mb-2 block text-2xl"></i>Searching for buses...</div>`;
                    }
                    return;
                }
                
                const loader = list.querySelector('.fa-satellite-dish');
                if (loader) loader.parentElement.remove();

                buses.forEach(bus => {
                    let item = document.getElementById(`bus-${bus.id}`);
                    if (!item) {
                        item = document.createElement('div');
                        item.id = `bus-${bus.id}`;
                        // Updated to softer colors/glass effect
                        item.className = "flex items-center justify-between p-4 mb-2 bg-slate-50/80 dark:bg-slate-800/80 backdrop-blur-sm border border-slate-100 dark:border-slate-700/50 rounded-2xl cursor-pointer hover:bg-white dark:hover:bg-slate-700 transition-all shadow-sm hover:shadow-md";
                        item.onclick = () => app.focusBus(bus.id);
                        
                        let bgClass = "bg-orange-500";
                        if (bus.id.startsWith('K')) bgClass = "bg-blue-500";
                        if (bus.id.startsWith('N')) bgClass = "bg-green-500";
                        if (bus.id.startsWith('A')) bgClass = "bg-purple-500";

                        item.innerHTML = `
                            <div class="flex items-center gap-3">
                                <div class="w-10 h-10 rounded-full ${bgClass} text-white flex items-center justify-center font-bold">
                                    ${app.escapeHtml(bus.id)}
                                </div>
                                <div>
                                    <p class="font-bold text-sm text-slate-700 dark:text-slate-200">${app.escapeHtml(bus.route || 'Unknown')}</p>
                                    <div class="flex items-center gap-2">
                                        <p class="text-[10px] text-green-500 transition-opacity duration-200">Active Now</p>
                                        <p class="text-[10px] text-slate-400">| <span id="speed-${bus.id}">${Number(bus.speed || 0).toFixed(1)}</span> km/h</p>
                                    </div>
                                </div>
                            </div>
                            <div class="flex items-center gap-2">
                                <span class="text-xs font-bold text-slate-500 dark:text-slate-400 truncate max-w-[80px]">${app.escapeHtml(bus.username || '')}</span>
                                <i class="fas fa-chevron-right text-slate-300"></i>
                            </div>
                        `;
                        list.appendChild(item);
                    } else {
                        const speedEl = document.getElementById(`speed-${bus.id}`);
                        if (speedEl) {
                            speedEl.innerText = Number(bus.speed || 0).toFixed(1);
                        }
                    }
                });

                Array.from(list.children).forEach(child => {
                    if (child.id.startsWith('bus-') && !state.activeBuses[child.id.replace('bus-', '')]) {
                        child.remove();
                    }
                });
            },

            focusBus: (id) => {
                if (state.markers[id]) {
                    state.map.setView(state.markers[id].getLatLng(), 16);
                    state.markers[id].openPopup();
                    app.toggleBottomSheet();
                }
            },

            toggleBottomSheet: () => {
                const sheet = document.getElementById('bottom-sheet');
                if (sheet.classList.contains('translate-y-0')) {
                    sheet.classList.remove('translate-y-0');
                    sheet.classList.add('translate-y-[80%]');
                } else {
                    sheet.classList.remove('translate-y-[80%]');
                    sheet.classList.add('translate-y-0');
                }
            },
        };

        window.app = app;
        window.state = state;
        window.addEventListener('DOMContentLoaded', app.init);
