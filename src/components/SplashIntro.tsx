import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles, ShieldCheck, Zap } from 'lucide-react';

interface SplashIntroProps {
  logoUrl?: string;
  onComplete: () => void;
}

export default function SplashIntro({ logoUrl, onComplete }: SplashIntroProps) {
  const [progress, setProgress] = useState(0);
  const [showSkip, setShowSkip] = useState(false);

  // Auto-increment progress over exactly 2.5 seconds (2500ms)
  const onCompleteRef = React.useRef(onComplete);
  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  useEffect(() => {
    const duration = 2500;
    const intervalTime = 50;
    const steps = duration / intervalTime;
    const increment = 100 / steps;

    const timer = setInterval(() => {
      setProgress((prev) => {
        const next = prev + increment;
        if (next >= 100) {
          clearInterval(timer);
          return 100;
        }
        return next;
      });
    }, intervalTime);

    // Show skip option after 1 second
    const skipTimer = setTimeout(() => {
      setShowSkip(true);
    }, 1000);

    // End splash after 2.5 seconds
    const endTimer = setTimeout(() => {
      onCompleteRef.current();
    }, duration);

    return () => {
      clearInterval(timer);
      clearTimeout(skipTimer);
      clearTimeout(endTimer);
    };
  }, []);

  // Premium text characters for cool staggered animation
  const titleText = "LG MULTIMARCAS";
  const subtitleText = "PREMIUM STREETWEAR & HYPE COUTURE";

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#030303] text-white overflow-hidden font-sans">
      
      {/* 3D Moving Ambient Background Grid */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(212,175,55,0.08)_0%,transparent_70%)]" />
      
      {/* Elegant Moving Light Lines */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-0 left-0 w-full h-full bg-[linear-gradient(rgba(212,175,55,0.1)_1px,transparent_1px),linear-gradient(90deg,rgba(212,175,55,0.1)_1px,transparent_1px)] bg-[size:40px_40px]" />
      </div>

      {/* Luxury Golden Laser/Scan Line that pans down */}
      <motion.div 
        initial={{ top: '-10%' }}
        animate={{ top: '110%' }}
        transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
        className="absolute left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-[#d4af37]/60 to-transparent shadow-[0_0_15px_#d4af37]"
      />

      {/* Cyber/Hype decorative badges on top left & top right */}
      <div className="absolute top-6 left-6 flex items-center gap-2 text-[9px] font-mono tracking-widest text-[#d4af37]/60 uppercase border border-[#d4af37]/20 px-2.5 py-1 rounded bg-black/60 select-none">
        <Zap className="h-3 w-3 animate-pulse" />
        EST. 2026 / HYPE DIVISION
      </div>
      
      <div className="absolute top-6 right-6 flex items-center gap-1.5 text-[9px] font-mono tracking-widest text-emerald-500/60 uppercase border border-emerald-500/20 px-2.5 py-1 rounded bg-black/60 select-none">
        <ShieldCheck className="h-3 w-3" />
        AUTHENTICITY VERIFIED
      </div>

      {/* Central Content */}
      <div className="relative flex flex-col items-center text-center px-4 max-w-lg z-10">
        
        {/* Glowing Logo Container with Scale/Rotation entry */}
        <motion.div
          initial={{ scale: 0.3, rotate: -45, opacity: 0 }}
          animate={{ scale: [0.3, 1.1, 1], rotate: 0, opacity: 1 }}
          transition={{ duration: 1.5, ease: [0.16, 1, 0.3, 1] }}
          className="relative h-28 w-28 md:h-36 md:w-36 flex items-center justify-center rounded-full bg-black p-[2px] shadow-[0_0_50px_rgba(212,175,55,0.25)] border border-[#d4af37]/50"
        >
          {/* Neon spinning border effect */}
          <div className="absolute inset-0 rounded-full bg-gradient-to-r from-[#d4af37] via-yellow-600 to-amber-500 animate-spin opacity-80" style={{ animationDuration: '6s' }} />
          
          {/* Black core container */}
          <div className="absolute inset-[3px] rounded-full bg-zinc-950 flex items-center justify-center overflow-hidden">
            <img
              src={logoUrl || 'https://i.postimg.cc/ncDXkT6v/Chat-GPT-Image-7-de-jul-de-2026-16-19-45.png'}
              alt="Logo LG Multimarcas"
              referrerPolicy="no-referrer"
              className="h-full w-full object-cover"
            />
          </div>
        </motion.div>

        {/* Floating holographic elements behind logo */}
        <div className="absolute -z-10 h-64 w-64 bg-yellow-500/5 blur-3xl rounded-full" />

        {/* Brand Name with Staggered Glowing Letters */}
        <div className="mt-8 flex gap-[1px] md:gap-1 overflow-hidden select-none">
          {titleText.split("").map((letter, index) => (
            <motion.span
              key={index}
              initial={{ y: 80, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{
                delay: 0.5 + index * 0.08,
                duration: 1.2,
                ease: [0.16, 1, 0.3, 1]
              }}
              className={`font-sans text-2xl md:text-4xl font-black tracking-widest ${
                letter === " " ? "w-2 md:w-4" : "text-white hover:text-[#d4af37] transition-all"
              }`}
              style={{
                textShadow: letter !== " " ? '0 0 10px rgba(255,255,255,0.2)' : 'none'
              }}
            >
              {letter}
            </motion.span>
          ))}
        </div>

        {/* Luxury concept slogan line */}
        <motion.p
          initial={{ opacity: 0, letterSpacing: "0.1em" }}
          animate={{ opacity: 0.8, letterSpacing: "0.22em" }}
          transition={{ delay: 1.8, duration: 2 }}
          className="mt-3.5 font-mono text-[9px] md:text-[11px] text-zinc-400 uppercase tracking-widest"
        >
          {subtitleText}
        </motion.p>

        {/* Loading progress indicators */}
        <div className="mt-12 w-60 md:w-72 space-y-2">
          {/* Horizontal sleek loader track */}
          <div className="h-[3px] w-full bg-zinc-900 rounded-full overflow-hidden border border-zinc-850">
            <motion.div 
              className="h-full bg-gradient-to-r from-yellow-600 via-[#d4af37] to-amber-400 shadow-[0_0_8px_#d4af37]"
              style={{ width: `${progress}%` }}
              layoutId="progress-bar-fill"
            />
          </div>

          <div className="flex justify-between items-center font-mono text-[9px] text-zinc-500">
            <span className="flex items-center gap-1">
              <span className="h-1.5 w-1.5 rounded-full bg-[#d4af37] animate-pulse" />
              SINCRO FIRESTORE
            </span>
            <span>{Math.floor(progress)}% Loaded</span>
          </div>
        </div>

      </div>

      {/* Lower decorative indicators */}
      <div className="absolute bottom-8 text-[9px] font-mono text-zinc-600 tracking-widest uppercase flex items-center gap-2 select-none">
        <span>COLLECTIONS V1</span>
        <span>•</span>
        <span>SECURITY ENCRYPTED</span>
        <span>•</span>
        <span>SECURE GATEWAY</span>
      </div>

      {/* Elegant Skip Button */}
      {showSkip && (
        <motion.button
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          onClick={onComplete}
          className="absolute bottom-20 px-4 py-2 border border-zinc-800 hover:border-[#d4af37]/40 bg-zinc-950/80 hover:bg-black rounded-full text-[10px] font-mono text-zinc-400 hover:text-[#d4af37] uppercase tracking-widest transition-all cursor-pointer"
        >
          Pular Introdução (Skip)
        </motion.button>
      )}

    </div>
  );
}
