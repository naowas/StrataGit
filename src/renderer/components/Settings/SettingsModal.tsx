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
  Terminal,
  Layers,
  ChevronRight,
  RefreshCw
} from 'lucide-react';
import {
  useSettings,
  THEMES,
  ThemeId,
  UI_FONT_PRESETS,
  CODE_FONT_PRESETS
} from '../../store/settings';
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
    resetDefaults
  } = useSettings();

  const [activeTab, setActiveTab] = useState<'themes' | 'typography' | 'git' | 'about'>('themes');

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

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 backdrop-blur-sm p-4 animate-in fade-in duration-150"
      onClick={closeSettings}
    >
      <div
        className="w-full max-w-3xl h-[600px] max-h-[90vh] flex flex-col rounded-xl border border-edge bg-panel shadow-2xl overflow-hidden"
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
              <span className="text-[11px] text-dim">Customize appearance, fonts and preferences</span>
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
              <span className="flex-1">Themes & Colors</span>
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
              <span className="flex-1">Typography & Fonts</span>
              {activeTab === 'typography' && <ChevronRight size={13} />}
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
              <span className="flex-1">About & Shortcuts</span>
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
