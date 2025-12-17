import React from 'react';
import CountUp from 'react-countup';
import { useMqttStats } from '../hooks/useMqttStats';
import { motion } from 'framer-motion';

const StatCard = ({ label, value, icon, delay }) => {
    return (
        <motion.div
            className="glass p-8 flex flex-col items-center justify-center relative overflow-hidden group hover:scale-105 transition-transform duration-300"
            initial={{ opacity: 0, y: 50 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: delay, duration: 0.5 }}
        >
             <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity transform scale-150 group-hover:rotate-12 duration-500">
                <i className={`fas ${icon} text-6xl`}></i>
            </div>

            <div className="text-5xl md:text-7xl font-black font-mono text-slate-800 dark:text-white mb-2 tracking-tighter">
                <CountUp end={value} duration={2.5} separator="," className="odometer-effect" />
            </div>
            <div className="text-sm font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">
                {label}
            </div>
        </motion.div>
    );
};

const Stats = () => {
    const { totalUsers, activeBuses, isConnected } = useMqttStats();

    // Fallback numbers for demo if offline or 0
    const displayUsers = totalUsers > 0 ? totalUsers : 142;
    const displayBuses = activeBuses > 0 ? activeBuses : 12;
    const totalTrips = 8540; // Static legacy stat

    return (
        <section className="py-20 px-4 relative z-10">
            <div className="max-w-6xl mx-auto">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    <StatCard
                        label="Active Users"
                        value={displayUsers}
                        icon="fa-users"
                        delay={0}
                    />
                    <StatCard
                        label="Buses Online"
                        value={displayBuses}
                        icon="fa-bus"
                        delay={0.2}
                    />
                    <StatCard
                        label="Total Trips"
                        value={totalTrips}
                        icon="fa-route"
                        delay={0.4}
                    />
                </div>

                <div className="mt-8 text-center">
                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold border-2 ${isConnected ? 'bg-green-100 text-green-700 border-green-700' : 'bg-red-100 text-red-700 border-red-700'}`}>
                        <span className={`w-2 h-2 rounded-full mr-2 ${isConnected ? 'bg-green-600 animate-pulse' : 'bg-red-600'}`}></span>
                        {isConnected ? 'LIVE SERVER CONNECTED' : 'CONNECTING TO SERVER...'}
                    </span>
                </div>
            </div>
        </section>
    );
};

export default Stats;
