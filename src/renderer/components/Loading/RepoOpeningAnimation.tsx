import React, { useEffect, useState } from 'react';
import { FolderGit2, GitBranch, Sparkles } from 'lucide-react';
import { StrataLogo } from '../Common/StrataLogo';
import { useApp } from '../../store';

export function RepoOpeningAnimation() {
  const isOpeningRepo = useApp((s) => s.isOpeningRepo);
  const openingRepoName = useApp((s) => s.openingRepoName);

  const [visible, setVisible] = useState(false);
  const [animatingOut, setAnimatingOut] = useState(false);
  const [statusMessage, setStatusMessage] = useState('Opening repository…');

  useEffect(() => {
    let timer1: NodeJS.Timeout;
    let timer2: NodeJS.Timeout;

    if (isOpeningRepo) {
      setVisible(true);
      setAnimatingOut(false);
      setStatusMessage('Opening repository…');

      timer1 = setTimeout(() => {
        setStatusMessage('Reading branch hierarchy & commit strata…');
      }, 200);

      timer2 = setTimeout(() => {
        setStatusMessage('Rendering workspace…');
      }, 420);
    } else if (visible) {
      setAnimatingOut(true);
      const closeTimer = setTimeout(() => {
        setVisible(false);
        setAnimatingOut(false);
      }, 350);
      return () => clearTimeout(closeTimer);
    }

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
    };
  }, [isOpeningRepo, visible]);

  if (!visible) return null;

  return (
    <div
      className={`fixed inset-0 z-[80] flex items-center justify-center bg-base/75 backdrop-blur-md transition-all duration-350 ease-out select-none ${
        animatingOut ? 'opacity-0 pointer-events-none scale-102' : 'opacity-100'
      }`}
    >
      {/* Background ambient radial glow */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[480px] h-[480px] bg-accent/15 rounded-full blur-3xl animate-pulse-ring" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[280px] h-[280px] bg-emerald-500/10 rounded-full blur-2xl" />
      </div>

      {/* Floating Glass Card */}
      <div className="relative z-10 w-full max-w-sm mx-4 p-6 rounded-2xl bg-panel/90 border border-edge/90 shadow-2xl flex flex-col items-center text-center animate-in zoom-in-95 duration-250">
        {/* Animated Brand Logo with Ambient Pulsing Glow */}
        <div className="relative mb-4">
          <div className="absolute inset-0 rounded-2xl bg-gradient-to-tr from-cyan-500 to-indigo-600 blur-lg opacity-50 animate-pulse" />
          <div className="relative">
            <StrataLogo size={60} animated />
          </div>
        </div>

        {/* Repository Name and Badge */}
        <div className="space-y-1.5 mb-4">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-accent/15 border border-accent/30 text-accent text-[11px] font-semibold tracking-wide">
            <FolderGit2 size={12} />
            <span>Switching Repository</span>
          </div>

          <h3 className="text-base font-bold text-fg tracking-tight truncate max-w-[280px]">
            {openingRepoName || 'Repository'}
          </h3>
        </div>

        {/* Fluid SVG Animated Graph Lines */}
        <div className="w-56 h-9 mb-4 overflow-visible">
          <svg viewBox="0 0 224 36" className="w-full h-full overflow-visible">
            <defs>
              <linearGradient id="fluid-grad-1" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#38bdf8" />
                <stop offset="50%" stopColor="#818cf8" />
                <stop offset="100%" stopColor="#34d399" />
              </linearGradient>
              <linearGradient id="fluid-grad-2" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#818cf8" />
                <stop offset="100%" stopColor="#f472b6" />
              </linearGradient>
            </defs>

            {/* Main Strata Line */}
            <path
              d="M 12 18 Q 65 4, 112 18 T 212 18"
              fill="none"
              stroke="url(#fluid-grad-1)"
              strokeWidth="2.5"
              strokeLinecap="round"
              className="animate-branch-draw"
            />

            {/* Branch Divergence Line */}
            <path
              d="M 65 18 C 85 30, 140 32, 175 22"
              fill="none"
              stroke="url(#fluid-grad-2)"
              strokeWidth="1.75"
              strokeLinecap="round"
              strokeDasharray="4 3"
              className="opacity-75"
            />

            {/* Nodes */}
            <circle cx="12" cy="18" r="3.5" fill="#38bdf8" />
            <circle cx="65" cy="18" r="3" fill="#818cf8" />
            <circle cx="112" cy="18" r="4.5" fill="#818cf8" className="animate-pulse" />
            <circle cx="175" cy="22" r="3" fill="#f472b6" />
            <circle cx="212" cy="18" r="3.5" fill="#34d399" />
          </svg>
        </div>

        {/* Progress Shimmer Bar */}
        <div className="w-56 h-1 bg-panel3 rounded-full overflow-hidden mb-3 relative border border-edge/60">
          <div className="h-full bg-gradient-to-r from-cyan-500 via-indigo-500 to-emerald-400 rounded-full w-full" />
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent -translate-x-full animate-shimmer" />
        </div>

        {/* Fluid Status Message */}
        <div className="flex items-center gap-1.5 text-xs text-dim font-mono tracking-tight animate-pulse">
          <Sparkles size={11} className="text-accent shrink-0" />
          <span>{statusMessage}</span>
        </div>
      </div>
    </div>
  );
}
