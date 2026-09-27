import React, { useState, useEffect } from 'react';
import {
  Plus,
  X,
  FolderGit2,
  Home,
  Minus,
  Square,
  Copy,
  Settings
} from 'lucide-react';
import { useApp } from '../../store';
import { useSettings } from '../../store/settings';
import { api } from '../../lib/api';
import { StrataLogo } from '../Common/StrataLogo';

export function TabBar() {
  const { tabs, activeTab, setActiveTab, closeTab } = useApp();
  const openSettings = useSettings((s) => s.openSettings);
  const closeSettings = useSettings((s) => s.closeSettings);
  const isSettingsOpen = useSettings((s) => s.isSettingsOpen);
  const [isMaximized, setIsMaximized] = useState(false);

  useEffect(() => {
    void api.isWindowMaximized?.().then((max) => {
      if (typeof max === 'boolean') setIsMaximized(max);
    });

    const unsubscribe = api.onMaximizeChange?.((max) => {
      setIsMaximized(max);
    });
    return () => {
      unsubscribe?.();
    };
  }, []);

  return (
    <div
      className="relative flex items-center bg-base border-b border-edge select-none h-10 px-2 shrink-0 z-30"
      style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}
      onDoubleClick={() => void api.maximizeWindow?.()}
    >
      {/* 1. App Branding & Logo */}
      <div
        className="flex items-center gap-2 pr-2.5 py-1 shrink-0 cursor-default"
        style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
      >
        <StrataLogo size={19} />
        <span className="text-[12px] font-bold tracking-wider text-fg/90 font-mono">
          Strata<span className="text-accent">Git</span>
        </span>
      </div>

      {/* Subtle divider */}
      <div className="w-[1px] h-4 bg-edge mx-1 shrink-0" />

      {/* 2. Tabs Section */}
      <div
        className="flex items-center gap-1 overflow-x-auto no-scrollbar shrink-0 py-1"
        style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
      >
        {/* Launchpad Tab */}
        <button
          className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
            !isSettingsOpen && (activeTab === null || activeTab === '')
              ? 'bg-panel2 text-accent shadow-sm border border-accent/40 font-semibold'
              : 'text-dim hover:text-fg hover:bg-panel2/60'
          }`}
          onClick={() => {
            closeSettings();
            useApp.getState().setActiveTab('');
          }}
          title="Launchpad"
        >
          <Home size={12} className={!isSettingsOpen && (activeTab === null || activeTab === '') ? 'text-accent' : 'text-dim'} />
          <span>Launchpad</span>
        </button>

        {/* Repository Tabs */}
        {tabs.map((t) => {
          const isActive = !isSettingsOpen && activeTab === t.path;
          return (
            <div
              key={t.path}
              className={`group relative flex items-center gap-2 pl-3 pr-2 py-1.5 text-xs font-medium rounded-md cursor-pointer transition-all max-w-[210px] ${
                isActive
                  ? 'bg-panel2 text-fg shadow-sm border border-edge font-semibold'
                  : 'text-dim hover:text-fg hover:bg-panel2/60'
              }`}
              onClick={() => {
                closeSettings();
                setActiveTab(t.path);
              }}
              title={t.path}
            >
              <FolderGit2
                size={12}
                className={isActive ? 'text-accent shrink-0' : 'text-dim shrink-0'}
              />
              <span className="truncate">{t.name}</span>
              <button
                className={`rounded p-0.5 ml-1 transition-opacity ${
                  isActive
                    ? 'opacity-60 hover:opacity-100 hover:bg-white/10 text-fg'
                    : 'opacity-0 group-hover:opacity-100 hover:bg-panel3 text-dim hover:text-fg'
                }`}
                onClick={(e) => {
                  e.stopPropagation();
                  closeTab(t.path);
                }}
                title="Close tab"
              >
                <X size={11} />
              </button>
              {isActive && (
                <div className="absolute bottom-0 left-2 right-2 h-[2px] bg-accent rounded-full" />
              )}
            </div>
          );
        })}

        {/* Settings Tab (shows when active/open) */}
        {isSettingsOpen && (
          <div
            className="group relative flex items-center gap-2 pl-3 pr-2 py-1.5 text-xs font-semibold rounded-md cursor-pointer transition-all max-w-[210px] bg-panel2 text-accent shadow-sm border border-accent/40"
            title="Settings Page"
          >
            <Settings size={12} className="text-accent shrink-0 animate-spin-slow" />
            <span className="truncate">Settings</span>
            <button
              className="rounded p-0.5 ml-1 opacity-70 hover:opacity-100 hover:bg-white/10 text-fg transition-opacity"
              onClick={(e) => {
                e.stopPropagation();
                closeSettings();
              }}
              title="Close settings (Esc)"
            >
              <X size={11} />
            </button>
            <div className="absolute bottom-0 left-2 right-2 h-[2px] bg-accent rounded-full" />
          </div>
        )}

        {/* New Tab / Launchpad Button */}
        <button
          className="flex items-center justify-center w-7 h-7 rounded-md text-dim hover:text-fg hover:bg-panel2 transition-colors ml-0.5"
          onClick={() => {
            closeSettings();
            setActiveTab('');
          }}
          title="New Tab (Launchpad)"
        >
          <Plus size={14} />
        </button>
      </div>

      {/* 3. Center Draggable Space */}
      <div
        className="flex-1 min-w-[30px] h-full cursor-default"
        style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}
        onDoubleClick={() => void api.maximizeWindow?.()}
      />

      {/* 4. Action & Window Controls */}
      <div
        className="flex items-center h-full ml-auto shrink-0 -mr-2"
        style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
      >
        {/* Settings button */}
        <button
          className={`w-9 h-10 flex items-center justify-center transition-colors mr-1 ${
            isSettingsOpen ? 'text-accent bg-panel3' : 'text-dim hover:text-fg hover:bg-panel3'
          }`}
          onClick={() => (isSettingsOpen ? closeSettings() : openSettings())}
          title="Preferences (Ctrl+,)"
        >
          <Settings size={14} />
        </button>

        <div className="w-[1px] h-4 bg-edge mx-1 shrink-0" />

        <button
          className="w-10 h-10 flex items-center justify-center text-dim hover:text-fg hover:bg-panel3 transition-colors"
          onClick={() => void api.minimizeWindow?.()}
          title="Minimize"
        >
          <Minus size={14} />
        </button>

        <button
          className="w-10 h-10 flex items-center justify-center text-dim hover:text-fg hover:bg-panel3 transition-colors"
          onClick={() => void api.maximizeWindow?.()}
          title={isMaximized ? 'Restore' : 'Maximize'}
        >
          {isMaximized ? (
            <Copy size={12} className="rotate-90 stroke-[1.8]" />
          ) : (
            <Square size={12} strokeWidth={1.8} />
          )}
        </button>

        <button
          className="w-10 h-10 flex items-center justify-center text-dim hover:text-white hover:bg-del transition-colors"
          onClick={() => void api.closeWindow?.()}
          title="Close"
        >
          <X size={14} />
        </button>
      </div>
    </div>
  );
}
