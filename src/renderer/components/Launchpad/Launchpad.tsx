import React from 'react';
import { FolderGit2, FolderOpen, FolderPlus, Settings } from 'lucide-react';
import { useApp } from '../../store';
import { useSettings } from '../../store/settings';
import { api } from '../../lib/api';
import { StrataLogo } from '../Common/StrataLogo';

export function Launchpad() {
  const recentRepos = useApp((s) => s.recentRepos);
  const openRepo = useApp((s) => s.openRepo);
  const openRepoDialog = useApp((s) => s.openRepoDialog);
  const openCreateRepoModal = useApp((s) => s.openCreateRepoModal);

  return (
    <div className="flex-1 flex flex-col items-center justify-center gap-6 bg-base">
      <div className="flex flex-col items-center gap-2">
        <div className="flex items-center gap-3">
          <StrataLogo size={46} />
          <h1 className="text-3xl font-bold tracking-tight text-fg">
            Strata<span className="text-accent">Git</span>
          </h1>
        </div>
        <p className="text-xs text-dim">Visual commit strata &amp; effortless Git workflow</p>
      </div>
      <div className="flex items-center gap-3">
        <button
          className="flex items-center gap-2 rounded-md bg-accent hover:bg-accent-hover text-white px-4 py-2 text-sm font-medium transition-colors shadow-sm"
          onClick={() => void openRepoDialog()}
        >
          <FolderOpen size={15} /> Open Repository
        </button>
        <button
          className="btn border border-edge bg-panel2 px-4 py-2 text-sm font-medium text-fg hover:bg-panel3 flex items-center gap-2"
          onClick={() => openCreateRepoModal()}
        >
          <FolderPlus size={15} className="text-accent" /> Create Repository
        </button>
        <button
          className="btn border border-edge bg-panel2 px-4 py-2 text-sm font-medium text-dim hover:text-fg hover:bg-panel3"
          onClick={() => useSettings.getState().openSettings()}
        >
          <Settings size={15} /> Settings
        </button>
      </div>
      {recentRepos.length > 0 && (
        <div className="w-full max-w-md">
          <div className="text-xs text-faint uppercase tracking-wide mb-2 px-1">Recently opened</div>
          <div className="rounded-md border border-edge divide-y divide-edge/60 overflow-hidden">
            {recentRepos.map((r) => (
              <div key={r} className="group flex items-center gap-2 px-3 py-2 hover:bg-panel2 cursor-pointer" onClick={() => void openRepo(r)}>
                <FolderGit2 size={14} className="text-accent shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="text-sm text-fg truncate">{r.split('/').pop()}</div>
                  <div className="text-xs text-faint truncate">{r}</div>
                </div>
                <button
                  className="opacity-0 group-hover:opacity-100 text-dim hover:text-del text-xs px-1"
                  title="Remove from recent"
                  onClick={(e) => {
                    e.stopPropagation();
                    void api.removeRecentRepo(r);
                    useApp.setState({ recentRepos: recentRepos.filter((x) => x !== r) });
                  }}
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
