import React, { useState, useEffect } from 'react';
import {
  X,
  ChevronRight,
  ChevronLeft,
  GitBranch,
  GitGraph,
  Sparkles,
  GitMerge,
  Terminal,
  Zap,
  CheckCircle2,
  Layers,
  ArrowRight
} from 'lucide-react';
import { StrataLogo } from '../Common/StrataLogo';

interface UsageGuideModalProps {
  onClose: () => void;
}

interface GuideStep {
  id: string;
  badge: string;
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  content: React.ReactNode;
}

export function UsageGuideModal({ onClose }: UsageGuideModalProps) {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [dontShowAgain, setDontShowAgain] = useState(true);

  const guideSteps: GuideStep[] = [
    {
      id: 'welcome',
      badge: 'First Boot Tour',
      title: 'Welcome to StrataGit',
      subtitle: 'A high-performance visual Git client built for modern workflows',
      icon: <StrataLogo size={36} animated />,
      content: (
        <div className="space-y-3.5 text-xs">
          <p className="text-fg/90 leading-relaxed">
            StrataGit combines the power of raw Git with a lightning-fast visual strata graph, multi-repository tabs, and intuitive branching workflows.
          </p>
          <div className="grid grid-cols-2 gap-2.5 pt-1">
            <div className="p-3 rounded-lg bg-panel2/60 border border-edge/80 space-y-1">
              <div className="flex items-center gap-1.5 font-semibold text-fg">
                <Layers size={14} className="text-cyan-400" />
                <span>Multi-Repo Tabs</span>
              </div>
              <p className="text-dim text-[11px]">
                Work across multiple repositories seamlessly with persistent tabs, launchpad, and instant repo switching.
              </p>
            </div>
            <div className="p-3 rounded-lg bg-panel2/60 border border-edge/80 space-y-1">
              <div className="flex items-center gap-1.5 font-semibold text-fg">
                <Zap size={14} className="text-amber-400" />
                <span>Zero Latency</span>
              </div>
              <p className="text-dim text-[11px]">
                Fast git operations powered by native background IPC and intelligent memory caching.
              </p>
            </div>
          </div>
        </div>
      )
    },
    {
      id: 'sidebar',
      badge: 'Navigation & Branches',
      title: 'Sidebar & Branch Management',
      subtitle: 'Effortless branch switching, tags, stashes, and worktrees',
      icon: <GitBranch size={32} className="text-accent" />,
      content: (
        <div className="space-y-3 text-xs">
          <p className="text-fg/90 leading-relaxed">
            The left sidebar organizes your local and remote branches, tags, stashes, and worktrees with fast filtering and context menus.
          </p>
          <div className="space-y-2 pt-0.5">
            <div className="flex items-start gap-2.5 p-2.5 rounded-lg bg-panel2/50 border border-edge/60">
              <span className="w-5 h-5 rounded-full bg-accent/20 text-accent font-semibold text-[10px] flex items-center justify-center shrink-0 mt-0.5">
                1
              </span>
              <div>
                <span className="font-semibold text-fg">Single Click to Inspect</span>
                <p className="text-dim text-[11px]">
                  Clicking any branch focuses its latest commit in the graph and opens branch options.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-2.5 p-2.5 rounded-lg bg-panel2/50 border border-edge/60">
              <span className="w-5 h-5 rounded-full bg-accent/20 text-accent font-semibold text-[10px] flex items-center justify-center shrink-0 mt-0.5">
                2
              </span>
              <div>
                <span className="font-semibold text-fg">Double Click to Checkout</span>
                <p className="text-dim text-[11px]">
                  Double-clicking any local or remote branch immediately checks it out without modal interruptions.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-2.5 p-2.5 rounded-lg bg-panel2/50 border border-edge/60">
              <span className="w-5 h-5 rounded-full bg-accent/20 text-accent font-semibold text-[10px] flex items-center justify-center shrink-0 mt-0.5">
                3
              </span>
              <div>
                <span className="font-semibold text-fg">Right Click for Actions</span>
                <p className="text-dim text-[11px]">
                  Merge, Rebase, Rename, Push, and Delete branches directly from context menus.
                </p>
              </div>
            </div>
          </div>
        </div>
      )
    },
    {
      id: 'commit-graph',
      badge: 'Visual Commit Strata',
      title: 'Interactive Commit Graph',
      subtitle: 'Inspect histories, uncommitted WIP changes, and branch lanes',
      icon: <GitGraph size={32} className="text-indigo-400" />,
      content: (
        <div className="space-y-3 text-xs">
          <p className="text-fg/90 leading-relaxed">
            The center strata graph renders branch divergence, merge bubbles, commit authors, relative timestamps, and live working tree changes.
          </p>
          <div className="space-y-2 pt-0.5">
            <div className="flex items-start gap-2.5 p-2.5 rounded-lg bg-panel2/50 border border-edge/60">
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 shrink-0 mt-1" />
              <div>
                <span className="font-semibold text-fg">WIP (Uncommitted Changes)</span>
                <p className="text-dim text-[11px]">
                  The top WIP row tracks your working tree state. Click it anytime to review and stage pending diffs.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-2.5 p-2.5 rounded-lg bg-panel2/50 border border-edge/60">
              <div className="w-2.5 h-2.5 rounded-full bg-indigo-400 shrink-0 mt-1" />
              <div>
                <span className="font-semibold text-fg">Interactive Rebase &amp; Cherry-Pick</span>
                <p className="text-dim text-[11px]">
                  Right-click any commit to start visual rebase (pick/squash/drop), cherry-pick, revert, or create new branches.
                </p>
              </div>
            </div>
          </div>
        </div>
      )
    },
    {
      id: 'staging-and-ai',
      badge: 'Smart Commit Workflow',
      title: 'Staging & Commit Generator',
      subtitle: 'Instant conventional commit messages with offline rule-based or AI models',
      icon: <Sparkles size={32} className="text-amber-400" />,
      content: (
        <div className="space-y-3 text-xs">
          <p className="text-fg/90 leading-relaxed">
            Review side-by-side or unified diffs, stage individual hunks or lines, and let StrataGit craft your commit messages.
          </p>
          <div className="space-y-2 pt-0.5">
            <div className="p-2.5 rounded-lg bg-panel2/50 border border-edge/60 space-y-1">
              <div className="flex items-center gap-1.5 font-semibold text-fg">
                <Zap size={13} className="text-warn" />
                <span>Smart Rule-Based Generator (No AI / Offline)</span>
              </div>
              <p className="text-dim text-[11px]">
                Analyzes modified files and git diffs to generate standard Conventional Commit messages locally and instantly with zero network requests.
              </p>
            </div>
            <div className="p-2.5 rounded-lg bg-panel2/50 border border-edge/60 space-y-1">
              <div className="flex items-center gap-1.5 font-semibold text-fg">
                <Sparkles size={13} className="text-accent" />
                <span>AI Commit Assistant (Optional)</span>
              </div>
              <p className="text-dim text-[11px]">
                Optionally connect OpenRouter, Groq, Gemini, or local Ollama models in Settings for deep semantic commit summaries.
              </p>
            </div>
          </div>
        </div>
      )
    },
    {
      id: 'git-flow-and-tools',
      badge: 'Power Tools',
      title: 'Git Flow & Developer Drawer',
      subtitle: 'Standardized branching lifecycle, embedded terminal, and command palette',
      icon: <GitMerge size={32} className="text-emerald-400" />,
      content: (
        <div className="space-y-3 text-xs">
          <p className="text-fg/90 leading-relaxed">
            Everything you need for an efficient development flow is built right in without switching windows.
          </p>
          <div className="grid grid-cols-2 gap-2 pt-0.5">
            <div className="p-2.5 rounded-lg bg-panel2/50 border border-edge/60 space-y-1">
              <div className="flex items-center gap-1.5 font-semibold text-fg">
                <GitMerge size={13} className="text-emerald-400" />
                <span>Git Flow Workflow</span>
              </div>
              <p className="text-dim text-[11px]">
                Start and finish features, releases, and hotfixes with automated branch creation, tagging, and merges.
              </p>
            </div>
            <div className="p-2.5 rounded-lg bg-panel2/50 border border-edge/60 space-y-1">
              <div className="flex items-center gap-1.5 font-semibold text-fg">
                <Terminal size={13} className="text-accent" />
                <span>Embedded Terminal</span>
              </div>
              <p className="text-dim text-[11px]">
                Press <code className="px-1 py-0.5 rounded bg-panel3 font-mono text-[10px]">Ctrl+`</code> anytime to slide up a terminal running directly in the repository directory.
              </p>
            </div>
          </div>
          <div className="p-2.5 rounded-lg bg-panel2/50 border border-edge/60 flex items-center justify-between text-[11px]">
            <span className="text-dim">Command Palette: <span className="font-mono text-fg font-medium">Ctrl+K</span></span>
            <span className="text-dim">Settings &amp; Profiles: <span className="font-mono text-fg font-medium">Ctrl+,</span></span>
          </div>
        </div>
      )
    }
  ];

  const totalSteps = guideSteps.length;
  const currentStep = guideSteps[currentStepIndex];
  const isFirst = currentStepIndex === 0;
  const isLast = currentStepIndex === totalSteps - 1;

  const handleFinish = () => {
    if (dontShowAgain) {
      try {
        localStorage.setItem('stratagit:guide_completed', 'true');
      } catch {}
    }
    onClose();
  };

  const handleNext = () => {
    if (isLast) {
      handleFinish();
    } else {
      setCurrentStepIndex((prev) => Math.min(totalSteps - 1, prev + 1));
    }
  };

  const handlePrev = () => {
    setCurrentStepIndex((prev) => Math.max(0, prev - 1));
  };

  const handleSkip = () => {
    if (dontShowAgain) {
      try {
        localStorage.setItem('stratagit:guide_completed', 'true');
      } catch {}
    }
    onClose();
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        handleSkip();
      } else if (e.key === 'ArrowRight' || e.key === 'Enter') {
        e.preventDefault();
        handleNext();
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        handlePrev();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentStepIndex, dontShowAgain]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 backdrop-blur-xs p-4 animate-in fade-in duration-150 select-none"
      onClick={handleSkip}
    >
      <div
        className="w-full max-w-lg bg-panel border border-edge/90 rounded-2xl shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-edge bg-panel2/50">
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-accent/15 text-accent border border-accent/25 tracking-wide uppercase">
              {currentStep.badge}
            </span>
            <span className="text-xs text-dim">
              Step {currentStepIndex + 1} of {totalSteps}
            </span>
          </div>

          <button
            type="button"
            onClick={handleSkip}
            className="flex items-center gap-1 text-xs text-dim hover:text-fg px-2 py-1 rounded hover:bg-panel3 transition-colors"
            title="Skip usage guide (Esc)"
          >
            <span>Skip</span>
            <X size={14} />
          </button>
        </div>

        {/* Step Content */}
        <div className="p-6 space-y-4">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-panel2 border border-edge flex items-center justify-center shrink-0 shadow-inner">
              {currentStep.icon}
            </div>
            <div className="space-y-0.5">
              <h2 className="text-base font-bold text-fg tracking-tight">{currentStep.title}</h2>
              <p className="text-xs text-dim leading-snug">{currentStep.subtitle}</p>
            </div>
          </div>

          <div className="pt-1">{currentStep.content}</div>
        </div>

        {/* Footer Navigation */}
        <div className="flex items-center justify-between px-5 py-3.5 border-t border-edge bg-panel2/50 gap-3">
          <label className="flex items-center gap-2 cursor-pointer text-xs text-dim hover:text-fg transition-colors select-none">
            <input
              type="checkbox"
              checked={dontShowAgain}
              onChange={(e) => setDontShowAgain(e.target.checked)}
              className="rounded border-edge bg-panel3 text-accent focus:ring-0 focus:ring-offset-0 cursor-pointer"
            />
            <span className="text-[11px]">Don&apos;t show on startup</span>
          </label>

          {/* Dots Indicator */}
          <div className="flex items-center gap-1.5">
            {guideSteps.map((_, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => setCurrentStepIndex(idx)}
                className={`transition-all rounded-full ${
                  idx === currentStepIndex
                    ? 'w-5 h-1.5 bg-accent'
                    : 'w-1.5 h-1.5 bg-dim/40 hover:bg-dim'
                }`}
                title={`Jump to step ${idx + 1}`}
              />
            ))}
          </div>

          {/* Buttons: Back / Next */}
          <div className="flex items-center gap-2">
            {!isFirst && (
              <button
                type="button"
                onClick={handlePrev}
                className="btn text-xs text-dim hover:text-fg hover:bg-panel3 px-2.5 py-1.5 transition-colors flex items-center gap-1"
              >
                <ChevronLeft size={13} />
                <span>Back</span>
              </button>
            )}

            <button
              type="button"
              autoFocus
              onClick={handleNext}
              className="btn bg-accent text-white hover:bg-accent-hover text-xs font-semibold px-4 py-1.5 shadow-sm transition-all flex items-center gap-1.5"
            >
              <span>{isLast ? 'Get Started' : 'Next'}</span>
              {isLast ? <CheckCircle2 size={13} strokeWidth={2.5} /> : <ChevronRight size={13} strokeWidth={2.5} />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
