import React from 'react';

const Landing = ({ onStudent, onDriver }) => {
  return (
    <div className="p-4 h-full z-10 flex flex-col justify-between w-full relative">
      <div className="flex-grow flex flex-col items-center justify-center w-full max-w-sm mx-auto">
        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-gradient-to-tr from-brand-500 to-orange-400 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-xl shadow-orange-500/30 transform rotate-3 animate-drive">
            <i className="fas fa-bus text-4xl text-white"></i>
          </div>
          <h1 className="text-4xl font-extrabold tracking-tight mb-1">
            <span className="text-slate-800 dark:text-white">UIU</span>
            <span className="text-brand-500">Bus Tracker</span>
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm">Next Gen Campus Transport</p>
        </div>

        <div className="grid gap-3 w-full">
          <button onClick={onStudent} className="glass group relative overflow-hidden p-5 rounded-2xl text-left hover:border-brand-500 transition-all duration-300">
            <div className="absolute right-0 top-0 h-full w-1 bg-brand-500 transform scale-y-0 group-hover:scale-y-100 transition-transform origin-top"></div>
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold mb-1">Bus Kothay</h3>
                <p className="text-[10px] text-slate-500 dark:text-slate-400">Real-time tracking & ETA</p>
              </div>
              <div className="w-10 h-10 bg-blue-50 dark:bg-slate-700 rounded-full flex items-center justify-center text-blue-500 group-hover:bg-brand-500 group-hover:text-white transition-colors">
                <i className="fas fa-map-location-dot text-lg"></i>
              </div>
            </div>
          </button>

          <button onClick={onDriver} className="glass group relative overflow-hidden p-5 rounded-2xl text-left hover:border-brand-500 transition-all duration-300">
            <div className="absolute right-0 top-0 h-full w-1 bg-brand-500 transform scale-y-0 group-hover:scale-y-100 transition-transform origin-top"></div>
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold mb-1">Start a Trip</h3>
                <p className="text-[10px] text-slate-500 dark:text-slate-400">Share location (PIN Required)</p>
              </div>
              <div className="w-10 h-10 bg-slate-100 dark:bg-slate-700 rounded-full flex items-center justify-center text-slate-600 dark:text-slate-300 group-hover:bg-brand-500 group-hover:text-white transition-colors">
                <i className="fas fa-id-card text-lg"></i>
              </div>
            </div>
          </button>
        </div>
      </div>

      <div className="pt-2 pb-4 text-center px-4 w-full shrink-0 z-50">
        <p className="text-xs text-slate-400 dark:text-slate-500 font-medium">
          Developed by <a href="https://www.facebook.com/naiimurr/" target="_blank" rel="noreferrer" className="text-brand-500 hover:underline">Naimur Rahman</a> (CSE 242) for UIU❤️
        </p>
      </div>
    </div>
  );
};

export default Landing;
