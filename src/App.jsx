import React from 'react';
import Layout from './components/Layout';
import Hero from './components/Hero';
import Stats from './components/Stats';
import { motion } from 'framer-motion';

function App() {
  return (
    <Layout>
      <div className="flex flex-col w-full">
        {/* Navigation / Header */}
        <motion.nav
          initial={{ y: -100 }}
          animate={{ y: 0 }}
          transition={{ duration: 0.5 }}
          className="fixed top-0 left-0 right-0 z-50 flex justify-between items-center p-6 pointer-events-none"
        >
          <div className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-md p-2 px-4 rounded-full border-2 border-slate-900 dark:border-white pointer-events-auto shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,1)]">
            <span className="font-black text-xl tracking-tighter">UIU<span className="text-brand-500">BUS</span></span>
          </div>

          <div className="pointer-events-auto">
             {/* Theme Toggle could go here */}
          </div>
        </motion.nav>

        <Hero />

        <div className="relative z-20 bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm border-t-2 border-slate-900 dark:border-slate-700">
           <Stats />
        </div>

        {/* Footer */}
        <footer className="py-10 text-center text-slate-500 dark:text-slate-400 text-sm font-bold tracking-widest uppercase relative z-20">
            <p>© {new Date().getFullYear()} UIU Bus Tracker Project</p>
            <p className="mt-2 text-[10px] opacity-60">Designed with React & Neo-Brutalism</p>
        </footer>
      </div>
    </Layout>
  );
}

export default App;
