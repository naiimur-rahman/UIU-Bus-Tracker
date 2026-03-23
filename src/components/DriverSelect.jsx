import React, { useState } from 'react';

const DriverSelect = ({ goHome, setDriverInfo, setView, activeBuses, isConnected }) => {
  const [subSelectOpen, setSubSelectOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [tempRoute, setTempRoute] = useState({ name: '', prefix: '' });
  const [username, setUsername] = useState(localStorage.getItem('saved_username') || '');

  const selectRoute = (name, prefix) => {
    setTempRoute({ name, prefix });
    setSubSelectOpen(true);
  };

  const assignNextId = (prefix) => {
    const activeIds = Object.keys(activeBuses)
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

  const confirmRoute = (direction) => {
    setSubSelectOpen(false);
    setLoading(true);

    const name = tempRoute.name;
    const prefix = tempRoute.prefix;
    const fullRouteName = `${name} (${direction})`;
    const finalUsername = username.trim() || null;

    let attempts = 0;
    const syncInterval = setInterval(() => {
        attempts++;
        if (isConnected || attempts > 30) {
            clearInterval(syncInterval);

            const assignedId = assignNextId(prefix);

            setDriverInfo({
              id: assignedId,
              route: fullRouteName,
              destination: name,
              direction: direction,
              username: finalUsername
            });

            localStorage.setItem('active_driver_id', assignedId);
            localStorage.setItem('active_driver_route', fullRouteName);
            localStorage.setItem('active_driver_dest', name);
            localStorage.setItem('active_driver_dir', direction);

            if (finalUsername) {
                localStorage.setItem('active_driver_username', finalUsername);
                localStorage.setItem('saved_username', finalUsername);
            } else {
                localStorage.removeItem('active_driver_username');
            }

            setLoading(false);
            setView('driver-dashboard');
        }
    }, 100);
  };

  return (
    <div className="flex flex-col h-full z-10 p-6 bg-slate-50 dark:bg-slate-900 w-full">
      <div className="flex items-center mb-8 mt-4 shrink-0">
        <button onClick={goHome} className="w-10 h-10 rounded-full glass flex items-center justify-center text-slate-500 hover:text-brand-500 transition-colors mr-4">
          <i className="fas fa-arrow-left"></i>
        </button>
        <h2 className="text-2xl font-bold">Select Route</h2>
      </div>

      <div className={`fixed inset-0 z-50 flex items-end justify-center sm:items-center bg-black/60 backdrop-blur-sm transition-all duration-300 ${subSelectOpen ? '' : 'hidden'}`}>
        <div className="w-full max-w-[380px] bg-white dark:bg-slate-900 rounded-t-[30px] sm:rounded-[30px] shadow-[0_-10px_40px_rgba(0,0,0,0.2)] overflow-hidden transform transition-all">
            <div className="w-full flex justify-center pt-3 pb-1">
                <div className="w-12 h-1 bg-slate-200 dark:bg-slate-700 rounded-full"></div>
            </div>

            <div className="p-5 pt-2">
                <div className="flex justify-between items-center mb-5">
                    <div>
                        <h2 className="text-xl font-extrabold text-slate-800 dark:text-white tracking-tight">Let's Go</h2>
                        <p className="text-xs font-semibold text-slate-400">Select your direction</p>
                    </div>
                    <button onClick={() => setSubSelectOpen(false)} className="bg-slate-100 dark:bg-slate-800 p-1.5 rounded-full text-slate-400 hover:text-red-500 transition-colors">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"></path></svg>
                    </button>
                </div>

                <div className="mb-5">
                    <div className="relative flex items-center bg-slate-100 dark:bg-slate-800 rounded-xl p-1.5 focus-within:ring-2 ring-indigo-500 transition-all">
                        <div className="p-2 bg-white dark:bg-slate-700 rounded-lg shadow-sm text-slate-400">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                        </div>
                        <input
                          type="text"
                          placeholder="Captain Name (Optional)"
                          maxLength="15"
                          value={username}
                          onChange={(e) => setUsername(e.target.value)}
                          className="w-full bg-transparent border-none pl-3 text-base font-semibold text-slate-800 dark:text-white placeholder:text-slate-400 focus:ring-0 outline-none"
                        />
                    </div>
                </div>

                <div className="flex flex-col gap-3">
                    <button onClick={() => confirmRoute('From UIU')} className="group w-full bg-rose-500 hover:bg-rose-600 text-white rounded-2xl p-2 pr-4 transition-all active:scale-95 shadow-lg shadow-rose-200/50 dark:shadow-none flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="bg-white/20 h-12 w-12 rounded-xl flex items-center justify-center backdrop-blur-md">
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"></path></svg>
                            </div>
                            <div className="text-left">
                                <div className="text-base font-extrabold">FROM UIU</div>
                                <div className="text-[10px] font-bold text-rose-100 uppercase tracking-wider opacity-90">Leaving Campus</div>
                            </div>
                        </div>
                        <svg className="w-5 h-5 text-rose-100 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7"></path></svg>
                    </button>

                    <button onClick={() => confirmRoute('To UIU')} className="group w-full bg-emerald-500 hover:bg-emerald-600 text-white rounded-2xl p-2 pr-4 transition-all active:scale-95 shadow-lg shadow-emerald-200/50 dark:shadow-none flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="bg-white/20 h-12 w-12 rounded-xl flex items-center justify-center backdrop-blur-md">
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"></path></svg>
                            </div>
                            <div className="text-left">
                                <div className="text-base font-extrabold">TO UIU</div>
                                <div className="text-[10px] font-bold text-emerald-100 uppercase tracking-wider opacity-90">Going to Campus</div>
                            </div>
                        </div>
                        <svg className="w-5 h-5 text-emerald-100 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7"></path></svg>
                    </button>
                </div>

                <div className="h-4"></div>
            </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 overflow-y-auto pb-4">
          <button onClick={() => selectRoute('Kuril', 'K')} className="glass p-6 rounded-xl flex flex-col items-center justify-center hover:bg-brand-50 dark:hover:bg-slate-800 transition-all">
              <i className="fas fa-road text-3xl text-blue-500 mb-3"></i>
              <span className="font-bold">Kuril</span>
              <span className="text-xs text-slate-400 mt-1">Auto Assign</span>
          </button>
          <button onClick={() => selectRoute('Notun Bazar', 'N')} className="glass p-6 rounded-xl flex flex-col items-center justify-center hover:bg-brand-50 dark:hover:bg-slate-800 transition-all">
              <i className="fas fa-shop text-3xl text-green-500 mb-3"></i>
              <span className="font-bold">Notun Bazar</span>
              <span className="text-xs text-slate-400 mt-1">Auto Assign</span>
          </button>
          <button onClick={() => selectRoute('Aftab Nagar', 'A')} className="glass p-6 rounded-xl flex flex-col items-center justify-center hover:bg-brand-50 dark:hover:bg-slate-800 transition-all">
              <i className="fas fa-building text-3xl text-purple-500 mb-3"></i>
              <span className="font-bold">Aftab Nagar</span>
              <span className="text-xs text-slate-400 mt-1">Auto Assign</span>
          </button>
          <button onClick={() => selectRoute('Transport', 'R')} className="glass p-6 rounded-xl flex flex-col items-center justify-center hover:bg-brand-50 dark:hover:bg-slate-800 transition-all">
              <i className="fas fa-bus-alt text-3xl text-orange-500 mb-3"></i>
              <span className="font-bold">Transport</span>
              <span className="text-xs text-slate-400 mt-1">Routes 1-5...</span>
          </button>
      </div>

      {loading && (
        <div className="absolute inset-0 bg-white/80 dark:bg-slate-900/80 backdrop-blur z-50 flex flex-col items-center justify-center">
            <div className="loader mb-4"></div>
            <p className="font-bold animate-pulse">Syncing & Assigning ID...</p>
        </div>
      )}
    </div>
  );
};

export default DriverSelect;
