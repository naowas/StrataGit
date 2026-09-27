import React, { useMemo, useState, useRef, useEffect } from 'react';
import { Commit, CommitRef, GitFileStatus } from '../../../shared/types';
import { useApp, WIP_HASH } from '../../store';
import { useSettings } from '../../store/settings';
import { api } from '../../lib/api';
import { ContextMenu, ContextMenuItem } from '../ui/ContextMenu';
import { buildGitGraph } from './gitgraph';
import { LANE_W, ROW_H, BRANCH_W } from './lanes';
import { GitGraphCanvas } from './GitGraphCanvas';
import {
  GitBranch,
  GitPullRequest,
  ArrowDownToLine,
  ArrowUpFromLine,
  FolderPlus,
  RotateCcw,
  Pencil,
  Trash2,
  XCircle,
  ArrowDown,
  Sparkles,
  ArrowUp,
  Rocket,
  Check,
  Laptop,
  User,
  Tag,
  Cloud,
  Plus,
  Minus,
  Layers
} from 'lucide-react';

const DOT_R = 5;

/** Stable empty list, so the conversion memo keys off the filtered commits only. */
const NO_COMMITS: Commit[] = [];

export interface DisplayRef {
  label: string;
  kind: 'branch' | 'tag' | 'head';
  isCurrent: boolean;
  hasLocal: boolean;
  hasRemote: boolean;
  raw: CommitRef;
}

export function consolidateRefs(refs: CommitRef[]): DisplayRef[] {
  if (!refs || refs.length === 0) return [];
  const results: DisplayRef[] = [];
  const handled = new Set<string>();

  // 1. Tags
  for (const r of refs) {
    if (r.kind === 'tag') {
      results.push({
        label: r.label,
        kind: 'tag',
        isCurrent: false,
        hasLocal: false,
        hasRemote: false,
        raw: r
      });
    }
  }

  // 2. Local branches paired with matching remote tracking branch
  for (const r of refs) {
    if (r.kind !== 'tag' && !r.isRemote) {
      handled.add(r.label);
      const remoteRef = refs.find(
        (other) => other.isRemote && (other.label === `origin/${r.label}` || other.label.endsWith(`/${r.label}`))
      );
      if (remoteRef) {
        handled.add(remoteRef.label);
      }
      results.push({
        label: r.label,
        kind: r.kind,
        isCurrent: !!r.isCurrent,
        hasLocal: true,
        hasRemote: !!remoteRef,
        raw: r
      });
    }
  }

  // 3. Remote-only branches that didn't match a local branch
  for (const r of refs) {
    if (r.kind !== 'tag' && r.isRemote && !handled.has(r.label)) {
      results.push({
        label: r.label,
        kind: r.kind,
        isCurrent: !!r.isCurrent,
        hasLocal: false,
        hasRemote: true,
        raw: r
      });
    }
  }

  // Sort: current checked-out branch first, then local branches, then tags, then remote-only
  results.sort((a, b) => {
    if (a.isCurrent !== b.isCurrent) return a.isCurrent ? -1 : 1;
    if (a.hasLocal !== b.hasLocal) return a.hasLocal ? -1 : 1;
    if ((a.kind === 'tag') !== (b.kind === 'tag')) return a.kind === 'tag' ? -1 : 1;
    return a.label.localeCompare(b.label);
  });

  return results;
}

export function RefPill({
  value: r,
  onContextMenu
}: {
  value: DisplayRef;
  onContextMenu?: (e: React.MouseEvent) => void;
}) {
  const isHead = r.isCurrent;
  const isTag = r.kind === 'tag';

  return (
    <div
      className={`inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[11px] leading-none font-medium whitespace-nowrap cursor-pointer select-none transition-all shadow-sm min-w-0 max-w-full overflow-hidden ${
        isHead
          ? 'bg-[#0e3b4a] border border-[#00bcd4]/70 text-cyan-200 shadow-[#00bcd4]/10'
          : isTag
            ? 'bg-[#352a1c] border border-warn/70 text-amber-200'
            : r.hasRemote && !r.hasLocal
              ? 'bg-panel3 border border-edge text-dim hover:text-fg'
              : 'bg-panel3 border border-edge text-fg/90 hover:border-fg/40'
      }`}
      title={r.label}
      onClick={(e) => e.stopPropagation()}
      onContextMenu={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onContextMenu?.(e);
      }}
    >
      {isHead && <Check size={11} className="text-cyan-300 stroke-[2.5] shrink-0" />}
      {isTag && <Tag size={10} className="text-warn shrink-0" />}
      <span className="truncate">{r.label}</span>
      {(r.hasLocal || isHead) && <Laptop size={10} className="shrink-0 opacity-80" />}
      {r.hasRemote && <Cloud size={10} className="shrink-0 opacity-80" />}
    </div>
  );
}

const WIP_COMMIT: Commit = {
  hash: WIP_HASH,
  shortHash: 'WIP',
  parents: [],
  message: 'Uncommitted changes',
  body: '',
  authorName: '',
  authorEmail: '',
  date: new Date().toISOString(),
  refs: [],
  lane: 0,
  lanes: []
};

function formatRelativeDate(iso: string): string {
  if (!iso) return '';
  try {
    const d = new Date(iso);
    const now = Date.now();
    const diff = (now - d.getTime()) / 1000;
    if (diff < 60) return 'just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    if (diff < 86400 * 30) return `${Math.floor(diff / 86400)}d ago`;
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  } catch {
    return iso;
  }
}

function formatFullDate(iso: string): string {
  if (!iso) return '';
  try {
    const d = new Date(iso);
    return d.toLocaleString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch {
    return iso;
  }
}

function CommitRow({
  commit,
  isWip,
  graphW,
  laneColor = '#26c6da',
  hovered = false,
  rowH = ROW_H,
  onContextMenu,
  onRefContextMenu
}: {
  commit: Commit;
  isWip?: boolean;
  graphW: number;
  laneColor?: string;
  hovered?: boolean;
  rowH?: number;
  onContextMenu?: (e: React.MouseEvent, commit: Commit) => void;
  onRefContextMenu?: (e: React.MouseEvent, ref: CommitRef) => void;
}) {
  const selected = useApp((s) => s.selectedCommit);
  const selectCommit = useApp((s) => s.selectCommit);
  const openFileDiff = useApp((s) => s.openFileDiff);
  const status = useApp((s) => s.status);
  const isSelected = selected === commit.hash;

  const wipStats = useMemo(() => {
    if (!isWip || !status) return null;
    const all = [...(status.staged || []), ...(status.unstaged || [])];
    const pathMap = new Map<string, GitFileStatus>();
    for (const f of all) {
      if (!pathMap.has(f.path)) {
        pathMap.set(f.path, f);
      } else if (f.status === 'deleted' || f.status === 'conflicted') {
        pathMap.set(f.path, f);
      }
    }
    const files = Array.from(pathMap.values());
    const modified = files.filter((f) => f.status === 'modified' || f.status === 'renamed').length;
    const added = files.filter((f) => f.status === 'added' || f.status === 'untracked').length;
    const deleted = files.filter((f) => f.status === 'deleted').length;
    const total = files.length;
    return { modified, added, deleted, total };
  }, [isWip, status]);

  const onDoubleClick = () => {
    if (isWip) {
      const st = useApp.getState().status;
      const isStaged = (st?.staged || []).length > 0;
      const first = (st?.staged || [])[0] || (st?.unstaged || [])[0];
      if (first) void openFileDiff({ commitHash: null, filePath: first.path, staged: isStaged, status: first.status });
    } else {
      void api.getCommitDetail(commit.hash).then((d) => {
        if (d && d.files[0]) void openFileDiff({ commitHash: commit.hash, filePath: d.files[0].path, status: d.files[0].status });
      });
    }
  };

  const displayRefs = useMemo(() => consolidateRefs(commit.refs), [commit.refs]);

  return (
    <div
      className={`flex items-center cursor-pointer select-none transition-colors ${
        isSelected
          ? 'bg-accent/20 font-medium'
          : hovered
            ? 'bg-panel2/70'
            : 'hover:bg-panel2/40'
      }`}
      style={{ height: rowH }}
      onClick={() => void selectCommit(commit.hash)}
      onDoubleClick={onDoubleClick}
      onContextMenu={(e) => {
        if (!isWip && onContextMenu) {
          e.preventDefault();
          onContextMenu(e, commit);
        }
      }}
    >
      {/* 1. BRANCH / TAG column */}
      <div
        className="relative flex items-center shrink-0 pl-2.5 pr-0 overflow-hidden"
        style={{ width: BRANCH_W }}
      >
        {displayRefs.length > 0 ? (
          <div className="flex items-center w-full min-w-0 pr-0 overflow-hidden">
            <div className="flex items-center gap-1 shrink min-w-0 z-[2] max-w-[calc(100%-20px)] overflow-hidden">
              <RefPill
                value={displayRefs[0]}
                onContextMenu={(e) => onRefContextMenu?.(e, displayRefs[0].raw)}
              />
              {displayRefs.length > 1 && (
                <span
                  className="rounded bg-panel3 border border-edge px-1 py-0.5 text-[10px] text-dim shrink-0 font-medium cursor-pointer hover:border-fg/40 whitespace-nowrap"
                  title={displayRefs.slice(1).map((r) => r.label).join(', ')}
                >
                  +{displayRefs.length - 1}
                </span>
              )}
            </div>
            {/* Horizontal connector line extending to right edge of BRANCH / TAG column */}
            <div
              className="flex-1 min-w-[16px] h-[2px] z-[1]"
              style={{ backgroundColor: laneColor }}
            />
          </div>
        ) : null}
      </div>

      {/* 2. GRAPH column placeholder (visuals rendered by GitGraphCanvas) */}
      <div className="relative shrink-0" style={{ width: graphW }} />

      {/* 3. COMMIT MESSAGE column */}
      <div className="flex items-center flex-1 min-w-0 pr-3 pl-1 overflow-hidden">
        {/* Vertical cyan indicator bar as in the reference image (only on regular commits) */}
        {!isWip && (
          <div
            className="w-[3px] h-4 rounded-full shrink-0 mr-2"
            style={{ backgroundColor: laneColor }}
          />
        )}

        {/* Message Subject */}
        {isWip ? (
          <div className="flex items-center gap-2 select-none overflow-hidden">
            <span className="px-2 py-0.5 rounded bg-panel3/90 border border-edge text-fg/80 font-mono text-[11px] font-medium tracking-wide shadow-xs shrink-0">
              // WIP
            </span>
            {wipStats && (
              <div className="flex items-center gap-2.5 shrink-0">
                {wipStats.modified > 0 && (
                  <span
                    className="flex items-center gap-1 text-warn text-xs font-mono font-medium"
                    title={`${wipStats.modified} modified file${wipStats.modified === 1 ? '' : 's'}`}
                  >
                    <Pencil size={11} className="text-warn shrink-0" />
                    <span>{wipStats.modified}</span>
                  </span>
                )}
                {wipStats.added > 0 && (
                  <span
                    className="flex items-center gap-0.5 text-add text-xs font-mono font-medium"
                    title={`${wipStats.added} added/untracked file${wipStats.added === 1 ? '' : 's'}`}
                  >
                    <Plus size={13} className="text-add shrink-0 stroke-[2.5]" />
                    <span>{wipStats.added}</span>
                  </span>
                )}
                {wipStats.deleted > 0 && (
                  <span
                    className="flex items-center gap-0.5 text-del text-xs font-mono font-medium"
                    title={`${wipStats.deleted} deleted file${wipStats.deleted === 1 ? '' : 's'}`}
                  >
                    <Minus size={13} className="text-del shrink-0 stroke-[2.5]" />
                    <span>{wipStats.deleted}</span>
                  </span>
                )}
                {wipStats.total > 0 &&
                  wipStats.modified === 0 &&
                  wipStats.added === 0 &&
                  wipStats.deleted === 0 && (
                    <span className="text-xs text-dim font-mono">
                      {wipStats.total} changes
                    </span>
                  )}
              </div>
            )}
          </div>
        ) : (
          <span
            className={`truncate text-xs font-normal ${
              isSelected ? 'text-white font-medium' : 'text-fg/90'
            }`}
            title={commit.message}
          >
            {commit.message || '(no message)'}
          </span>
        )}

        {/* Extended Body snippet */}
        {commit.body && (
          <span className="truncate text-dim/70 text-xs hidden lg:block ml-2 opacity-80">
            - {commit.body.split('\n')[0]}
          </span>
        )}

        {/* Relative date on the right edge */}
        {!isWip && commit.date && (
          <span
            className="text-[11px] text-faint ml-auto shrink-0 pl-3 select-none"
            title={formatFullDate(commit.date)}
          >
            {formatRelativeDate(commit.date)}
          </span>
        )}
      </div>
    </div>
  );
}

export function CommitGraph() {
  const log = useApp((s) => s.log);
  const filter = useApp((s) => s.filter);
  const status = useApp((s) => s.status);
  const currentBranch = status?.currentBranch ?? '';
  const selectedCommit = useApp((s) => s.selectedCommit);
  const selectCommit = useApp((s) => s.selectCommit);
  const runAndRefresh = useApp((s) => s.runAndRefresh);
  const notify = useApp((s) => s.notify);
  const loadMoreCommits = useApp((s) => s.loadMoreCommits);
  const isLoadingMoreCommits = useApp((s) => s.isLoadingMoreCommits);
  const openRebaseModal = useApp((s) => s.openRebaseModal);
  const cherryPickCommit = useApp((s) => s.cherryPickCommit);
  const openCreateTagModal = useApp((s) => s.openCreateTagModal);

  const openDiff = useApp((s) => s.openDiff);
  const diffMaximized = useApp((s) => s.diffMaximized);

  const [menu, setMenu] = useState<{ x: number; y: number; commit: Commit } | null>(null);
  const [refMenu, setRefMenu] = useState<{ x: number; y: number; ref: CommitRef } | null>(null);
  const [hoveredHash, setHoveredHash] = useState<string | null>(null);

  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [viewportHeight, setViewportHeight] = useState(800);

  useEffect(() => {
    const el = scrollContainerRef.current;
    if (el) {
      setViewportHeight(el.clientHeight);
      const onResize = () => setViewportHeight(el.clientHeight);
      window.addEventListener('resize', onResize);
      const ro = new ResizeObserver(() => {
        if (el.clientHeight > 0) setViewportHeight(el.clientHeight);
      });
      ro.observe(el);
      return () => {
        window.removeEventListener('resize', onResize);
        ro.disconnect();
      };
    }
  }, []);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const target = e.currentTarget;
    setScrollTop(target.scrollTop);
    setViewportHeight(target.clientHeight);

    if (
      !isLoadingMoreCommits &&
      log?.hasMore &&
      target.scrollTop + target.clientHeight >= target.scrollHeight - 500
    ) {
      void loadMoreCommits();
    }
  };

  const q = filter.trim().toLowerCase();
  const allCommits = log?.commits;
  const commits = useMemo(() => {
    if (!allCommits) return NO_COMMITS;
    if (!q) return allCommits;

    // Advanced search syntax support
    if (q.startsWith('author:') || q.startsWith('from:')) {
      const author = q.replace(/^(author|from):/, '').trim();
      return allCommits.filter(
        (c) => c.authorName.toLowerCase().includes(author) || c.authorEmail.toLowerCase().includes(author)
      );
    }
    if (q.startsWith('hash:')) {
      const h = q.replace(/^hash:/, '').trim();
      return allCommits.filter((c) => c.hash.toLowerCase().startsWith(h));
    }
    if (q.startsWith('tag:')) {
      const t = q.replace(/^tag:/, '').trim();
      return allCommits.filter((c) => c.refs.some((r) => r.kind === 'tag' && r.label.toLowerCase().includes(t)));
    }
    if (q.startsWith('branch:')) {
      const b = q.replace(/^branch:/, '').trim();
      return allCommits.filter((c) => c.refs.some((r) => r.kind === 'branch' && r.label.toLowerCase().includes(b)));
    }

    return allCommits.filter(
      (c) =>
        c.message.toLowerCase().includes(q) ||
        c.hash.startsWith(q) ||
        c.authorName.toLowerCase().includes(q) ||
        c.refs.some((r) => r.label.toLowerCase().includes(q))
    );
  }, [allCommits, q]);

  const graphRowHeight = useSettings((s) => s.graphRowHeight);
  const rowH = graphRowHeight || ROW_H;

  const graphData = useMemo(() => buildGitGraph(commits, { rowH, laneW: LANE_W }), [commits, rowH]);

  if (!log) {
    return <div className="flex-1 flex items-center justify-center text-dim text-sm">Open a repository to view the commit graph</div>;
  }

  const wip = status && (status.staged.length > 0 || status.unstaged.length > 0);
  const graphW = Math.max(graphData.width, 40);
  const rowTop = wip ? rowH : 0;

  const BUFFER = 15;
  const startIndex = Math.max(0, Math.floor(scrollTop / rowH) - BUFFER);
  const endIndex = Math.min(commits.length - 1, Math.ceil((scrollTop + viewportHeight) / rowH) + BUFFER);
  const visibleCommits = commits.length > 0 && endIndex >= startIndex ? commits.slice(startIndex, endIndex + 1) : [];

  const topSpacerHeight = startIndex * rowH;
  const bottomSpacerHeight = Math.max(0, (commits.length - 1 - endIndex) * rowH);

  const previewStub = (feature: string) => notify('info', `${feature} is a preview feature — coming soon`);

  const refMenuItems = (ref: CommitRef): ContextMenuItem[] => {
    const name = ref.label;
    if (ref.kind === 'tag') {
      return [
        {
          label: `Push tag "${name}" to origin`,
          icon: <ArrowUpFromLine size={13} />,
          onClick: () => void runAndRefresh(() => api.pushTag(name, 'origin'), `Pushed tag ${name}`)
        },
        {
          label: `Delete tag "${name}" (Local)`,
          icon: <Trash2 size={13} />,
          danger: true,
          onClick: () => void runAndRefresh(() => api.deleteTag(name, false), `Deleted tag ${name}`)
        },
        {
          label: `Delete tag "${name}" on origin`,
          icon: <Trash2 size={13} />,
          danger: true,
          onClick: () => void runAndRefresh(() => api.deleteTag(name, true, 'origin'), `Deleted remote tag ${name}`)
        },
        { label: '', divider: true },
        {
          label: 'Copy Tag Name',
          icon: <Tag size={13} />,
          onClick: () => {
            void navigator.clipboard.writeText(name);
            notify('info', `Copied tag "${name}" to clipboard`);
          }
        }
      ];
    }
    const isLocal = !ref.isRemote;
    const remoteName = ref.isRemote ? name.split('/')[0] : 'origin';
    const remoteShort = ref.isRemote ? name.split('/').slice(1).join('/') : name;
    return [
      ...(isLocal
        ? ([
            {
              label: `Checkout ${name}`,
              icon: <GitBranch size={13} />,
              onClick: () => void runAndRefresh(() => api.checkoutBranch(name), `Checked out ${name}`)
            },
            {
              label: `Push ${name} to origin`,
              icon: <ArrowUpFromLine size={13} />,
              onClick: () => void runAndRefresh(() => api.pushSetUpstream(name), `Pushed ${name}`)
            },
            {
              label: 'Set Upstream…',
              icon: <ArrowUp size={13} />,
              prompt: {
                placeholder: `Upstream (e.g. origin/${name})`,
                submitLabel: 'Set upstream',
                onSubmit: (u) => void runAndRefresh(() => api.setUpstream(name, u), `Upstream of ${name} set to ${u}`)
              }
            },
            { label: '', divider: true },
            {
              label: `Delete ${name}`,
              icon: <Trash2 size={13} />,
              danger: true,
              onClick: () => void runAndRefresh(() => api.deleteBranch(name, { local: true }), `Deleted ${name}`)
            },
            {
              label: `Force delete ${name}`,
              icon: <Trash2 size={13} />,
              danger: true,
              onClick: () =>
                void runAndRefresh(() => api.deleteBranch(name, { local: true, force: true }), `Force deleted ${name}`)
            }
          ] as ContextMenuItem[])
        : [
            {
              label: `Delete ${name}`,
              icon: <Trash2 size={13} />,
              danger: true,
              onClick: () =>
                void runAndRefresh(
                  () => api.deleteBranch(remoteShort, { local: false, remote: true, force: true }),
                  `Deleted ${name}`
                )
            }
          ]),
      {
        label: `Delete ${name} and ${remoteName}/${remoteShort}`,
        icon: <Trash2 size={13} />,
        danger: true,
        onClick: () =>
          void runAndRefresh(
            () => api.deleteBranch(remoteShort, { local: true, remote: true, force: true }),
            `Deleted ${name} and ${remoteName}/${remoteShort}`
          )
      }
    ];
  };

  const commitMenuItems = (commit: Commit): ContextMenuItem[] => [
    {
      label: 'Pull (fast-forward if possible)',
      icon: <ArrowDownToLine size={13} />,
      onClick: () => void runAndRefresh(() => api.pull(), 'Pull complete')
    },
    {
      label: 'Push',
      icon: <ArrowUpFromLine size={13} />,
      onClick: () => void runAndRefresh(() => api.push(), 'Push complete')
    },
    { label: '', divider: true },
    // If this commit is the tip of one or more local branches, show a per-branch
    // checkout item (switches the working tree to that branch, not detached HEAD).
    ...commit.refs
      .filter((r) => !r.isRemote && r.kind === 'branch')
      .map((r) => ({
        label: `Checkout ${r.label}`,
        icon: <GitBranch size={13} />,
        onClick: () =>
          void runAndRefresh(() => api.checkoutBranch(r.label), `Checked out ${r.label}`)
      })),
    {
      label: 'Checkout as detached HEAD',
      icon: <GitBranch size={13} />,
      onClick: () =>
        void runAndRefresh(() => api.checkoutCommit(commit.hash), `Checked out ${commit.shortHash} (detached HEAD)`)
    },
    {
      label: 'Create worktree from',
      icon: <FolderPlus size={13} />,
      prompt: {
        placeholder: 'Worktree path (e.g. ../wt-feature)',
        submitLabel: 'Create worktree',
        onSubmit: (p) => void runAndRefresh(() => api.createWorktree(commit.hash, p), `Worktree created at ${p}`)
      }
    },
    {
      label: 'Create branch here',
      icon: <GitBranch size={13} />,
      prompt: {
        placeholder: 'Branch name',
        submitLabel: 'Create branch',
        onSubmit: (name) => void runAndRefresh(() => api.createBranch(name, commit.hash), `Branch '${name}' created`)
      }
    },
    {
      label: 'Create tag here…',
      icon: <Tag size={13} />,
      onClick: () => openCreateTagModal(commit.hash)
    },
    {
      label: 'Cherry-Pick onto current branch',
      icon: <Layers size={13} />,
      onClick: () => void cherryPickCommit(commit.hash)
    },
    {
      label: 'Interactive Rebase from here...',
      icon: <GitBranch size={13} />,
      onClick: () => openRebaseModal(commit.hash)
    },
    { label: '', divider: true },
    ...(currentBranch
      ? ([
          {
            label: `Reset ${currentBranch} to this commit (hard)`,
            icon: <RotateCcw size={13} />,
            danger: true,
            onClick: () => void runAndRefresh(() => api.resetBranchTo(commit.hash, 'hard'), `Reset ${currentBranch} (hard)`)
          },
          {
            label: `Reset ${currentBranch} to this commit (soft)`,
            icon: <RotateCcw size={13} />,
            onClick: () => void runAndRefresh(() => api.resetBranchTo(commit.hash, 'soft'), `Reset ${currentBranch} (soft)`)
          },
          {
            label: `Reset ${currentBranch} to this commit (mixed)`,
            icon: <RotateCcw size={13} />,
            onClick: () => void runAndRefresh(() => api.resetBranchTo(commit.hash, 'mixed'), `Reset ${currentBranch} (mixed)`)
          },
          { label: '', divider: true }
        ] as ContextMenuItem[])
      : []),
    {
      label: 'Edit commit message',
      icon: <Pencil size={13} />,
      prompt: {
        placeholder: 'New commit message',
        initial: commit.message,
        submitLabel: 'Reword commit',
        onSubmit: (m) => void runAndRefresh(() => api.editCommitMessage(commit.hash, m), 'Commit message updated')
      }
    },
    {
      label: 'Revert commit',
      icon: <XCircle size={13} />,
      onClick: () => void runAndRefresh(() => api.revertCommit(commit.hash), `Reverted ${commit.shortHash}`)
    },
    {
      label: 'Recompose commit with AI (Preview)',
      icon: <Sparkles size={13} />,
      onClick: () => previewStub('Recompose commit with AI')
    },
    {
      label: 'Drop commit',
      icon: <Trash2 size={13} />,
      danger: true,
      onClick: () => void runAndRefresh(() => api.dropCommit(commit.hash), `Dropped ${commit.shortHash}`)
    },
    {
      label: 'Move commit down',
      icon: <ArrowDown size={13} />,
      onClick: () => void runAndRefresh(() => api.moveCommitDown(commit.hash), `Moved ${commit.shortHash} down`)
    },
    { label: '', divider: true },
    {
      label: 'Start a pull request to origin',
      icon: <GitPullRequest size={13} />,
      onClick: () => previewStub('Start a pull request')
    },
    {
      label: 'Explain Branch Changes (Preview)',
      icon: <Rocket size={13} />,
      onClick: () => previewStub('Explain Branch Changes')
    },
    {
      label: 'Apply patch to current branch',
      icon: <ArrowUp size={13} />,
      onClick: () => void runAndRefresh(() => api.applyPatchCommit(commit.hash), `Applied patch of ${commit.shortHash}`)
    }
  ];


  return (
    <div
      ref={scrollContainerRef}
      onScroll={handleScroll}
      className={openDiff && diffMaximized ? 'hidden' : 'flex-1 overflow-auto min-h-0 bg-base'}
    >
      <div className="sticky top-0 z-10 flex items-center bg-panel border-b border-edge text-[11px] font-semibold tracking-wider text-dim select-none h-7">
        <div className="pl-3" style={{ width: BRANCH_W }}>
          BRANCH / TAG
        </div>
        <div className="pl-1" style={{ width: graphW }}>
          GRAPH
        </div>
        <div className="flex-1 min-w-0 pl-1">
          COMMIT MESSAGE
        </div>
      </div>
      {/* The rows scrolling under the overlay */}
      <div id="gg-rows" className="relative">
        {/* GitGraph Canvas overlay */}
        <div
          className="absolute top-0 bottom-0 pointer-events-none z-[1]"
          style={{ left: BRANCH_W, width: graphW }}
        >
          <GitGraphCanvas
            graphData={graphData}
            rowTop={rowTop}
            rowH={rowH}
            laneW={LANE_W}
            selectedHash={selectedCommit}
            hoveredHash={hoveredHash}
            hasWip={!!wip}
            visibleRange={{ startIndex, endIndex }}
            onHover={setHoveredHash}
            onSelect={(hash) => void selectCommit(hash)}
            onContextMenu={(e, hash) => {
              void selectCommit(hash);
              const commit = commits.find((c) => c.hash === hash);
              if (commit) {
                setRefMenu(null);
                setMenu({ x: e.clientX, y: e.clientY, commit });
              }
            }}
          />
        </div>

        {wip && (
          <CommitRow
            commit={WIP_COMMIT}
            isWip
            graphW={graphW}
            laneColor={graphData.commits[0]?.color || '#26c6da'}
            rowH={rowH}
          />
        )}

        {/* Top spacer for virtual scrolling */}
        {topSpacerHeight > 0 && <div style={{ height: topSpacerHeight }} />}

        {/* Virtualized visible rows */}
        {visibleCommits.map((c, sliceIdx) => {
          const i = startIndex + sliceIdx;
          return (
            <CommitRow
              key={c.hash}
              commit={c}
              graphW={graphW}
              laneColor={graphData.commits[i]?.color || '#26c6da'}
              hovered={hoveredHash === c.hash}
              rowH={rowH}
              onContextMenu={(e, commit) => {
                void selectCommit(commit.hash);
                setRefMenu(null);
                setMenu({ x: e.clientX, y: e.clientY, commit });
              }}
              onRefContextMenu={(e, ref) => {
                setMenu(null);
                setRefMenu({ x: e.clientX, y: e.clientY, ref });
              }}
            />
          );
        })}

        {/* Bottom spacer for virtual scrolling */}
        {bottomSpacerHeight > 0 && <div style={{ height: bottomSpacerHeight }} />}
      </div>

      {commits.length === 0 && !wip && (
        <div className="p-6 text-sm text-faint">No commits match the current filter.</div>
      )}

      {/* Infinite Scroll Loader & Footer Status */}
      <div className="flex items-center justify-center py-4 text-xs text-dim select-none gap-2">
        {isLoadingMoreCommits ? (
          <>
            <div className="w-3.5 h-3.5 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
            <span>Loading more commits… ({commits.length} of {log?.totalCommits || commits.length})</span>
          </>
        ) : log?.hasMore ? (
          <button
            className="btn text-xs px-3 py-1 hover:text-fg hover:border-cyan-500/50"
            onClick={() => void loadMoreCommits()}
          >
            Load more commits ({commits.length} of {log.totalCommits})
          </button>
        ) : commits.length > 0 ? (
          <span className="text-faint text-[11px]">Loaded all {commits.length} commits</span>
        ) : null}
      </div>

      {menu && (
        <ContextMenu x={menu.x} y={menu.y} items={commitMenuItems(menu.commit)} onClose={() => setMenu(null)} />
      )}

      {refMenu && (
        <ContextMenu x={refMenu.x} y={refMenu.y} items={refMenuItems(refMenu.ref)} onClose={() => setRefMenu(null)} />
      )}
    </div>
  );
}

