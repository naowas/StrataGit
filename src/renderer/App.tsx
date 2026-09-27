import React, { useEffect, useState } from 'react';
import { useApp } from './store';
import { useSettings } from './store/settings';
import { api } from './lib/api';
import { TabBar } from './components/TabBar/TabBar';
import { Toolbar } from './components/Toolbar/Toolbar';
import { Sidebar } from './components/Sidebar/Sidebar';
import { CommitGraph } from './components/CommitGraph/CommitGraph';
import { CommitDetailPanel } from './components/CommitDetailPanel/CommitDetailPanel';
import { DiffViewer } from './components/DiffViewer/DiffViewer';
import { StatusBar } from './components/StatusBar/StatusBar';
import { Launchpad } from './components/Launchpad/Launchpad';
import { SettingsModal } from './components/Settings/SettingsModal';
import { AppLoadingScreen } from './components/Loading/AppLoadingScreen';
import { RepoOpeningAnimation } from './components/Loading/RepoOpeningAnimation';
import { ConflictBanner } from './components/ConflictResolver/ConflictBanner';
import { ConflictResolverModal } from './components/ConflictResolver/ConflictResolverModal';
import { InteractiveRebaseModal } from './components/Rebase/InteractiveRebaseModal';
import { CreateTagModal } from './components/Sidebar/CreateTagModal';
import { AddRemoteModal } from './components/Sidebar/AddRemoteModal';
import { CreateRepoModal } from './components/Repository/CreateRepoModal';
import { CommandPalette } from './components/CommandPalette/CommandPalette';
import { TerminalDrawer } from './components/TerminalDrawer/TerminalDrawer';
import { ShortcutsModal } from './components/Help/ShortcutsModal';
import { UsageGuideModal } from './components/Help/UsageGuideModal';
import { GitFlowModal } from './components/GitFlow/GitFlowModal';
import { ToastContainer } from './components/Common/ToastContainer';

export function App() {
  const activeTab = useApp((s) => s.activeTab);
  const init = useApp((s) => s.init);
  const usageGuideOpen = useApp((s) => s.usageGuideOpen);
  const gitFlowModalOpen = useApp((s) => s.gitFlowModalOpen);
  const openUsageGuide = useApp((s) => s.openUsageGuide);
  const closeUsageGuide = useApp((s) => s.closeUsageGuide);
  const closeGitFlowModal = useApp((s) => s.closeGitFlowModal);
  const [isReady, setIsReady] = useState(false);

  const autoFetch = useSettings((s) => s.autoFetch);
  const autoFetchInterval = useSettings((s) => s.autoFetchInterval);

  useEffect(() => {
    const startTime = Date.now();
    void init().finally(() => {
      // Ensure the opening animation displays smoothly for at least 2400ms
      const elapsed = Date.now() - startTime;
      const remaining = Math.max(0, 2400 - elapsed);
      setTimeout(() => {
        setIsReady(true);
      }, remaining);
    });
  }, [init]);

  // First-boot onboarding tour check
  useEffect(() => {
    if (isReady) {
      try {
        const completed = localStorage.getItem('stratagit:guide_completed') === 'true';
        if (!completed) {
          const timer = setTimeout(() => {
            openUsageGuide();
          }, 450);
          return () => clearTimeout(timer);
        }
      } catch {}
    }
  }, [isReady, openUsageGuide]);

  // Periodic and on-focus background git fetch to keep repository and ahead/behind status updated
  useEffect(() => {
    if (!activeTab || !autoFetch) return;

    let inFlight = false;
    const runSilentFetch = async () => {
      if (inFlight) return;
      const tab = useApp.getState().activeTab;
      if (!tab) return;
      inFlight = true;
      try {
        const res = await api.fetch();
        if (res && res.ok) {
          await useApp.getState().refresh();
        }
      } catch {
        // Silently swallow network/remote errors in background so offline work isn't interrupted
      } finally {
        inFlight = false;
      }
    };

    // Initial silent check 2.5s after repo is loaded
    const initialTimer = setTimeout(() => {
      void runSilentFetch();
    }, 2500);

    // Periodic timer
    const intervalMs = Math.max(10, autoFetchInterval || 60) * 1000;
    const intervalTimer = setInterval(() => {
      void runSilentFetch();
    }, intervalMs);

    // Sync when returning to the window/tab
    const handleFocus = () => {
      if (document.visibilityState !== 'hidden') {
        void runSilentFetch();
      }
    };
    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleFocus);

    return () => {
      clearTimeout(initialTimer);
      clearInterval(intervalTimer);
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleFocus);
    };
  }, [activeTab, autoFetch, autoFetchInterval]);

  // Global keyboard shortcuts:
  // - Ctrl+K / Cmd+K or Ctrl+P / Cmd+P: Command Palette
  // - Ctrl+` / Cmd+`: Terminal Drawer
  // - Ctrl+, / Cmd+,: Settings
  // - Escape: Close command palette, modals, or open diff
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const isMod = e.ctrlKey || e.metaKey;
      if (isMod && (e.key === 'k' || e.key === 'p')) {
        e.preventDefault();
        useApp.getState().toggleCommandPalette();
      } else if (isMod && (e.key === '`' || e.key === '~')) {
        e.preventDefault();
        useApp.getState().toggleTerminalDrawer();
      } else if (isMod && e.key === 'b') {
        e.preventDefault();
        useApp.getState().toggleSidebar();
      } else if (isMod && e.key === 'f') {
        e.preventDefault();
        const searchInput = document.querySelector('input[placeholder*="Filter commits"]') as HTMLInputElement;
        searchInput?.focus();
        searchInput?.select();
      } else if (isMod && e.key === ',') {
        e.preventDefault();
        useSettings.getState().openSettings();
      } else if (e.key === '?' && !['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) {
        e.preventDefault();
        useApp.getState().toggleShortcutsModal();
      } else if (e.key === 'Escape') {
        if (useApp.getState().shortcutsModalOpen) {
          useApp.setState({ shortcutsModalOpen: false });
        } else if (useApp.getState().commandPaletteOpen) {
          useApp.getState().closeCommandPalette();
        } else if (useApp.getState().openDiff) {
          useApp.getState().closeDiff();
        }
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  return (
    <div className="h-full flex flex-col bg-base overflow-hidden border border-edge/50">
      <TabBar />
      {activeTab ? (
        <div key={activeTab} className="flex-1 flex flex-col min-h-0 animate-in fade-in duration-300">
          <Toolbar />
          <ConflictBanner />
          <div className="flex-1 flex min-h-0">
            <Sidebar />
            <div className="flex-1 flex flex-col min-w-0 min-h-0 overflow-hidden">
              <CommitGraph />
              <DiffViewer />
            </div>
            <CommitDetailPanel />
          </div>
          <TerminalDrawer />
        </div>
      ) : (
        <Launchpad />
      )}
      <StatusBar />
      <ToastContainer />
      <ConflictResolverModal />
      <InteractiveRebaseModal />
      <CreateTagModal />
      <AddRemoteModal />
      <CreateRepoModal />
      <CommandPalette />
      <ShortcutsModal />
      <SettingsModal />
      {usageGuideOpen && <UsageGuideModal onClose={closeUsageGuide} />}
      {gitFlowModalOpen && <GitFlowModal onClose={closeGitFlowModal} />}
      <RepoOpeningAnimation />
      <AppLoadingScreen isReady={isReady} />
    </div>
  );
}
