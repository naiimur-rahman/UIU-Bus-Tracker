import { CONFIG, BUS_STYLES } from './modules/config.js';
import { state } from './modules/state.js';
import * as utils from './modules/utils.js';
import * as ui from './modules/ui.js';
import * as mqtt from './modules/mqtt.js';
import * as map from './modules/map.js';
import * as driver from './modules/driver.js';

const app = {
    init: () => {
        ui.loadTheme();
        app.connectMqtt();
        console.log("App Version: Modular Structure");
        
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

            ui.switchView('view-driver-dashboard');
            map.initDriverMap();
        }

        setInterval(app.sendHeartbeat, CONFIG.presenceInterval);
        setInterval(app.cleanupStaleUsers, 10000);
    },

    // --- UI & Theme ---
    toggleTheme: () => ui.toggleTheme(() => map.updateMapStyle(state.map || state.driverMap)),
    switchView: (viewId) => ui.switchView(viewId),
    setRole: (role) => {
        state.role = role;
        if (role === 'student') {
            ui.switchView('view-student');
            map.initStudentMap({ escapeHtml: utils.escapeHtml });
        } else if (role === 'driver-select') {
            ui.switchView('view-driver-select');
        } else if (role === 'driver-dashboard') {
            ui.switchView('view-driver-dashboard');
        }
    },
    goHome: async () => {
        try {
            if (state.isBroadcasting) {
                if (!confirm("Stop broadcasting and exit?")) return;
                await app.stopBroadcast();
            }
            if (state.watchId) {
                navigator.geolocation.clearWatch(state.watchId);
                state.watchId = null;
            }
            state.driverId = state.driverRoute = state.driverDestination = state.driverDirection = state.role = null;
            state.isBroadcasting = false;
            state.currentSmoothedSpeed = 0;
            state.activeBuses = {};

            if (state.driverMap) {
                try { state.driverMap.off(); state.driverMap.remove(); } catch (e) {}
                state.driverMap = null;
            }
            state.driverMarker = null;

            ['active_driver_id', 'active_driver_route', 'active_driver_dest', 'active_driver_dir', 'active_driver_username'].forEach(k => localStorage.removeItem(k));
        } catch (error) { console.error("Error during exit:", error); }
        ui.switchView('view-landing');
    },

    // --- MQTT ---
    connectMqtt: () => mqtt.connect({
        onConnect: () => app.updateConnectionStatus('connected'),
        onDisconnect: (status) => app.updateConnectionStatus(status),
        onLocationUpdate: (data) => app.handleLocationUpdate(data),
        onPresenceUpdate: (data) => app.handlePresenceUpdate(data),
        sendHeartbeat: () => app.sendHeartbeat()
    }),
    updateConnectionStatus: (status) => ui.updateConnectionStatus ? ui.updateConnectionStatus(status) : app._updateConnectionStatus(status),
    _updateConnectionStatus: (status) => {
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
                studentStatus.classList.remove('text-green-600', 'bg-green-100');
            }
        }
    },
    sendHeartbeat: () => mqtt.sendHeartbeat(),
    handlePresenceUpdate: (data) => {
        state.activeUsers.set(data.id, data.ts);
        app.updateUserCount();
    },
    cleanupStaleUsers: () => {
        const now = Date.now();
        for (const [id, ts] of state.activeUsers) { if (now - ts > 45000) state.activeUsers.delete(id); }
        app.updateUserCount();
        for (const id in state.activeBuses) {
            if (now - state.activeBuses[id].ts > 45000) { 
                delete state.activeBuses[id];
                map.removeBusMarker(id);
            }
        }
        app.updateBusList();
    },
    updateUserCount: () => {
        const el = document.getElementById('count-users');
        if (el) el.innerText = state.activeUsers.size;
    },

    // --- Location & Bus Logic ---
    handleLocationUpdate: (data) => {
        if (data.status === 'offline') {
            delete state.activeBuses[data.id];
            map.removeBusMarker(data.id);
            app.updateBusList();
            return;
        }
        if (state.isBroadcasting && data.id === state.driverId) return;
        if (Date.now() - data.ts > 120000) return;
        state.activeBuses[data.id] = data;
        if (state.role === 'student') {
            map.updateBusMarker(data, { escapeHtml: utils.escapeHtml });
            app.updateBusList();
        }
    },
    updateBusList: () => {
        const list = document.getElementById('bus-list');
        if (!list) return;
        const buses = Object.values(state.activeBuses).sort((a, b) => a.route.localeCompare(b.route));
        if (buses.length === 0) {
            list.innerHTML = `<div class="text-center py-8 text-slate-400 text-sm"><i class="fas fa-satellite-dish animate-pulse mb-2 block text-2xl"></i>Searching for buses...</div>`;
            return;
        }
        list.innerHTML = buses.map(bus => {
            const prefix = bus.id.charAt(0);
            const colorClass = BUS_STYLES[prefix] || BUS_STYLES['default'];
            return `
                <div onclick="app.focusBus('${bus.id}')" class="glass p-3 rounded-xl flex items-center justify-between hover:border-brand-500 transition-all cursor-pointer group">
                    <div class="flex items-center gap-3">
                        <div class="${colorClass} w-10 h-10 rounded-lg flex items-center justify-center text-white shadow-lg shadow-brand-500/10">
                            <i class="fas fa-bus text-sm"></i>
                        </div>
                        <div>
                            <h4 class="font-bold text-sm leading-tight">${utils.escapeHtml(bus.route)}</h4>
                            <div class="flex items-center gap-2 mt-0.5">
                                <span class="text-[9px] text-slate-400 font-medium">ID: ${bus.id}</span>
                                <span class="text-[9px] px-1.5 py-0.5 bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400 rounded-full font-bold uppercase tracking-wider">${bus.speed} KM/H</span>
                            </div>
                        </div>
                    </div>
                    <i class="fas fa-chevron-right text-slate-300 group-hover:text-brand-500 transition-colors text-xs"></i>
                </div>
            `;
        }).join('');
    },
    focusBus: (id) => {
        if (state.markers[id]) {
            state.map.setView(state.markers[id].getLatLng(), 16);
            state.markers[id].openPopup();
            ui.toggleBottomSheet();
        }
    },

    // --- Driver Logic ---
    selectRoute: (name, prefix) => {
        state.tempRouteName = name;
        state.tempRoutePrefix = prefix;
        const savedName = localStorage.getItem('saved_username');
        if (savedName) document.getElementById('driver-username-input').value = savedName;
        document.getElementById('route-sub-select').classList.remove('hidden');
    },
    confirmRoute: (direction) => {
        const name = state.tempRouteName;
        const prefix = state.tempRoutePrefix;
        const fullRouteName = `${name} (${direction})`;
        const username = document.getElementById('driver-username-input').value.trim() || null;

        document.getElementById('route-sub-select').classList.add('hidden');
        document.getElementById('selection-loader').classList.remove('hidden');

        if (state.watchId) { navigator.geolocation.clearWatch(state.watchId); state.watchId = null; }

        let attempts = 0;
        const syncInterval = setInterval(() => {
            attempts++;
            if (state.isConnected || attempts > 30) {
                clearInterval(syncInterval);
                const assignedId = driver.assignNextId(prefix);
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
                if (username) {
                    nameContainer.classList.remove('hidden');
                    document.getElementById('driver-display-username').innerText = username;
                } else nameContainer.classList.add('hidden');

                document.getElementById('selection-loader').classList.add('hidden');
                state.isBroadcasting = false;
                app.updateBroadcastUI(false);
                ui.switchView('view-driver-dashboard');
                map.initDriverMap();
            }
        }, 100);
    },
    toggleBroadcast: () => driver.toggleBroadcast({
        startBroadcast: () => app.startBroadcast(),
        stopBroadcast: () => app.stopBroadcast()
    }),
    // Re-wrapping driver functions to provide callbacks
    startBroadcast: () => driver.startBroadcast({
        updateBroadcastUI: (isActive) => app.updateBroadcastUI(isActive),
        calculateDistance: utils.calculateDistance,
        stopBroadcast: () => app.stopBroadcast()
    }),
    stopBroadcast: () => driver.stopBroadcast({
        updateBroadcastUI: (isActive) => app.updateBroadcastUI(isActive),
        showSummary: () => app.showSummary()
    }),
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
            btn.classList.remove('from-red-500', 'to-red-600', 'hover:from-red-400', 'hover:to-red-500', 'animate-pulse');
            btn.classList.add('from-brand-500', 'to-brand-600', 'hover:from-brand-400', 'hover:to-brand-500');
            glow.style.opacity = '0';
            title.innerText = "Ready?";
            icon.classList.add('text-slate-300', 'dark:text-slate-600');
            icon.classList.remove('text-green-500');
        }
    },
    showSummary: () => {
        const modal = document.getElementById('trip-summary-modal');
        modal.classList.remove('opacity-0', 'pointer-events-none', 'z-[-1]');
        modal.classList.add('z-50');
        modal.style.opacity = '1';
        modal.style.pointerEvents = 'auto';
        if (window.confetti) confetti({ particleCount: 150, spread: 70, origin: { y: 0.6 } });
    },
    closeSummary: () => {
        if (window.confetti) try { window.confetti.reset(); } catch(e) {}
        const modal = document.getElementById('trip-summary-modal');
        modal.classList.add('opacity-0', 'pointer-events-none', 'z-[-1]');
        modal.classList.remove('z-50');
        modal.style.opacity = '0';
        app.goHome(); 
    },
    toggleBottomSheet: () => ui.toggleBottomSheet()
};

// Global exports for HTML events
window.app = app;
window.state = state;
window.closeWelcomeModal = ui.closeWelcomeModal;

window.addEventListener('DOMContentLoaded', app.init);
