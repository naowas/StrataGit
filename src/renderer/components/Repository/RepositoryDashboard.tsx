import React, { useCallback, useEffect, useRef, useState } from 'react';
import { FolderGit2, Pin, RefreshCw, X } from 'lucide-react';
import type { RepositoryOverview } from '../../../shared/types';
import { api } from '../../lib/api';
import { useApp } from '../../store';

export function RepositoryDashboard() {
  const recent = useApp(s => s.recentRepos);
  const [pins, setPins] = useState<string[]>([]);
  const [rows, setRows] = useState<Record<string, RepositoryOverview>>({});
  const [filter, setFilter] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const generation = useRef(0);
  const refresh = useCallback(async (repos: string[], hosted = false) => {
    const token = ++generation.current;
    setBusy(true); setError('');
    let cursor = 0;
    await Promise.all(Array.from({ length: Math.min(3, repos.length) }, async () => {
      while (cursor < repos.length && token === generation.current) {
        const repo = repos[cursor++];
        try {
          const row = await api.getRepositoryOverview(repo, hosted);
          if (token === generation.current) setRows(old => ({ ...old, [repo]: { ...row, ...(!hosted && old[repo] ? { requests: old[repo].requests, hostedMessage: old[repo].hostedMessage } : {}) } }));
        } catch (e) { if (token === generation.current) setError(String(e)); }
      }
    }));
    if (token === generation.current) setBusy(false);
  }, []);
  useEffect(() => {
    let mounted = true;
    void api.listPinnedRepos().then(value => { if (mounted) { setPins(value); void refresh(value); } }).catch(e => { if (mounted) setError(String(e)); });
    return () => { mounted = false; ++generation.current; };
  }, [refresh]);
  const pin = async (repo: string, value: boolean) => {
    setBusy(true);
    try { const next = await api.pinRepository(repo, value); setPins(next); await refresh(next); }
    catch (e) { setError(String(e)); setBusy(false); }
  };
  return <section className="flex-1 overflow-auto p-6 bg-base"><div className="max-w-6xl mx-auto space-y-5">
    <header className="flex items-center gap-3 flex-wrap"><div className="flex-1"><h1 className="text-lg font-semibold text-fg">Repository dashboard</h1><p className="text-xs text-dim mt-1">Pinned workspaces. Ahead/behind uses the last fetch; refresh does not fetch or switch repositories.</p></div><button className="btn" disabled={busy} onClick={() => void refresh(pins)}><RefreshCw size={14} className={busy ? 'animate-spin' : ''} />Refresh local</button><button className="btn" disabled={busy} onClick={() => void refresh(pins, true)}>Refresh PRs / MRs</button><button className="btn" aria-label="Close dashboard" onClick={() => useApp.setState({ dashboardOpen: false })}><X size={15} /></button></header>
    {error && <p role="alert" className="text-sm text-del">{error}</p>}
    <div className="flex gap-3 flex-wrap"><input aria-label="Filter pinned repositories" className="input flex-1 min-w-48" placeholder="Filter pinned repositories…" value={filter} onChange={e => setFilter(e.target.value)} /><select aria-label="Pin a repository" className="input max-w-sm" value="" disabled={busy} onChange={e => void pin(e.target.value, true)}><option value="">Pin a recently opened repository…</option>{recent.filter(p => !pins.includes(p)).map(p => <option key={p} value={p}>{p}</option>)}</select></div>
    {!pins.length && <div className="p-8 rounded-lg border border-edge text-dim text-sm">Pin a repository above. Open it from Launchpad first if it is missing.</div>}
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">{pins.filter(p => p.toLowerCase().includes(filter.toLowerCase())).map(repo => {
      const row = rows[repo];
      return <article key={repo} className="rounded-lg border border-edge bg-panel p-4 space-y-3"><div className="flex items-start gap-3"><FolderGit2 className="text-accent shrink-0" size={20} /><div className="min-w-0 flex-1"><button className="text-fg font-semibold hover:underline" onClick={() => { useApp.setState({ dashboardOpen: false }); void useApp.getState().openRepo(repo); }}>{repo.split(/[/\\]/).pop()}</button><div className="text-xs text-faint break-all">{repo}</div></div><button className="btn" title="Unpin repository" disabled={busy} onClick={() => void pin(repo, false)}><Pin size={13} /></button></div>
        {!row ? <p className="text-xs text-dim">Loading…</p> : row.error ? <p className="text-xs text-del break-words">{row.error}</p> : <><div className="text-sm text-accent truncate">{row.branch}</div><div className="flex gap-4 flex-wrap text-xs text-dim"><span>{row.changed} changed · {row.staged} staged</span><span className={row.conflicts ? 'text-del' : ''}>{row.conflicts} conflicts</span><span>↑ {row.ahead} · ↓ {row.behind}</span></div>{row.requests && <div className="border-t border-edge pt-2 space-y-1"><div className="text-xs text-fg">{row.requests.length} open requests loaded</div>{row.requests.map(pr => <button key={pr.id} className="block text-xs text-accent text-left truncate max-w-full hover:underline" onClick={() => void api.openExternal(pr.url)}>#{pr.id} {pr.title}</button>)}</div>}{row.hostedMessage && <p className="text-xs text-faint">{row.hostedMessage}</p>}<p className="text-[11px] text-faint">Local status checked {new Date(row.checkedAt).toLocaleTimeString()}. PRs refresh on request.</p></>}
      </article>;
    })}</div>
  </div></section>;
}
