import React, { useEffect, useState } from 'react';
import { StrataLogo } from '../Common/StrataLogo';

export function AppLoadingScreen({ isReady }: { isReady: boolean }) {
  const [visible, setVisible] = useState(true);
  const [statusText, setStatusText] = useState('Initializing StrataGit…');
  const [progress, setProgress] = useState(15);

  useEffect(() => {
    const timer1 = setTimeout(() => {
      setStatusText('Loading repositories and branch hierarchy…');
      setProgress(35);
    }, 500);

    const timer2 = setTimeout(() => {
      setStatusText('Indexing commit strata & visual graph…');
      setProgress(65);
    }, 1100);

    const timer3 = setTimeout(() => {
      setStatusText('Configuring diff engine & Git Flow workflow…');
      setProgress(85);
    }, 1700);

    const timer4 = setTimeout(() => {
      setStatusText('Synchronizing workspace and tools…');
      setProgress(95);
    }, 2200);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);
      clearTimeout(timer4);
    };
  }, []);

  useEffect(() => {
    if (isReady) {
      setProgress(100);
      setStatusText('Welcome to StrataGit');
      const timer = setTimeout(() => {
        setVisible(false);
      }, 550);
      return () => clearTimeout(timer);
    }
  }, [isReady]);

  if (!visible) return null;

  return (
    <div
      className={`fixed inset-0 z-[100] flex flex-col items-center justify-center bg-base transition-opacity duration-600 ease-out select-none ${
        isReady ? 'opacity-0 pointer-events-none' : 'opacity-100'
      }`}
    >
      {/* Background ambient radial glow */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[550px] h-[550px] bg-accent/10 rounded-full blur-3xl animate-pulse-ring" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] bg-cyan-500/10 rounded-full blur-2xl" />
      </div>

      <div className="relative z-10 flex flex-col items-center max-w-sm px-6 text-center">
        {/* Animated Brand Strata Logo Container */}
        <div className="relative mb-6">
          <div className="absolute inset-0 rounded-2xl bg-gradient-to-tr from-cyan-500 to-indigo-600 blur-xl opacity-60 animate-pulse" />
          <div className="relative">
            <StrataLogo size={76} animated />
          </div>
        </div>

        {/* Animated SVG Graph Connection Curve */}
        <div className="w-48 h-8 mb-3 overflow-visible">
          <svg viewBox="0 0 192 32" className="w-full h-full overflow-visible">
            <defs>
              <linearGradient id="grad-line" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#38bdf8" />
                <stop offset="50%" stopColor="#818cf8" />
                <stop offset="100%" stopColor="#34d399" />
              </linearGradient>
            </defs>
            <path
              d="M 10 16 Q 60 2, 96 16 T 182 16"
              fill="none"
              stroke="url(#grad-line)"
              strokeWidth="2.5"
              strokeLinecap="round"
              className="animate-branch-draw"
            />
            <circle cx="10" cy="16" r="3.5" fill="#38bdf8" />
            <circle cx="96" cy="16" r="4.5" fill="#818cf8" className="animate-pulse" />
            <circle cx="182" cy="16" r="3.5" fill="#34d399" />
          </svg>
        </div>

        {/* Brand Name */}
        <h1 className="text-2xl font-bold tracking-wider text-fg uppercase font-mono mb-1 flex items-center gap-1.5">
          Strata<span className="text-accent">Git</span>
        </h1>
        <p className="text-xs text-dim mb-6">Visual commit strata &amp; effortless Git workflow</p>

        {/* Progress Bar */}
        <div className="w-64 h-1.5 bg-panel3 rounded-full overflow-hidden mb-3 relative border border-edge/60">
          <div
            className="h-full bg-gradient-to-r from-cyan-500 via-blue-500 to-emerald-400 rounded-full transition-all duration-300 ease-out shadow-sm shadow-cyan-500/50"
            style={{ width: `${progress}%` }}
          />
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full animate-shimmer" />
        </div>

        {/* Status text */}
        <div className="flex items-center gap-1.5 text-xs text-faint font-mono">
          <span className="w-1.5 h-1.5 rounded-full bg-accent animate-ping" />
          <span>{statusText}</span>
        </div>
      </div>
    </div>
  );
}
