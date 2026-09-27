import React, { useState, useEffect } from 'react';
import {
  X,
  Palette,
  Type,
  Check,
  RotateCcw,
  Sparkles,
  Sliders,
  Info,
  Layers,
  ChevronRight,
  RefreshCw,
  User,
  Key,
  Plus,
  Trash2,
  Bot,
  Eye,
  EyeOff,
  ExternalLink,
  Shield,
  CheckCircle2,
  AlertCircle,
  Loader2
} from 'lucide-react';
import {
  useSettings,
  THEMES,
  ThemeId,
  UI_FONT_PRESETS,
  CODE_FONT_PRESETS
} from '../../store/settings';
import { useApp } from '../../store';
import { api } from '../../lib/api';
import { CommitProfile, AiCommitConfig } from '../../../shared/types';
import { StrataLogo } from '../Common/StrataLogo';

export function SettingsModal() {
  const {
    isSettingsOpen,
    closeSettings,
    theme,
    setTheme,
    uiFontSize,
    setUiFontSize,
    codeFontSize,
    setCodeFontSize,
    uiFontFamily,
    setUiFontFamily,
    customUiFont,
    setCustomUiFont,
    codeFontFamily,
    setCodeFontFamily,
    customCodeFont,
    setCustomCodeFont,
    graphRowHeight,
    setGraphRowHeight,
    autoFetch,
    setAutoFetch,
    autoFetchInterval,
    setAutoFetchInterval,
    defaultAuthorName,
    setDefaultAuthorName,
    defaultAuthorEmail,
    setDefaultAuthorEmail,
    signingKey,
    setSigningKey,
    commitProfiles,
    setCommitProfiles,
    activeProfileId,
    setActiveProfileId,
    aiCommit,
    setAiCommit,
    resetDefaults
  } = useSettings();

  const activeRepoPath = useApp((s) => s.activeTab);
  const activeRepoTab = useApp((s) => s.tabs.find((t) => t.path === s.activeTab));
  const [activeTab, setActiveTab] = useState<'themes' | 'typography' | 'profiles' | 'ai' | 'git' | 'about'>('themes');

  // Commit profile tab state
  const [configBanner, setConfigBanner] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [newProfileModalOpen, setNewProfileModalOpen] = useState(false);
  const [newProfileName, setNewProfileName] = useState('');
  const [newProfileAuthor, setNewProfileAuthor] = useState('');
  const [newProfileEmail, setNewProfileEmail] = useState('');
  const [newProfileKey, setNewProfileKey] = useState('');

  // AI commit tab state
  const [showApiKey, setShowApiKey] = useState(false);
  const [testGenerating, setTestGenerating] = useState(false);
  const [testResult, setTestResult] = useState<string | null>(null);
  const [testError, setTestError] = useState<string | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isSettingsOpen) {
        closeSettings();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isSettingsOpen, closeSettings]);

  if (!isSettingsOpen) return null;

  const handleDetectGitConfig = async () => {
    try {
      const res = await api.getGitConfig('global');
      if (res && (res.name || res.email)) {
        if (res.name) setDefaultAuthorName(res.name);
        if (res.email) setDefaultAuthorEmail(res.email);
        setConfigBanner({
          type: 'success',
          message: `Detected git config: ${res.name || 'unnamed'} <${res.email || 'no-email'}>`
        });
      } else {
        setConfigBanner({
          type: 'error',
          message: 'No global user.name or user.email found in Git config'
        });
      }
    } catch (err: any) {
      setConfigBanner({ type: 'error', message: err.message || 'Failed to detect git config' });
    }
  };

  const handleApplyGlobalConfig = async () => {
    try {
      await api.setGitConfig({
        name: defaultAuthorName || undefined,
        email: defaultAuthorEmail || undefined,
        scope: 'global'
      });
      setConfigBanner({ type: 'success', message: 'Applied to ~/.gitconfig (global configuration)' });
    } catch (err: any) {
      setConfigBanner({ type: 'error', message: err.message || 'Failed to save global git config' });
    }
  };

  const handleApplyLocalConfig = async () => {
    if (!activeRepoPath) {
      setConfigBanner({ type: 'error', message: 'No repository currently open' });
      return;
    }
    try {
      await api.setGitConfig({
        name: defaultAuthorName || undefined,
        email: defaultAuthorEmail || undefined,
        scope: 'local'
      });
      setConfigBanner({ type: 'success', message: `Applied to local repository: ${activeRepoTab?.name || activeRepoPath}` });
    } catch (err: any) {
      setConfigBanner({ type: 'error', message: err.message || 'Failed to save local git config' });
    }
  };

  const handleAddProfile = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProfileName.trim()) return;
    const newId = 'profile-' + Date.now();
    const created: CommitProfile = {
      id: newId,
      name: newProfileName.trim(),
      authorName: newProfileAuthor.trim() || defaultAuthorName,
      authorEmail: newProfileEmail.trim() || defaultAuthorEmail,
      signingKey: newProfileKey.trim() || undefined
    };
    setCommitProfiles([...commitProfiles, created]);
    setActiveProfileId(newId);
    setNewProfileName('');
    setNewProfileAuthor('');
    setNewProfileEmail('');
    setNewProfileKey('');
    setNewProfileModalOpen(false);
  };

  const handleDeleteProfile = (id: string) => {
    if (commitProfiles.length <= 1) return;
    const remaining = commitProfiles.filter((p) => p.id !== id);
    setCommitProfiles(remaining);
    if (activeProfileId === id) {
      setActiveProfileId(remaining[0].id);
    }
  };

  const handleTestAi = async () => {
    setTestGenerating(true);
    setTestResult(null);
    setTestError(null);
    try {
      const res = await api.generateAiCommitMessage(aiCommit);
      if (res.ok && res.message) {
        setTestResult(res.message);
      } else {
        setTestError(res.error || 'Failed to generate commit message');
      }
    } catch (err: any) {
      setTestError(err.message || 'Connection or generation failed');
    } finally {
      setTestGenerating(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 backdrop-blur-sm p-4 animate-in fade-in duration-150"
      onClick={closeSettings}
    >
      <div
        className="w-full max-w-3xl h-[620px] max-h-[90vh] flex flex-col rounded-xl border border-edge bg-panel shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-edge bg-panel2/60 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-accent/15 border border-accent/30 flex items-center justify-center text-accent">
              <Sliders size={15} />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-fg leading-none">Settings</h2>
              <span className="text-[11px] text-dim">Customize appearance, fonts, commit profiles &amp; AI</span>
            </div>
          </div>
          <button
            className="btn-icon !w-7 !h-7 hover:bg-panel3 rounded-md"
            onClick={closeSettings}
            title="Close (Esc)"
          >
            <X size={15} />
          </button>
        </div>

        {/* Body with sidebar nav and content */}
        <div className="flex-1 flex min-h-0">
          {/* Navigation Sidebar */}
          <div className="w-52 border-r border-edge bg-panel2/30 p-2 flex flex-col gap-1 shrink-0">
            <button
              className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium text-left transition-all ${
                activeTab === 'themes'
                  ? 'bg-accent/15 text-accent border border-accent/20 font-semibold'
                  : 'text-dim hover:text-fg hover:bg-panel2'
              }`}
              onClick={() => setActiveTab('themes')}
            >
              <Palette size={15} className={activeTab === 'themes' ? 'text-accent' : 'text-dim'} />
              <span className="flex-1">Themes &amp; Colors</span>
              {activeTab === 'themes' && <ChevronRight size={13} />}
            </button>

            <button
              className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium text-left transition-all ${
                activeTab === 'typography'
                  ? 'bg-accent/15 text-accent border border-accent/20 font-semibold'
                  : 'text-dim hover:text-fg hover:bg-panel2'
              }`}
              onClick={() => setActiveTab('typography')}
            >
              <Type size={15} className={activeTab === 'typography' ? 'text-accent' : 'text-dim'} />
              <span className="flex-1">Typography &amp; Fonts</span>
              {activeTab === 'typography' && <ChevronRight size={13} />}
            </button>

            <button
              className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium text-left transition-all ${
                activeTab === 'profiles'
                  ? 'bg-accent/15 text-accent border border-accent/20 font-semibold'
                  : 'text-dim hover:text-fg hover:bg-panel2'
              }`}
              onClick={() => setActiveTab('profiles')}
            >
              <User size={15} className={activeTab === 'profiles' ? 'text-accent' : 'text-dim'} />
              <span className="flex-1">Commit Profiles</span>
              {activeTab === 'profiles' && <ChevronRight size={13} />}
            </button>

            <button
              className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium text-left transition-all ${
                activeTab === 'ai'
                  ? 'bg-accent/15 text-accent border border-accent/20 font-semibold'
                  : 'text-dim hover:text-fg hover:bg-panel2'
              }`}
              onClick={() => setActiveTab('ai')}
            >
              <Sparkles size={15} className={activeTab === 'ai' ? 'text-accent' : 'text-dim'} />
              <span className="flex-1">AI Commit Assistant</span>
              {activeTab === 'ai' && <ChevronRight size={13} />}
            </button>

            <button
              className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium text-left transition-all ${
                activeTab === 'git'
                  ? 'bg-accent/15 text-accent border border-accent/20 font-semibold'
                  : 'text-dim hover:text-fg hover:bg-panel2'
              }`}
              onClick={() => setActiveTab('git')}
            >
              <RefreshCw size={15} className={activeTab === 'git' ? 'text-accent' : 'text-dim'} />
              <span className="flex-1">Git &amp; Sync</span>
              {activeTab === 'git' && <ChevronRight size={13} />}
            </button>

            <button
              className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium text-left transition-all ${
                activeTab === 'about'
                  ? 'bg-accent/15 text-accent border border-accent/20 font-semibold'
                  : 'text-dim hover:text-fg hover:bg-panel2'
              }`}
              onClick={() => setActiveTab('about')}
            >
              <Info size={15} className={activeTab === 'about' ? 'text-accent' : 'text-dim'} />
              <span className="flex-1">About &amp; Shortcuts</span>
              {activeTab === 'about' && <ChevronRight size={13} />}
            </button>

            <div className="mt-auto pt-2 border-t border-edge/60">
              <button
                className="flex w-full items-center gap-2 px-3 py-1.5 rounded text-xs text-dim hover:text-del hover:bg-del-bg/30 transition-colors"
                onClick={resetDefaults}
                title="Restore all settings to default"
              >
                <RotateCcw size={13} />
                <span>Reset to Defaults</span>
              </button>
            </div>
          </div>

          {/* Tab Content */}
          <div className="flex-1 overflow-y-auto p-5 min-h-0 bg-base">
            {activeTab === 'themes' && (
              <div className="space-y-4">
                <div>
                  <h3 className="text-xs font-semibold text-fg uppercase tracking-wider mb-1">Color Theme</h3>
                  <p className="text-xs text-dim">Select an aesthetic palette crafted for StrataGit</p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  {(Object.keys(THEMES) as ThemeId[]).map((id) => {
                    const t = THEMES[id];
                    const isSelected = theme === id;
                    return (
                      <div
                        key={id}
                        onClick={() => setTheme(id)}
                        className={`group relative flex flex-col p-3 rounded-xl border cursor-pointer transition-all ${
                          isSelected
                            ? 'border-accent bg-panel2 shadow-md ring-1 ring-accent/30'
                            : 'border-edge bg-panel2/60 hover:bg-panel2 hover:border-edge/90'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-semibold text-fg flex items-center gap-1.5">
                            {t.name}
                            {t.isLight && (
                              <span className="rounded bg-panel3 px-1 py-0.2 text-[9px] text-faint">LIGHT</span>
                            )}
                          </span>
                          {isSelected && (
                            <span className="flex items-center justify-center w-4 h-4 rounded-full bg-accent text-white">
                              <Check size={10} strokeWidth={3} />
                            </span>
                          )}
                        </div>

                        <p className="text-[11px] text-dim line-clamp-1 mb-3">{t.description}</p>

                        {/* Theme color palette preview circles */}
                        <div className="flex items-center gap-1.5 mt-auto pt-1">
                          <span
                            className="w-4 h-4 rounded-full border border-black/20 shadow-xs"
                            style={{ backgroundColor: t.colors.base }}
                            title="Base background"
                          />
                          <span
                            className="w-4 h-4 rounded-full border border-black/20 shadow-xs"
                            style={{ backgroundColor: t.colors.panel }}
                            title="Panel"
                          />
                          <span
                            className="w-4 h-4 rounded-full border border-black/20 shadow-xs"
                            style={{ backgroundColor: t.colors.accent }}
                            title="Accent"
                          />
                          <span
                            className="w-4 h-4 rounded-full border border-black/20 shadow-xs"
                            style={{ backgroundColor: t.colors.add }}
                            title="Added / Success"
                          />
                          <span
                            className="w-4 h-4 rounded-full border border-black/20 shadow-xs"
                            style={{ backgroundColor: t.colors.del }}
                            title="Deleted / Danger"
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {activeTab === 'typography' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-xs font-semibold text-fg uppercase tracking-wider mb-1">Typography & Fonts</h3>
                  <p className="text-xs text-dim">Customize interface and code fonts, sizes, and layout density</p>
                </div>

                {/* UI Font Family */}
                <div className="space-y-2 rounded-lg border border-edge/80 bg-panel2/40 p-3.5">
                  <div className="flex items-center justify-between">
                    <div>
                      <label className="text-xs font-semibold text-fg block">Interface Font Family</label>
                      <span className="text-[11px] text-dim">Applied to navigation, labels, tabs, and buttons</span>
                    </div>
                    <select
                      value={(() => {
                        const p = UI_FONT_PRESETS.find(
                          (x) => x.id === uiFontFamily || x.label === uiFontFamily || x.value === uiFontFamily
                        );
                        return p ? p.id : (uiFontFamily === 'custom' ? 'custom' : 'Inter');
                      })()}
                      onChange={(e) => setUiFontFamily(e.target.value)}
                      className="text-xs px-2.5 py-1 min-w-44"
                    >
                      {UI_FONT_PRESETS.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  {uiFontFamily === 'custom' && (
                    <div className="pt-2">
                      <input
                        placeholder="Enter custom font name (e.g. Segoe UI, Cantarell, SF Pro)"
                        value={customUiFont}
                        onChange={(e) => setCustomUiFont(e.target.value)}
                        className="w-full text-xs"
                      />
                    </div>
                  )}
                </div>

                {/* Code / Monospace Font Family */}
                <div className="space-y-2 rounded-lg border border-edge/80 bg-panel2/40 p-3.5">
                  <div className="flex items-center justify-between">
                    <div>
                      <label className="text-xs font-semibold text-fg block">Code & Monospace Font</label>
                      <span className="text-[11px] text-dim">Applied to diff views, commit hashes, branches and logs</span>
                    </div>
                    <select
                      value={(() => {
                        const p = CODE_FONT_PRESETS.find(
                          (x) => x.id === codeFontFamily || x.label === codeFontFamily || x.value === codeFontFamily
                        );
                        return p ? p.id : (codeFontFamily === 'custom' ? 'custom' : 'JetBrains Mono');
                      })()}
                      onChange={(e) => setCodeFontFamily(e.target.value)}
                      className="text-xs px-2.5 py-1 min-w-44"
                    >
                      {CODE_FONT_PRESETS.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  {codeFontFamily === 'custom' && (
                    <div className="pt-2">
                      <input
                        placeholder="Enter custom monospace font name (e.g. Cascadia Code, Menlo)"
                        value={customCodeFont}
                        onChange={(e) => setCustomCodeFont(e.target.value)}
                        className="w-full text-xs"
                      />
                    </div>
                  )}
                </div>

                {/* Font Sizes Grid */}
                <div className="grid grid-cols-2 gap-4">
                  {/* UI Font Size */}
                  <div className="rounded-lg border border-edge/80 bg-panel2/40 p-3.5 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-fg">UI Font Size</span>
                      <span className="text-xs font-mono font-medium px-1.5 py-0.5 rounded bg-panel3 text-accent">
                        {uiFontSize}px
                      </span>
                    </div>
                    <input
                      type="range"
                      min={11}
                      max={16}
                      step={1}
                      value={uiFontSize}
                      onChange={(e) => setUiFontSize(Number(e.target.value))}
                      className="w-full accent-accent cursor-pointer"
                    />
                    <div className="flex items-center justify-between gap-1">
                      {[11, 12, 13, 14, 15, 16].map((sz) => (
                        <button
                          key={sz}
                          onClick={() => setUiFontSize(sz)}
                          className={`flex-1 py-1 rounded text-[11px] font-mono transition-colors ${
                            uiFontSize === sz ? 'bg-accent text-white font-bold' : 'bg-panel3 hover:bg-edge text-dim'
                          }`}
                        >
                          {sz}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Code Font Size */}
                  <div className="rounded-lg border border-edge/80 bg-panel2/40 p-3.5 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-fg">Diff & Code Font Size</span>
                      <span className="text-xs font-mono font-medium px-1.5 py-0.5 rounded bg-panel3 text-accent">
                        {codeFontSize}px
                      </span>
                    </div>
                    <input
                      type="range"
                      min={10}
                      max={18}
                      step={1}
                      value={codeFontSize}
                      onChange={(e) => setCodeFontSize(Number(e.target.value))}
                      className="w-full accent-accent cursor-pointer"
                    />
                    <div className="flex items-center justify-between gap-1">
                      {[10, 11, 12, 13, 14, 16].map((sz) => (
                        <button
                          key={sz}
                          onClick={() => setCodeFontSize(sz)}
                          className={`flex-1 py-1 rounded text-[11px] font-mono transition-colors ${
                            codeFontSize === sz ? 'bg-accent text-white font-bold' : 'bg-panel3 hover:bg-edge text-dim'
                          }`}
                        >
                          {sz}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Graph Row Height Density */}
                <div className="rounded-lg border border-edge/80 bg-panel2/40 p-3.5">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <span className="text-xs font-semibold text-fg block">Commit Graph Row Height</span>
                      <span className="text-[11px] text-dim">Adjust visual density of commit graph rows</span>
                    </div>
                    <div className="flex items-center gap-1 bg-panel3 p-0.5 rounded-md">
                      {[
                        { label: 'Compact (22px)', val: 22 },
                        { label: 'Normal (26px)', val: 26 },
                        { label: 'Spacious (30px)', val: 30 }
                      ].map((item) => (
                        <button
                          key={item.val}
                          onClick={() => setGraphRowHeight(item.val)}
                          className={`px-2.5 py-1 text-xs rounded transition-all ${
                            graphRowHeight === item.val
                              ? 'bg-accent text-white font-medium'
                              : 'text-dim hover:text-fg'
                          }`}
                        >
                          {item.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Live Preview Box */}
                <div className="rounded-lg border border-edge bg-panel2/80 p-4 space-y-3">
                  <div className="flex items-center justify-between border-b border-edge/60 pb-2">
                    <span className="text-xs font-semibold text-dim uppercase tracking-wider flex items-center gap-1.5">
                      <Sparkles size={13} className="text-accent" /> Live Typography & Color Preview
                    </span>
                    <span className="text-[11px] text-faint">Updates in real-time</span>
                  </div>

                  {/* UI Preview */}
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-fg">UI Text:</span>
                    <button className="btn bg-accent text-white hover:bg-accent-hover text-xs">
                      Commit Changes
                    </button>
                    <span className="rounded bg-panel3 px-2 py-0.5 text-xs text-accent border border-accent/30 font-medium">
                      feature/login-v2
                    </span>
                    <span className="text-xs text-dim">3 files staged</span>
                  </div>

                  {/* Code Diff Preview */}
                  <div className="rounded border border-edge bg-base p-2 font-mono space-y-0.5 overflow-hidden">
                    <div className="bg-panel2/60 text-dim text-[11px] px-2 py-0.5 rounded-sm">
                      @@ -42,6 +42,8 @@ export function App()
                    </div>
                    <div className="bg-del-bg text-del px-2 py-0.5 flex gap-2">
                      <span className="opacity-60 select-none">-</span>
                      <span>const prevTheme = 'classic-dark';</span>
                    </div>
                    <div className="bg-add-bg text-add px-2 py-0.5 flex gap-2">
                      <span className="opacity-60 select-none">+</span>
                      <span>const theme = useSettings((s) =&gt; s.theme);</span>
                    </div>
                    <div className="bg-add-bg text-add px-2 py-0.5 flex gap-2">
                      <span className="opacity-60 select-none">+</span>
                      <span>applySettingsToDOM(theme);</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'git' && (
              <div className="space-y-5">
                <div>
                  <h3 className="text-xs font-semibold text-fg uppercase tracking-wider mb-1">Git Remote &amp; Synchronization</h3>
                  <p className="text-xs text-dim">Configure background fetch polling and remote synchronization behavior</p>
                </div>

                {/* Auto Fetch Toggle */}
                <div className="rounded-lg border border-edge/80 bg-panel2/40 p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-xs font-semibold text-fg block">Periodic Background Fetch</span>
                      <span className="text-[11px] text-dim">
                        Automatically run git fetch in the background to update incoming/outgoing commits and branch tracking
                      </span>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={autoFetch}
                        onChange={(e) => setAutoFetch(e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-9 h-5 bg-panel3 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-accent"></div>
                    </label>
                  </div>
                </div>

                {/* Fetch Interval */}
                {autoFetch && (
                  <div className="rounded-lg border border-edge/80 bg-panel2/40 p-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-xs font-semibold text-fg block">Auto-Fetch Interval</span>
                        <span className="text-[11px] text-dim">How frequently StrataGit checks remotes for new changes</span>
                      </div>
                      <div className="flex items-center gap-1 bg-panel3 p-0.5 rounded-md">
                        {[
                          { label: '30s', val: 30 },
                          { label: '1m', val: 60 },
                          { label: '2m', val: 120 },
                          { label: '5m', val: 300 },
                          { label: '10m', val: 600 }
                        ].map((item) => (
                          <button
                            key={item.val}
                            onClick={() => setAutoFetchInterval(item.val)}
                            className={`px-2.5 py-1 text-xs rounded transition-all ${
                              autoFetchInterval === item.val
                                ? 'bg-accent text-white font-medium'
                                : 'text-dim hover:text-fg'
                            }`}
                          >
                            {item.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* Window Focus Sync Information */}
                <div className="rounded-lg border border-edge/60 bg-panel2/20 p-3.5 space-y-1.5">
                  <div className="flex items-center gap-2 text-xs font-medium text-fg">
                    <Check size={14} className="text-accent" />
                    <span>Focus-Triggered Sync Active</span>
                  </div>
                  <p className="text-[11px] text-dim pl-5 leading-relaxed">
                    Whenever you switch back to StrataGit from your code editor or browser, a silent fetch runs automatically to ensure your commit graph and ahead/behind badges match remote state.
                  </p>
                </div>
              </div>
            )}

            {activeTab === 'profiles' && (
              <div className="space-y-5">
                <div>
                  <h3 className="text-xs font-semibold text-fg uppercase tracking-wider mb-1">Commit Identity &amp; Profiles</h3>
                  <p className="text-xs text-dim">Configure your default Git author credentials, switchable profiles, and commit signing</p>
                </div>

                {configBanner && (
                  <div
                    className={`flex items-center justify-between p-3 rounded-lg border text-xs ${
                      configBanner.type === 'success'
                        ? 'bg-add-bg/40 border-add/40 text-add'
                        : 'bg-del-bg/40 border-del/40 text-del'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      {configBanner.type === 'success' ? <CheckCircle2 size={14} /> : <AlertCircle size={14} />}
                      <span>{configBanner.message}</span>
                    </div>
                    <button
                      className="p-1 hover:bg-black/20 rounded"
                      onClick={() => setConfigBanner(null)}
                      title="Dismiss"
                    >
                      <X size={12} />
                    </button>
                  </div>
                )}

                {/* Default Git Identity */}
                <div className="rounded-lg border border-edge bg-panel2/50 p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-xs font-semibold text-fg block">Default Author Identity</span>
                      <span className="text-[11px] text-dim">
                        Used as the default author for new commits when no custom profile is selected
                      </span>
                    </div>
                    <button
                      type="button"
                      className="btn-secondary !text-xs !py-1 flex items-center gap-1.5"
                      onClick={handleDetectGitConfig}
                      title="Read user.name and user.email from your system Git configuration"
                    >
                      <RefreshCw size={12} />
                      <span>Detect from Git</span>
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-3 pt-1">
                    <div>
                      <label className="text-[11px] font-medium text-dim block mb-1">Author Name (user.name)</label>
                      <input
                        type="text"
                        value={defaultAuthorName}
                        onChange={(e) => setDefaultAuthorName(e.target.value)}
                        placeholder="e.g. Jane Developer"
                        className="w-full text-xs font-mono"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-medium text-dim block mb-1">Author Email (user.email)</label>
                      <input
                        type="email"
                        value={defaultAuthorEmail}
                        onChange={(e) => setDefaultAuthorEmail(e.target.value)}
                        placeholder="e.g. jane@example.com"
                        className="w-full text-xs font-mono"
                      />
                    </div>
                  </div>

                  <div className="flex items-center gap-2 pt-2 border-t border-edge/60">
                    <button
                      type="button"
                      className="btn-secondary !text-[11px] !py-1"
                      onClick={handleApplyGlobalConfig}
                      title="Run git config --global user.name and user.email"
                    >
                      Save to Global (~/.gitconfig)
                    </button>
                    <button
                      type="button"
                      className="btn-secondary !text-[11px] !py-1 disabled:opacity-40"
                      disabled={!activeRepoPath}
                      onClick={handleApplyLocalConfig}
                      title={activeRepoPath ? `Save to ${activeRepoTab?.name || activeRepoPath}/.git/config` : 'Open a repository first'}
                    >
                      Save to Current Repo
                    </button>
                  </div>
                </div>

                {/* Commit Signing Key */}
                <div className="rounded-lg border border-edge bg-panel2/50 p-4 space-y-2">
                  <div className="flex items-center gap-2">
                    <Shield size={14} className="text-accent" />
                    <span className="text-xs font-semibold text-fg">GPG / SSH Commit Signing Key</span>
                  </div>
                  <p className="text-[11px] text-dim">
                    Optional signing key ID or SSH public key file path (e.g. 3AA5C34371567BD2 or ~/.ssh/id_ed25519.pub)
                  </p>
                  <div className="pt-1">
                    <input
                      type="text"
                      value={signingKey}
                      onChange={(e) => setSigningKey(e.target.value)}
                      placeholder="Optional GPG Key ID or ~/.ssh/id_ed25519.pub"
                      className="w-full text-xs font-mono"
                    />
                  </div>
                </div>

                {/* Switchable Commit Profiles */}
                <div className="rounded-lg border border-edge bg-panel2/50 p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-xs font-semibold text-fg block">Switchable Commit Profiles</span>
                      <span className="text-[11px] text-dim">
                        Easily switch identities (e.g. Personal vs Work) directly in the commit panel
                      </span>
                    </div>
                    <button
                      type="button"
                      className="btn-secondary !text-xs !py-1 flex items-center gap-1.5"
                      onClick={() => setNewProfileModalOpen(true)}
                    >
                      <Plus size={12} />
                      <span>Add Profile</span>
                    </button>
                  </div>

                  <div className="space-y-2">
                    {commitProfiles.map((p) => {
                      const isActive = p.id === activeProfileId;
                      return (
                        <div
                          key={p.id}
                          className={`flex items-center justify-between p-3 rounded-lg border transition-all ${
                            isActive
                              ? 'border-accent bg-accent/10 ring-1 ring-accent/30'
                              : 'border-edge/70 bg-panel2/60 hover:bg-panel2'
                          }`}
                        >
                          <div className="space-y-0.5">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-semibold text-fg">{p.name}</span>
                              {isActive && (
                                <span className="rounded bg-accent text-white px-1.5 py-0.5 text-[9px] font-bold tracking-wider uppercase">
                                  Active
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-dim font-mono">
                              {p.authorName || defaultAuthorName || 'Unnamed'}{' '}
                              &lt;{p.authorEmail || defaultAuthorEmail || 'no-email'}&gt;
                              {p.signingKey && (
                                <span className="ml-2 text-accent text-[10px]">🔑 Signed</span>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            {!isActive && (
                              <button
                                type="button"
                                className="btn-secondary !text-[11px] !py-1"
                                onClick={() => setActiveProfileId(p.id)}
                              >
                                Set as Active
                              </button>
                            )}
                            {commitProfiles.length > 1 && (
                              <button
                                type="button"
                                className="btn-icon !w-7 !h-7 text-dim hover:text-del hover:bg-del-bg/30 rounded"
                                onClick={() => handleDeleteProfile(p.id)}
                                title="Delete profile"
                              >
                                <Trash2 size={13} />
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {newProfileModalOpen && (
                    <form
                      onSubmit={handleAddProfile}
                      className="p-3 rounded-lg border border-accent/40 bg-panel3/60 space-y-3 animate-in fade-in"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-fg">New Commit Profile</span>
                        <button
                          type="button"
                          className="btn-icon !w-6 !h-6"
                          onClick={() => setNewProfileModalOpen(false)}
                        >
                          <X size={12} />
                        </button>
                      </div>

                      <div className="grid grid-cols-3 gap-2">
                        <div>
                          <label className="text-[10px] text-dim block mb-1">Profile Name *</label>
                          <input
                            type="text"
                            required
                            placeholder="e.g. Work / Client"
                            value={newProfileName}
                            onChange={(e) => setNewProfileName(e.target.value)}
                            className="w-full text-xs font-mono"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] text-dim block mb-1">Author Name</label>
                          <input
                            type="text"
                            placeholder={defaultAuthorName || 'Author Name'}
                            value={newProfileAuthor}
                            onChange={(e) => setNewProfileAuthor(e.target.value)}
                            className="w-full text-xs font-mono"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] text-dim block mb-1">Author Email</label>
                          <input
                            type="email"
                            placeholder={defaultAuthorEmail || 'email@company.com'}
                            value={newProfileEmail}
                            onChange={(e) => setNewProfileEmail(e.target.value)}
                            className="w-full text-xs font-mono"
                          />
                        </div>
                      </div>

                      <div className="flex justify-end gap-2 pt-1">
                        <button
                          type="button"
                          className="btn-secondary !text-xs !py-1"
                          onClick={() => setNewProfileModalOpen(false)}
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          className="btn-primary !text-xs !py-1"
                        >
                          Save Profile
                        </button>
                      </div>
                    </form>
                  )}
                </div>
              </div>
            )}

            {activeTab === 'ai' && (
              <div className="space-y-5">
                <div>
                  <h3 className="text-xs font-semibold text-fg uppercase tracking-wider mb-1">AI Commit Assistant</h3>
                  <p className="text-xs text-dim">Generate high-quality commit messages based on staged git diffs using free models</p>
                </div>

                {/* Provider Selection */}
                <div className="rounded-lg border border-edge bg-panel2/50 p-4 space-y-3">
                  <div>
                    <span className="text-xs font-semibold text-fg block">Model Provider</span>
                    <span className="text-[11px] text-dim">
                      Choose between free cloud endpoints or your local offline models
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-2.5">
                    {[
                      {
                        id: 'local' as const,
                        name: 'Smart Rule-Based',
                        badge: 'Zero AI / Instant Offline',
                        desc: 'Intelligent diff code inspection'
                      },
                      {
                        id: 'pollinations' as const,
                        name: 'Pollinations.ai',
                        badge: '100% Free / No Key',
                        desc: 'Zero-config free cloud models'
                      },
                      {
                        id: 'openrouter' as const,
                        name: 'OpenRouter Free',
                        badge: 'Gemini, Llama 3.3',
                        desc: 'Access free top-tier models'
                      },
                      {
                        id: 'groq' as const,
                        name: 'Groq Cloud',
                        badge: 'Ultra Fast',
                        desc: 'Llama 3.3 70B fast free tier'
                      },
                      {
                        id: 'gemini' as const,
                        name: 'Google Gemini',
                        badge: 'Free Tier',
                        desc: 'Gemini 2.0 Flash experimental'
                      },
                      {
                        id: 'ollama' as const,
                        name: 'Ollama Local',
                        badge: 'Offline / Private',
                        desc: 'Runs on localhost:11434'
                      },
                      {
                        id: 'custom' as const,
                        name: 'Custom Endpoint',
                        badge: 'OpenAI-Compatible',
                        desc: 'vLLM, LM Studio, LocalAI'
                      }
                    ].map((p) => {
                      const isSelected = aiCommit.provider === p.id;
                      return (
                        <div
                          key={p.id}
                          onClick={() => {
                            let defaultModel = aiCommit.model;
                            if (p.id === 'local') defaultModel = 'heuristic';
                            else if (p.id === 'pollinations') defaultModel = 'openai-fast';
                            else if (p.id === 'openrouter') defaultModel = 'google/gemini-2.0-flash-exp:free';
                            else if (p.id === 'groq') defaultModel = 'llama-3.3-70b-versatile';
                            else if (p.id === 'gemini') defaultModel = 'gemini-2.0-flash-exp';
                            else if (p.id === 'ollama') defaultModel = 'qwen2.5-coder:7b';
                            setAiCommit({ provider: p.id, model: defaultModel });
                          }}
                          className={`p-3 rounded-xl border cursor-pointer transition-all ${
                            isSelected
                              ? 'border-accent bg-panel3 shadow-md ring-1 ring-accent/30'
                              : 'border-edge/70 bg-panel2/60 hover:bg-panel2'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs font-semibold text-fg">{p.name}</span>
                            {isSelected && (
                              <span className="w-3.5 h-3.5 rounded-full bg-accent flex items-center justify-center text-white">
                                <Check size={9} strokeWidth={3} />
                              </span>
                            )}
                          </div>
                          <span className="inline-block text-[10px] font-medium text-accent bg-accent/10 px-1.5 py-0.5 rounded mb-1.5">
                            {p.badge}
                          </span>
                          <p className="text-[11px] text-dim leading-snug">{p.desc}</p>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Model Configuration & Free presets */}
                <div className="rounded-lg border border-edge bg-panel2/50 p-4 space-y-3">
                  <div>
                    <span className="text-xs font-semibold text-fg block">Model Selection</span>
                    <span className="text-[11px] text-dim">
                      Select a free model preset or enter a custom model name
                    </span>
                  </div>

                  {/* Preset quick chips */}
                  <div className="flex flex-wrap gap-1.5">
                    {aiCommit.provider === 'pollinations' && (
                      <>
                        {['openai-fast', 'openai-large', 'deepseek', 'mistral', 'claude'].map((m) => (
                          <button
                            key={m}
                            type="button"
                            onClick={() => setAiCommit({ model: m })}
                            className={`px-2.5 py-1 rounded text-xs transition-all ${
                              aiCommit.model === m
                                ? 'bg-accent text-white font-medium shadow-sm'
                                : 'bg-panel3 text-dim hover:text-fg'
                            }`}
                          >
                            {m}
                          </button>
                        ))}
                      </>
                    )}
                    {aiCommit.provider === 'openrouter' && (
                      <>
                        {[
                          'google/gemini-2.0-flash-exp:free',
                          'meta-llama/llama-3.3-70b-instruct:free',
                          'qwen/qwen-2.5-coder-32b-instruct:free',
                          'deepseek/deepseek-r1:free',
                          'mistralai/mistral-7b-instruct:free'
                        ].map((m) => (
                          <button
                            key={m}
                            type="button"
                            onClick={() => setAiCommit({ model: m })}
                            className={`px-2.5 py-1 rounded text-xs transition-all ${
                              aiCommit.model === m
                                ? 'bg-accent text-white font-medium shadow-sm'
                                : 'bg-panel3 text-dim hover:text-fg'
                            }`}
                          >
                            {m.replace(':free', '')}
                          </button>
                        ))}
                      </>
                    )}
                    {aiCommit.provider === 'groq' && (
                      <>
                        {['llama-3.3-70b-versatile', 'llama-3.1-8b-instant', 'mixtral-8x7b-32768'].map((m) => (
                          <button
                            key={m}
                            type="button"
                            onClick={() => setAiCommit({ model: m })}
                            className={`px-2.5 py-1 rounded text-xs transition-all ${
                              aiCommit.model === m
                                ? 'bg-accent text-white font-medium shadow-sm'
                                : 'bg-panel3 text-dim hover:text-fg'
                            }`}
                          >
                            {m}
                          </button>
                        ))}
                      </>
                    )}
                    {aiCommit.provider === 'gemini' && (
                      <>
                        {['gemini-2.0-flash-exp', 'gemini-1.5-flash', 'gemini-1.5-pro'].map((m) => (
                          <button
                            key={m}
                            type="button"
                            onClick={() => setAiCommit({ model: m })}
                            className={`px-2.5 py-1 rounded text-xs transition-all ${
                              aiCommit.model === m
                                ? 'bg-accent text-white font-medium shadow-sm'
                                : 'bg-panel3 text-dim hover:text-fg'
                            }`}
                          >
                            {m}
                          </button>
                        ))}
                      </>
                    )}
                    {aiCommit.provider === 'ollama' && (
                      <>
                        {['qwen2.5-coder:7b', 'llama3.2', 'deepseek-coder', 'codellama', 'mistral'].map((m) => (
                          <button
                            key={m}
                            type="button"
                            onClick={() => setAiCommit({ model: m })}
                            className={`px-2.5 py-1 rounded text-xs transition-all ${
                              aiCommit.model === m
                                ? 'bg-accent text-white font-medium shadow-sm'
                                : 'bg-panel3 text-dim hover:text-fg'
                            }`}
                          >
                            {m}
                          </button>
                        ))}
                      </>
                    )}
                  </div>

                  <div>
                    <label className="text-[11px] font-medium text-dim block mb-1">Model Name</label>
                    <input
                      type="text"
                      value={aiCommit.model}
                      onChange={(e) => setAiCommit({ model: e.target.value })}
                      placeholder="e.g. openai-fast, gemini-2.0-flash-exp:free, qwen2.5-coder:7b"
                      className="w-full text-xs font-mono"
                    />
                  </div>
                </div>

                {/* API Key / Endpoint */}
                <div className="rounded-lg border border-edge bg-panel2/50 p-4 space-y-3">
                  {aiCommit.provider === 'pollinations' ? (
                    <div className="flex items-center gap-2.5 p-3 rounded-lg bg-add-bg/30 border border-add/30 text-xs text-add">
                      <Sparkles size={16} className="shrink-0" />
                      <div>
                        <span className="font-semibold block">100% Free &amp; Zero Config</span>
                        <span className="text-[11px] opacity-90">
                          Pollinations AI provides free uncapped access without needing an API key or credit card.
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-[11px] font-medium text-dim">
                          {aiCommit.provider === 'ollama' ? 'Ollama API Key (Optional)' : 'API Key *'}
                        </label>
                        {aiCommit.provider === 'openrouter' && (
                          <a
                            href="https://openrouter.ai/keys"
                            target="_blank"
                            rel="noreferrer"
                            className="text-[11px] text-accent hover:underline flex items-center gap-1"
                          >
                            Get Free OpenRouter Key <ExternalLink size={10} />
                          </a>
                        )}
                        {aiCommit.provider === 'groq' && (
                          <a
                            href="https://console.groq.com/keys"
                            target="_blank"
                            rel="noreferrer"
                            className="text-[11px] text-accent hover:underline flex items-center gap-1"
                          >
                            Get Free Groq Key <ExternalLink size={10} />
                          </a>
                        )}
                        {aiCommit.provider === 'gemini' && (
                          <a
                            href="https://aistudio.google.com/app/apikey"
                            target="_blank"
                            rel="noreferrer"
                            className="text-[11px] text-accent hover:underline flex items-center gap-1"
                          >
                            Get Free Gemini Key <ExternalLink size={10} />
                          </a>
                        )}
                      </div>
                      <div className="relative">
                        <input
                          type={showApiKey ? 'text' : 'password'}
                          value={aiCommit.apiKey}
                          onChange={(e) => setAiCommit({ apiKey: e.target.value })}
                          placeholder={
                            aiCommit.provider === 'openrouter'
                              ? 'sk-or-v1-...'
                              : aiCommit.provider === 'groq'
                              ? 'gsk_...'
                              : 'Enter your API key'
                          }
                          className="w-full text-xs font-mono pr-8"
                        />
                        <button
                          type="button"
                          className="absolute right-2 top-1/2 -translate-y-1/2 text-dim hover:text-fg"
                          onClick={() => setShowApiKey(!showApiKey)}
                          title={showApiKey ? 'Hide' : 'Show'}
                        >
                          {showApiKey ? <EyeOff size={14} /> : <Eye size={14} />}
                        </button>
                      </div>
                    </div>
                  )}

                  {(aiCommit.provider === 'ollama' || aiCommit.provider === 'custom') && (
                    <div>
                      <label className="text-[11px] font-medium text-dim block mb-1">Endpoint URL</label>
                      <input
                        type="text"
                        value={aiCommit.endpoint}
                        onChange={(e) => setAiCommit({ endpoint: e.target.value })}
                        placeholder={
                          aiCommit.provider === 'ollama'
                            ? 'http://localhost:11434/api/generate'
                            : 'https://api.example.com/v1/chat/completions'
                        }
                        className="w-full text-xs font-mono"
                      />
                    </div>
                  )}
                </div>

                {/* Commit Style */}
                <div className="rounded-lg border border-edge bg-panel2/50 p-4 space-y-3">
                  <div>
                    <span className="text-xs font-semibold text-fg block">Commit Message Style</span>
                    <span className="text-[11px] text-dim">How generated commit messages should be formatted</span>
                  </div>

                  <div className="grid grid-cols-4 gap-2">
                    {[
                      { id: 'conventional' as const, label: 'Conventional', example: 'feat: add user profile page' },
                      { id: 'gitmoji' as const, label: 'Gitmoji', example: '✨ feat: add user profile page' },
                      { id: 'simple' as const, label: 'Simple', example: 'Add user profile page' },
                      { id: 'detailed' as const, label: 'Detailed', example: 'feat: add user profile\n\n- Add avatar\n- Add stats' }
                    ].map((s) => {
                      const isSelected = aiCommit.promptStyle === s.id;
                      return (
                        <div
                          key={s.id}
                          onClick={() => setAiCommit({ promptStyle: s.id })}
                          className={`p-2.5 rounded-lg border cursor-pointer transition-all ${
                            isSelected
                              ? 'border-accent bg-accent/15 text-accent ring-1 ring-accent/30 font-semibold'
                              : 'border-edge bg-panel2 hover:bg-panel3 text-fg'
                          }`}
                        >
                          <span className="text-xs block mb-1">{s.label}</span>
                          <span className="text-[10px] text-dim font-mono block truncate" title={s.example}>
                            {s.example}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Test Generation */}
                <div className="rounded-lg border border-edge bg-panel2/50 p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-xs font-semibold text-fg block">Test Connection</span>
                      <span className="text-[11px] text-dim">
                        Validate that your model provider is responding properly
                      </span>
                    </div>
                    <button
                      type="button"
                      disabled={testGenerating}
                      onClick={handleTestAi}
                      className="btn-primary !text-xs !py-1.5 flex items-center gap-2"
                    >
                      {testGenerating ? (
                        <>
                          <Loader2 size={13} className="animate-spin" />
                          <span>Generating...</span>
                        </>
                      ) : (
                        <>
                          <Sparkles size={13} />
                          <span>Test AI Model</span>
                        </>
                      )}
                    </button>
                  </div>

                  {testResult && (
                    <div className="p-3 rounded-lg bg-panel3/80 border border-edge space-y-1">
                      <span className="text-[10px] font-semibold text-accent uppercase tracking-wider block">
                        Sample Output
                      </span>
                      <pre className="text-xs font-mono text-fg whitespace-pre-wrap">{testResult}</pre>
                    </div>
                  )}

                  {testError && (
                    <div className="flex items-center gap-2 p-3 rounded-lg bg-del-bg/30 border border-del/30 text-xs text-del">
                      <AlertCircle size={14} className="shrink-0" />
                      <span>{testError}</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeTab === 'about' && (
              <div className="space-y-5">
                <div>
                  <h3 className="text-xs font-semibold text-fg uppercase tracking-wider mb-1">About StrataGit</h3>
                  <p className="text-xs text-dim">A modern commit-graph-centric Git client for Linux &amp; macOS</p>
                </div>

                <div className="rounded-lg border border-edge bg-panel2/50 p-4 space-y-3">
                  <div className="flex items-center gap-3">
                    <StrataLogo size={42} />
                    <div>
                      <div className="text-sm font-semibold text-fg">
                        Strata<span className="text-accent">Git</span> v0.1.0
                      </div>
                      <div className="text-xs text-dim">Built with Electron, React, TypeScript &amp; Vite</div>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="text-xs font-semibold text-fg uppercase tracking-wider mb-2">Keyboard Shortcuts</h4>
                  <div className="rounded-lg border border-edge bg-panel2/40 divide-y divide-edge/60 text-xs">
                    <div className="flex items-center justify-between p-2.5">
                      <span className="text-fg">Open Settings</span>
                      <kbd className="px-2 py-0.5 bg-panel3 border border-edge rounded font-mono text-[11px] text-dim">
                        Ctrl + ,
                      </kbd>
                    </div>
                    <div className="flex items-center justify-between p-2.5">
                      <span className="text-fg">Filter / Search Commits</span>
                      <kbd className="px-2 py-0.5 bg-panel3 border border-edge rounded font-mono text-[11px] text-dim">
                        Ctrl + F
                      </kbd>
                    </div>
                    <div className="flex items-center justify-between p-2.5">
                      <span className="text-fg">Refresh Repository</span>
                      <kbd className="px-2 py-0.5 bg-panel3 border border-edge rounded font-mono text-[11px] text-dim">
                        Ctrl + R
                      </kbd>
                    </div>
                    <div className="flex items-center justify-between p-2.5">
                      <span className="text-fg">Close Diff / Modal</span>
                      <kbd className="px-2 py-0.5 bg-panel3 border border-edge rounded font-mono text-[11px] text-dim">
                        Esc
                      </kbd>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end px-5 py-3 border-t border-edge bg-panel2/60 shrink-0">
          <button
            className="rounded-md bg-accent hover:bg-accent-hover text-white px-5 py-1.5 text-xs font-medium transition-colors shadow-sm"
            onClick={closeSettings}
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
