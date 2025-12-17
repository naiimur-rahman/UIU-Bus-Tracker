import React, { useRef } from 'react';
import {
  motion,
  useScroll,
  useTransform,
  useSpring,
  useVelocity,
  useAnimationFrame,
  useMotionValue
} from 'framer-motion';
import { wrap } from '@motionone/utils';

const ParallaxText = ({ children, baseVelocity = 100 }) => {
  const baseX = useMotionValue(0);
  const { scrollY } = useScroll();
  const scrollVelocity = useVelocity(scrollY);
  const smoothVelocity = useSpring(scrollVelocity, {
    damping: 50,
    stiffness: 400
  });
  const velocityFactor = useTransform(smoothVelocity, [0, 1000], [0, 5], {
    clamp: false
  });

  const x = useTransform(baseX, (v) => `${wrap(-20, -45, v)}%`);

  const directionFactor = useRef(1);
  useAnimationFrame((t, delta) => {
    let moveBy = directionFactor.current * baseVelocity * (delta / 1000);

    // This makes the text move faster as you scroll
    if (velocityFactor.get() < 0) {
      directionFactor.current = -1;
    } else if (velocityFactor.get() > 0) {
      directionFactor.current = 1;
    }

    moveBy += directionFactor.current * moveBy * velocityFactor.get();

    baseX.set(baseX.get() + moveBy);
  });

  return (
    <div className="overflow-hidden m-0 whitespace-nowrap flex flex-nowrap">
      <motion.div className="font-black uppercase text-[9rem] md:text-[14rem] leading-[0.85] tracking-tighter opacity-10 dark:opacity-5 select-none flex whitespace-nowrap flex-nowrap" style={{ x }}>
        <span className="block mr-8">{children} </span>
        <span className="block mr-8">{children} </span>
        <span className="block mr-8">{children} </span>
        <span className="block mr-8">{children} </span>
      </motion.div>
    </div>
  );
}

const Hero = () => {
  const ref = useRef(null);
  const { scrollYProgress } = useScroll({ target: ref });
  const y = useTransform(scrollYProgress, [0, 1], [0, 200]);

  return (
    <section ref={ref} className="min-h-screen flex flex-col justify-center items-center relative py-20 overflow-hidden">

      {/* Background Kinetic Typography (Now Reactive) */}
      <div className="absolute inset-0 flex flex-col justify-center pointer-events-none z-0 rotate-[-5deg] scale-110">
         <ParallaxText baseVelocity={-2}>UIU BUS TRACKER</ParallaxText>
         <ParallaxText baseVelocity={2}>REALTIME CAMPUS</ParallaxText>
         <ParallaxText baseVelocity={-2}>NEXT GEN TRANSPORT</ParallaxText>
      </div>

      {/* Main Content */}
      <motion.div
        className="z-10 text-center max-w-4xl px-4 mt-12"
        style={{ y }}
        initial={{ opacity: 0, y: 100 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
      >
        <div className="mb-8 inline-block">
          <motion.div
            className="w-24 h-24 bg-brand-500 rounded-2xl flex items-center justify-center mx-auto shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] dark:shadow-[8px_8px_0px_0px_rgba(255,255,255,1)] border-2 border-black dark:border-white rotate-3"
            whileHover={{ rotate: 0, scale: 1.1 }}
          >
             <i className="fas fa-bus text-4xl text-white"></i>
          </motion.div>
        </div>

        <h1 className="text-6xl md:text-8xl font-black mb-6 tracking-tight text-slate-900 dark:text-white drop-shadow-xl">
          NEXT GEN <br />
          <span className="text-brand-500">CAMPUS</span> TRANSPORT
        </h1>

        <p className="text-xl md:text-2xl text-slate-600 dark:text-slate-300 font-medium mb-10 max-w-2xl mx-auto bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm p-4 rounded-xl border-2 border-slate-200 dark:border-slate-800">
          Track university buses in real-time. Never miss a ride again.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button className="neo-button text-xl uppercase tracking-wider">
              Launch App
            </button>
            <button className="neo-border bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-bold py-3 px-6 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors uppercase tracking-wider">
              View Schedule
            </button>
        </div>
      </motion.div>
    </section>
  );
};

export default Hero;
