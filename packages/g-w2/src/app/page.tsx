'use client';

import { useEffect, useState } from 'react';

const slogans = [
  "Turn chats into apps",
  "Prompt. Ship. Repeat.",
  "Build anything from a chat",
  "Ideas → Apps, instantly",
  "From zero to MVP in minutes",
  "Your cofounder in the command line",
  "Draft, iterate, deploy",
  "Ship faster than you can type",
  "Design in text, deliver in code",
  "Dream it. Prompt it. Run it.",
  "Chat-native app building",
  "From prompt to product",
  "One prompt, infinite apps",
  "Stop scaffolding. Start shipping.",
  "Prototype at the speed of thought",
  "Make conversations executable"
];

export default function Landing() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const interval = setInterval(() => {
      setIsVisible(false);
      setTimeout(() => {
        setCurrentIndex((prev) => (prev + 1) % slogans.length);
        setIsVisible(true);
      }, 400);
    }, 2800);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="relative h-[100dvh] w-full overflow-hidden bg-black text-white">
      {/* Enhanced animated aurora background layers */}
      <div className="absolute inset-0 bg-aurora-layer-1" />
      <div className="absolute inset-0 bg-aurora-layer-2" />
      <div className="absolute inset-0 bg-aurora-layer-3" />
      
      {/* Floating particles overlay */}
      <div className="absolute inset-0 bg-particles" />
      
      {/* Main content - centered */}
      <main className="relative z-10 h-full flex flex-col items-center justify-center px-6">
        <h1 className="text-center text-[clamp(28px,6vw,64px)] font-medium tracking-tight mb-4">
          Turn Chats into Apps
        </h1>
        
        {/* Rotating slogans */}
        <div className="mt-4 h-8 md:h-10 overflow-hidden flex items-center justify-center">
          <span
            className={`inline-block text-center text-[clamp(18px,3vw,32px)] font-light transition-all duration-[400ms] ease-in-out ${
              isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-2'
            }`}
          >
            {slogans[currentIndex]}
          </span>
        </div>
      </main>
      
      {/* Start Prompting arrow pointing left - bottom left */}
      <div className="absolute left-6 md:left-8 bottom-[5%] z-20 flex items-center gap-3 arrow-point-left">
        <div className="flex items-center gap-2 text-white/80 font-medium text-sm md:text-base">
          <svg 
            className="w-5 h-5 md:w-6 md:h-6 animate-bounce-horizontal" 
            fill="none" 
            viewBox="0 0 24 24" 
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          <span>Start prompting</span>
        </div>
      </div>
    </div>
  );
}
