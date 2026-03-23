import React, { useState, useEffect } from 'react';
import Landing from './components/Landing';
import StudentView from './components/StudentView';
import DriverSelect from './components/DriverSelect';
import DriverDashboard from './components/DriverDashboard';
import { useMqttStats } from './hooks/useMqttStats';
import { CONFIG } from './utils/constants';

function App() {
  const [view, setView] = useState('landing'); // 'landing', 'student', 'driver-select', 'driver-dashboard'
  const [theme, setTheme] = useState('light');
  const [showWelcome, setShowWelcome] = useState(true);
  const [driverPinModal, setDriverPinModal] = useState(false);
  const [pinInput, setPinInput] = useState('');

  // Driver State
  const [driverInfo, setDriverInfo] = useState({
    id: null,
    route: null,
    destination: null,
    direction: null,
    username: null
  });

  const { client, isConnected, activeBuses, activeUsers, connectMqtt, disconnectMqtt } = useMqttStats(view);

  useEffect(() => {
    // Load theme
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark' || (!savedTheme && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
      document.documentElement.classList.add('dark');
      setTheme('dark');
    } else {
      document.documentElement.classList.remove('dark');
      setTheme('light');
    }

    // Check saved driver
    const savedDriverId = localStorage.getItem('active_driver_id');
    if (savedDriverId) {
      setDriverPinModal(true);
    }
  }, []);

  const toggleTheme = () => {
    const html = document.documentElement;
    if (html.classList.contains('dark')) {
      html.classList.remove('dark');
      localStorage.setItem('theme', 'light');
      setTheme('light');
    } else {
      html.classList.add('dark');
      localStorage.setItem('theme', 'dark');
      setTheme('dark');
    }
  };

  const handleStudentRole = () => {
    if (!CONFIG.mqtt.password) {
      CONFIG.mqtt.password = 'Sohan786@';
    }
    connectMqtt();
    setView('student');
  };

  const checkPin = () => {
    if (pinInput === 'Sohan786@') {
      CONFIG.mqtt.password = pinInput;
      setDriverPinModal(false);
      setPinInput('');
      connectMqtt();
      setView('driver-select');
    } else {
      alert("Incorrect PIN! Access Denied.");
      setPinInput('');
    }
  };

  const goHome = async (isBroadcasting, stopBroadcastCallback) => {
    if (isBroadcasting) {
      const confirmExit = window.confirm("Stop broadcasting and exit?");
      if (!confirmExit) return;
      if (stopBroadcastCallback) await stopBroadcastCallback();
    }

    setDriverInfo({ id: null, route: null, destination: null, direction: null, username: null });

    localStorage.removeItem('active_driver_id');
    localStorage.removeItem('active_driver_route');
    localStorage.removeItem('active_driver_dest');
    localStorage.removeItem('active_driver_dir');
    localStorage.removeItem('active_driver_username');

    disconnectMqtt();
    setView('landing');
  };

  return (
    <>
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute -top-20 -left-20 w-64 h-64 bg-brand-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-float"></div>
        <div className="absolute top-1/2 -right-20 w-72 h-72 bg-purple-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-float" style={{ animationDelay: '2s' }}></div>
        <div className="absolute -bottom-20 left-1/3 w-80 h-80 bg-pink-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-float" style={{ animationDelay: '4s' }}></div>
      </div>

      {view === 'landing' && (
        <div id="global-controls" className="z-[500] relative transition-opacity duration-300 pointer-events-none">
          <a href="https://naiimur-rahman.github.io/UIU-CGPA-Calculator/" target="_blank" rel="noreferrer" className="fixed top-4 left-4 pointer-events-auto glass px-3 py-2 rounded-full flex items-center gap-2 text-slate-600 dark:text-slate-300 hover:scale-105 transition-transform shadow-lg group border border-white/20 active:scale-95">
            <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center text-white shadow-md shadow-green-500/20">
              <i className="fas fa-calculator text-[10px]"></i>
            </div>
            <span className="text-xs font-bold pr-1 group-hover:text-green-500 transition-colors">CGPA</span>
          </a>

          <button onClick={toggleTheme} className="fixed top-4 right-4 w-10 h-10 rounded-full glass flex items-center justify-center text-slate-600 dark:text-yellow-400 shadow-lg hover:scale-110 transition-transform cursor-pointer pointer-events-auto">
            {theme === 'dark' ? <i className="fas fa-sun"></i> : <i className="fas fa-moon"></i>}
          </button>
        </div>
      )}

      {showWelcome && view === 'landing' && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md transition-opacity duration-500">
          <div className="bg-orange-50 dark:bg-slate-900 w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh] animate-float" style={{ animationDuration: '5s' }}>
            <div className="p-5 border-b border-slate-200/50 dark:border-slate-700/50 flex justify-between items-center bg-white/50 dark:bg-slate-800/50">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-brand-500 rounded-lg flex items-center justify-center text-white">
                  <i className="fas fa-bullhorn text-sm"></i>
                </div>
                <h3 className="font-bold text-lg text-slate-800 dark:text-white">Shuttle Tracker</h3>
              </div>
              <button onClick={() => setShowWelcome(false)} className="w-8 h-8 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 flex items-center justify-center transition-colors">
                <i className="fas fa-times text-slate-500"></i>
              </button>
            </div>
            <div className="p-6 overflow-y-auto text-sm leading-relaxed text-slate-600 dark:text-slate-300 space-y-4">
              <p className="font-bold text-brand-600 dark:text-brand-400">Welcome to UIU Bus Tracker v2.1!</p>
              <p>This website is designed to help the UIU Community.<br />Find and track buses easily in real-time.❤️</p>
              <hr className="border-slate-200 dark:border-slate-700" />
              <h4 className="font-bold text-slate-800 dark:text-white">✨ New Updates:</h4>
              <ul className="list-disc pl-5 space-y-1">
                <li><strong>ETA Calculation:</strong> See estimated time to arrival.</li>
                <li><strong>Secure Driver Mode:</strong> PIN protected broadcasting.</li>
                <li><strong>Audio Feedback:</strong> Beeps when trip starts/ends.</li>
                <li><strong>Smart Battery:</strong> Reduced processing power usage.</li>
              </ul>
              <div className="h-10"></div>
            </div>
            <div className="p-4 bg-slate-50/80 dark:bg-slate-900/80 border-t border-slate-200/50 dark:border-slate-700/50 backdrop-blur-sm">
              <button onClick={() => setShowWelcome(false)} className="w-full py-3.5 bg-brand-500 hover:bg-brand-600 text-white font-bold rounded-xl shadow-lg shadow-orange-500/20 active:scale-95 transition-all">
                Ok!
              </button>
            </div>
          </div>
        </div>
      )}

      {driverPinModal && (
        <div className="fixed inset-0 z-[600] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 w-full max-w-xs rounded-2xl p-6 shadow-2xl">
            <h3 className="font-bold text-lg mb-4 text-center">Enter Driver PIN</h3>
            <input
              type="password"
              value={pinInput}
              onChange={(e) => setPinInput(e.target.value)}
              className="w-full bg-slate-100 dark:bg-slate-800 p-3 rounded-xl mb-4 text-center text-2xl tracking-widest font-mono focus:ring-2 ring-brand-500 outline-none"
              placeholder="****"
              maxLength="10"
              autoFocus
            />
            <div className="grid grid-cols-2 gap-3">
              <button onClick={() => setDriverPinModal(false)} className="p-3 bg-slate-200 dark:bg-slate-800 rounded-xl font-bold text-slate-500">Cancel</button>
              <button onClick={checkPin} className="p-3 bg-brand-500 text-white rounded-xl font-bold">Login</button>
            </div>
          </div>
        </div>
      )}

      <div className={`view-section ${view === 'landing' ? 'view-active' : ''}`}>
        <Landing
          onStudent={handleStudentRole}
          onDriver={() => setDriverPinModal(true)}
        />
      </div>

      <div className={`view-section ${view === 'student' ? 'view-active' : ''}`}>
        {view === 'student' && (
          <StudentView
            goHome={() => goHome()}
            activeBuses={activeBuses}
            activeUsersCount={activeUsers.size}
            isConnected={isConnected}
            theme={theme}
          />
        )}
      </div>

      <div className={`view-section ${view === 'driver-select' ? 'view-active' : ''}`}>
        {view === 'driver-select' && (
          <DriverSelect
            goHome={() => goHome()}
            setDriverInfo={setDriverInfo}
            setView={setView}
            activeBuses={activeBuses}
            isConnected={isConnected}
          />
        )}
      </div>

      <div className={`view-section ${view === 'driver-dashboard' ? 'view-active' : ''}`}>
        {view === 'driver-dashboard' && (
          <DriverDashboard
            goHome={goHome}
            driverInfo={driverInfo}
            client={client}
            isConnected={isConnected}
            activeBuses={activeBuses}
            theme={theme}
          />
        )}
      </div>
    </>
  )
}

export default App;
